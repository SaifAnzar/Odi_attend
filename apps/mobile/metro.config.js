const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the project root and the monorepo root
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files in the monorepo (so Metro can resolve symlinks like packages/shared)
config.watchFolders = [workspaceRoot];

// 2. Let Metro resolve modules from the local workspace and the monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Force Metro to resolve react and react-native to the single hoisted copy in the root node_modules
config.resolver.extraNodeModules = {
  'react': path.resolve(workspaceRoot, 'node_modules/react'),
  'react-native': path.resolve(workspaceRoot, 'node_modules/react-native'),
};

module.exports = config;
