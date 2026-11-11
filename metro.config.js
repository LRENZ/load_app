// Metro config: Expo defaults plus inline requires.
//
// Expo ships `inlineRequires: false`. With it on, a module's imports are evaluated on first use
// instead of at bundle start, so screens and libraries that the first screen does not need (other
// calculators, tools, decimal.js paths, Firebase helpers) no longer run before the first frame.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const base = config.transformer.getTransformOptions;
config.transformer.getTransformOptions = async (...args) => {
  const opts = await base(...args);
  return { ...opts, transform: { ...opts.transform, inlineRequires: true } };
};

module.exports = config;
