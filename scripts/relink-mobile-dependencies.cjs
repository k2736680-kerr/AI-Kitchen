const fs = require('node:fs');
const path = require('node:path');

if (process.platform !== 'win32') {
  process.exit(0);
}

const repoRoot = path.resolve(__dirname, '..');
const rootNodeModules = path.join(repoRoot, 'node_modules');
const mobileRoot = path.join(repoRoot, 'apps', 'mobile');
const mobileNodeModules = path.join(mobileRoot, 'node_modules');
const virtualStoreRoot = `${path.join(rootNodeModules, '.pnpm')}${path.sep}`.toLowerCase();
const mobilePackage = JSON.parse(
  fs.readFileSync(path.join(mobileRoot, 'package.json'), 'utf8')
);
const packageNames = new Set([
  ...Object.keys(mobilePackage.dependencies ?? {}),
  '@react-native-masked-view/masked-view',
]);

let relinked = 0;

for (const packageName of packageNames) {
  const mobilePath = path.join(mobileNodeModules, packageName);
  const rootPath = path.join(rootNodeModules, packageName);
  const mobileManifest = path.join(mobilePath, 'package.json');
  const rootManifest = path.join(rootPath, 'package.json');

  if (!fs.existsSync(mobileManifest) || !fs.existsSync(rootManifest)) {
    continue;
  }

  const mobileStats = fs.lstatSync(mobilePath);
  const rootStats = fs.lstatSync(rootPath);
  if (!mobileStats.isSymbolicLink() || rootStats.isSymbolicLink()) {
    continue;
  }

  const currentTarget = fs.realpathSync.native(mobilePath).toLowerCase();
  if (!currentTarget.startsWith(virtualStoreRoot)) {
    continue;
  }

  const mobileVersion = JSON.parse(fs.readFileSync(mobileManifest, 'utf8')).version;
  const rootVersion = JSON.parse(fs.readFileSync(rootManifest, 'utf8')).version;
  if (!mobileVersion || mobileVersion !== rootVersion) {
    continue;
  }

  fs.unlinkSync(mobilePath);
  fs.symlinkSync(rootPath, mobilePath, 'junction');
  relinked += 1;
}

console.log(`Repointed ${relinked} mobile dependencies to the short hoisted path.`);
