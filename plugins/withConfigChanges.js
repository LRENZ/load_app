// Expo config plugin: let MainActivity handle display-size, font-size, bold-text and SIM / input changes
// itself instead of being destroyed and recreated.
//
// Why: after a recreation the React tree remounts and expo-router 58's imperative `router` throws
// "The imperative router is unavailable before the first render has finished" on the NEXT navigation,
// which crashes the app (found on the emulator 2026-11-10: `wm density 480` → `wm density reset` →
// any router.push → FATAL EXCEPTION). React Native updates its window metrics and font scale from
// onConfigurationChanged, so handling these changes in place is safe.
const { withAndroidManifest } = require('expo/config-plugins');

const EXTRA = ['density', 'fontScale', 'fontWeightAdjustment', 'mcc', 'mnc', 'navigation', 'touchscreen', 'colorMode'];

module.exports = function withConfigChanges(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    const main = app?.activity?.find((a) => a.$['android:name'] === '.MainActivity');
    if (!main) throw new Error('withConfigChanges: MainActivity not found');
    const have = new Set((main.$['android:configChanges'] || '').split('|').filter(Boolean));
    for (const c of EXTRA) have.add(c);
    main.$['android:configChanges'] = [...have].join('|');
    return cfg;
  });
};
