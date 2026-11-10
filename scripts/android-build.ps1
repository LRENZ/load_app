<#
  Builds the Android APK from the command line (no Android Studio IDE needed).

  .\scripts\android-build.ps1                 # standalone APK, JS bundle embedded (release variant, debug-signed)
  .\scripts\android-build.ps1 -Variant debug  # development APK (loads JS from Metro)
  .\scripts\android-build.ps1 -Mode mock      # standalone APK with the debug mock-ads mode

  Output: android\app\build\outputs\apk\<variant>\app-<variant>.apk
#>
param(
  [ValidateSet('release', 'debug')] [string]$Variant = 'release',
  [ValidateSet('functional', 'mock')] [string]$Mode = 'functional',
  [string]$Abis = 'x86_64,arm64-v8a',
  # Route Maven downloads through scripts/maven-mirror.mjs (curl-backed local cache) when Java TLS via the proxy is unreliable.
  [switch]$UseMirror
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

# JDK 17 (Temurin) and Android SDK
if (-not $env:JAVA_HOME -or -not (Test-Path "$env:JAVA_HOME\bin\java.exe")) {
  $jdk = Get-ChildItem "$env:USERPROFILE\.jdks" -Directory -Filter 'jdk-17*' -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $jdk) { throw 'JDK 17 not found. Install Temurin 17 or set JAVA_HOME.' }
  $env:JAVA_HOME = $jdk.FullName
}
if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk" }
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"

# Gradle ignores HTTP(S)_PROXY; pass the machine proxy (if any) as JVM properties.
$gradleOpts = @()
if ($env:HTTPS_PROXY) {
  $u = [Uri]$env:HTTPS_PROXY
  # (no nonProxyHosts: a '|' breaks gradlew.bat, and Java already bypasses localhost by default)
  $gradleOpts += "-Dhttp.proxyHost=$($u.Host)", "-Dhttp.proxyPort=$($u.Port)", "-Dhttps.proxyHost=$($u.Host)", "-Dhttps.proxyPort=$($u.Port)"
}
# TLS 1.2 + retries: the local proxy drops TLS 1.3 handshakes to Maven Central under load.
$gradleOpts += '-Dhttps.protocols=TLSv1.2', '-Djdk.tls.client.protocols=TLSv1.2', '-Dorg.gradle.internal.repository.max.retries=10', '-Dorg.gradle.internal.repository.initial.backoff=1500', '-Dorg.gradle.internal.http.connectionTimeout=60000', '-Dorg.gradle.internal.http.socketTimeout=900000'
# GRADLE_OPTS only reaches the launcher JVM; downloads happen in the daemon, so pass them as daemon JVM args too.
$env:GRADLE_OPTS = ($gradleOpts -join ' ')
$daemonJvm = "-Dorg.gradle.jvmargs=-Xmx3072m -XX:MaxMetaspaceSize=768m $($gradleOpts -join ' ')"

# EXPO_PUBLIC_* values are inlined into the JS bundle at build time.
$env:EXPO_PUBLIC_APP_MODE = $Mode
$env:NODE_ENV = if ($Variant -eq 'release') { 'production' } else { 'development' }

Push-Location "$root\android"
try {
  # EXPO_PUBLIC_APP_MODE is not a Gradle task input, so a cached JS bundle would be reused
  # across modes: always re-bundle.
  foreach ($p in 'app\build\generated\assets\react', 'app\build\generated\sourcemaps\react', 'app\build\intermediates\sourcemaps\react', 'app\build\intermediates\assets') {
    if (Test-Path $p) { Remove-Item -Recurse -Force $p }
  }
  $task = if ($Variant -eq 'release') { 'assembleRelease' } else { 'assembleDebug' }
  # Windows PowerShell 5.1 turns native stderr into errors; Gradle warns on stderr, so don't stop on it.
  $ErrorActionPreference = 'Continue'
  $extra = @()
  if ($UseMirror) {
    $up = $false
    try { $up = (Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8899/central/' -TimeoutSec 3 -ErrorAction Stop) -ne $null } catch { $up = $_.Exception.Response -ne $null }
    if (-not $up) {
      Start-Process -FilePath node -ArgumentList "`"$root\scripts\maven-mirror.mjs`"" -WindowStyle Hidden
      Start-Sleep -Seconds 2
    }
    $extra += '--init-script', "$root\scripts\mirror.init.gradle"
  }
  & .\gradlew.bat $task "-PreactNativeArchitectures=$Abis" $daemonJvm @extra --console=plain 2>&1 | ForEach-Object { "$_" }
  $code = $LASTEXITCODE
  $ErrorActionPreference = 'Stop'
  if ($code -ne 0) { throw "Gradle failed ($code)" }
} finally {
  Pop-Location
}
$apk = "$root\android\app\build\outputs\apk\$Variant\app-$Variant.apk"
Get-Item $apk | Select-Object FullName, Length, LastWriteTime
(Get-FileHash $apk -Algorithm SHA256).Hash
