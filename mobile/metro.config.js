const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

// 부모 디렉토리(memento1 루트)에 package.json이 있어서 expo가 자동으로
// monorepo로 인식하고 entry를 ./mobile/...로 prefix 함. 이중 mobile/mobile/
// 경로 발생. projectRoot/watchFolders/nodeModulesPaths를 mobile/로 명시 강제.
const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

config.projectRoot = projectRoot;
config.watchFolders = [projectRoot];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
