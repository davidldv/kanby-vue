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

function main() {
  if (process.platform !== 'linux') return;

  // Prevent recursion if this script triggers another npm install.
  if (process.env.KANBY_ROLLUP_NATIVE_FIXED === '1') return;

  // Only needed for x64 glibc environments (Vercel's default Linux runtime).
  if (process.arch !== 'x64') return;

  const rollupPkgJsonPath = path.join(process.cwd(), 'node_modules', 'rollup', 'package.json');
  if (!fileExists(rollupPkgJsonPath)) return;

  const rollupVersion = readJson(rollupPkgJsonPath).version;
  if (!rollupVersion) return;

  const nativePkgName = '@rollup/rollup-linux-x64-gnu';
  const nativePkgJsonPath = path.join(process.cwd(), 'node_modules', nativePkgName, 'package.json');

  if (fileExists(nativePkgJsonPath)) return;

  execSync(`npm install --no-save --ignore-scripts ${nativePkgName}@${rollupVersion}`, {
    stdio: 'inherit',
    env: { ...process.env, KANBY_ROLLUP_NATIVE_FIXED: '1' },
  });
}

main();
