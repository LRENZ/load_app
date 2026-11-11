// Expo config plugin: sign release builds (APK and AAB) with the owner's upload key.
//
// The key lives outside git in credentials/ (see .gitignore):
//   credentials/keystore.properties  storeFile=<file in credentials/>, storePassword, keyAlias, keyPassword
//   credentials/<upload keystore>.p12
// Without that file (another machine, CI) release builds fall back to the debug key and Gradle
// prints a warning, so a debug-signed build can never be mistaken for a Play upload.
const { withAppBuildGradle } = require('expo/config-plugins');

const BEGIN = '// @generated begin repayly-release-signing';
const END = '// @generated end repayly-release-signing';
const PROPS = "rootProject.file('../credentials/keystore.properties')";

function applyReleaseSigning(contents) {
  if (contents.includes(BEGIN)) return contents;
  const sc = '    signingConfigs {\n        debug {';
  if (!contents.includes(sc)) throw new Error('withReleaseSigning: signingConfigs block not found');
  contents = contents.replace(
    sc,
    `    signingConfigs {
        ${BEGIN}
        release {
            def ksFile = ${PROPS}
            if (ksFile.exists()) {
                def ks = new Properties()
                ksFile.withInputStream { ks.load(it) }
                storeFile rootProject.file('../credentials/' + ks['storeFile'])
                storePassword ks['storePassword']
                keyAlias ks['keyAlias']
                keyPassword ks['keyPassword']
            }
        }
        ${END}
        debug {`,
  );
  const rel = /(        release \{\n(?:            \/\/[^\n]*\n)*)            signingConfig signingConfigs\.debug/;
  if (!rel.test(contents)) throw new Error('withReleaseSigning: release signingConfig not found');
  contents = contents.replace(
    rel,
    `$1            // ${BEGIN.slice(3)}
            if (${PROPS}.exists()) {
                signingConfig signingConfigs.release
            } else {
                logger.warn('Repayly: credentials/keystore.properties not found, release build is DEBUG-signed (not for Google Play)')
                signingConfig signingConfigs.debug
            }
            // ${END.slice(3)}`,
  );
  return contents;
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = applyReleaseSigning(cfg.modResults.contents);
    return cfg;
  });
};
module.exports.applyReleaseSigning = applyReleaseSigning;
