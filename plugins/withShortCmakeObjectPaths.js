// Expo config plugin: keep native object paths under the Windows 260-char limit.
// Long-path support is disabled on this machine (LongPathsEnabled=0) and the
// codegen object directories of autolinked modules exceed MAX_PATH, so CMake is
// told to hash long object paths (CMAKE_OBJECT_PATH_MAX).
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// withShortCmakeObjectPaths';

module.exports = function withShortCmakeObjectPaths(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.contents.includes(MARKER)) return cfg;
    cfg.modResults.contents = cfg.modResults.contents.replace(
      /defaultConfig\s*\{/,
      `defaultConfig {
        ${MARKER}
        externalNativeBuild {
            cmake {
                arguments "-DCMAKE_OBJECT_PATH_MAX=259"
            }
        }`,
    );
    return cfg;
  });
};
