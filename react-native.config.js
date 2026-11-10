// react-native-gesture-handler arrives transitively (expo-router → drawer layout) but the
// app does not use it. Its C++ codegen compiles sources from outside its android folder,
// which produces object paths over the Windows 260-character limit, so it is not
// autolinked on Android.
module.exports = {
  dependencies: {
    'react-native-gesture-handler': {
      platforms: { android: null, ios: null },
    },
  },
};
