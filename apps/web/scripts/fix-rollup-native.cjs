/*
  Vercel/npm sometimes fails to install native optional dependencies on Linux
  (see https://github.com/npm/cli/issues/4828).

  In this repo, that can break:
  - Rollup (missing @rollup/rollup-linux-x64-gnu)
  - sass-embedded (missing sass-embedded-linux-x64), which then causes the
    "sass --embedded is unavailable in pure JS mode" crash during Quasar/Vite.

  This script runs before `quasar prepare` and ensures the needed native packages
  are present on Linux. It is a no-op on non-Linux platforms.
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

function findAncestorDirContainingPackage(startDir, packagePathParts) {
  let currentDir = startDir;
  // Walk up until filesystem root.
  while (true) {
    const pkgJsonPath = path.join(currentDir, 'node_modules', ...packagePathParts, 'package.json');
    if (fileExists(pkgJsonPath)) return currentDir;

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) return null;
    currentDir = parentDir;
  }
}

function ensureInstalled({ baseDir, hostPkgName, nativePkgName, envFlag }) {
  const hostPkgJsonPath = path.join(baseDir, 'node_modules', ...hostPkgName.split('/'), 'package.json');
  if (!fileExists(hostPkgJsonPath)) return;

  const hostVersion = readJson(hostPkgJsonPath)?.version;
  if (!hostVersion) return;

  const nativePkgJsonPath = path.join(baseDir, 'node_modules', ...nativePkgName.split('/'), 'package.json');
  if (fileExists(nativePkgJsonPath)) return;

  execSync(`npm install --no-save --ignore-scripts ${nativePkgName}@${hostVersion}`, {
    stdio: 'inherit',
    cwd: baseDir,
    env: { ...process.env, [envFlag]: '1' },
  });
}

function main() {
  if (process.platform !== 'linux') return;

  // Prevent recursion if this script triggers another npm install.
  if (process.env.KANBY_NATIVE_DEPS_FIXED === '1') return;

  // Only needed for x64 glibc environments (Vercel's default Linux runtime).
  if (process.arch !== 'x64') return;

  // With npm workspaces, dependencies like rollup/sass-embedded are usually hoisted
  // to the repo root. This script runs from apps/web, so we search upward.
  const rollupBaseDir = findAncestorDirContainingPackage(process.cwd(), ['rollup']);
  if (rollupBaseDir) {
    ensureInstalled({
      baseDir: rollupBaseDir,
      hostPkgName: 'rollup',
      nativePkgName: '@rollup/rollup-linux-x64-gnu',
      envFlag: 'KANBY_NATIVE_DEPS_FIXED',
    });
  }

  const sassEmbeddedBaseDir = findAncestorDirContainingPackage(process.cwd(), ['sass-embedded']);
  if (sassEmbeddedBaseDir) {
    ensureInstalled({
      baseDir: sassEmbeddedBaseDir,
      hostPkgName: 'sass-embedded',
      nativePkgName: 'sass-embedded-linux-x64',
      envFlag: 'KANBY_NATIVE_DEPS_FIXED',
    });
  }
}

main();
