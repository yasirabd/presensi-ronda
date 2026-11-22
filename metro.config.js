const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Keep the on-device bundle independent of the Python verifier and legacy web builds.
config.resolver.blockList = [
  ...[].concat(config.resolver.blockList || []),
  /[/\\]face[/\\](?:\.venv|models)[/\\].*/,
  /[/\\]\.next[/\\].*/,
];

module.exports = config;
