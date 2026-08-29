const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

config.projectRoot = projectRoot;
config.watchFolders = [projectRoot];

config.watcher = {
  ...config.watcher,
  additionalExts: ['cjs', 'mjs'],
  healthCheck: { enabled: false },
};

module.exports = config;
