/*
  Vercel/npm sometimes fails to install Rollup's native optional dependency on Linux
  (see https://github.com/npm/cli/issues/4828), causing `quasar prepare` to crash.

  This script runs before `quasar prepare` and ensures the correct native package
  is present on Linux. It is a no-op on non-Linux platforms.
*/

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function fileExists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function findAncestorDirContainingRollup(startDir) {
  let currentDir = startDir;
  // Walk up until filesystem root.
  while (true) {
    const rollupPkgJsonPath = path.join(currentDir, 'node_modules', 'rollup', 'package.json');
    if (fileExists(rollupPkgJsonPath)) return currentDir;

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) return null;
    currentDir = parentDir;
  }
}

function main() {
  if (process.platform !== 'linux') return;

  // Prevent recursion if this script triggers another npm install.
  if (process.env.KANBY_ROLLUP_NATIVE_FIXED === '1') return;

  // Only needed for x64 glibc environments (Vercel's default Linux runtime).
  if (process.arch !== 'x64') return;

  // With npm workspaces, dependencies like rollup are usually hoisted to the repo root.
  // This script runs from apps/web, so we search upward for the actual node_modules.
  const baseDir = findAncestorDirContainingRollup(process.cwd());
  if (!baseDir) return;

  const rollupPkgJsonPath = path.join(baseDir, 'node_modules', 'rollup', 'package.json');
  const rollupVersion = readJson(rollupPkgJsonPath)?.version;
  if (!rollupVersion) return;

  const nativePkgName = '@rollup/rollup-linux-x64-gnu';
  const nativePkgJsonPath = path.join(baseDir, 'node_modules', nativePkgName, 'package.json');

  if (fileExists(nativePkgJsonPath)) return;

  execSync(`npm install --no-save --ignore-scripts ${nativePkgName}@${rollupVersion}`, {
    stdio: 'inherit',
    cwd: baseDir,
    env: { ...process.env, KANBY_ROLLUP_NATIVE_FIXED: '1' },
  });
}

main();
