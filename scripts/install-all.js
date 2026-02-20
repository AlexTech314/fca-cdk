#!/usr/bin/env node
/**
 * Install dependencies in root and all packages under src/.
 * Discovers package.json files automatically so new packages are never missed.
 * Includes all packages that build into Docker images (lambdas, pipeline tasks, api).
 *
 * Usage:
 *   node scripts/install-all.js        # Full install (root + all packages)
 *   node scripts/install-all.js --skip-root   # Skip root (e.g. when run from postinstall)
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'src');
const skipRoot = process.argv.includes('--skip-root');

function findPackageDirs(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.name === 'node_modules' || e.name === '.next' || e.name === 'cdk.out') continue;
    if (e.isDirectory()) {
      if (fs.existsSync(path.join(full, 'package.json'))) {
        results.push(path.relative(root, full));
      }
      findPackageDirs(full, results);
    }
  }
  return results;
}

// Dependency order: db and seed first, then packages that depend on them (api, lambdas, pipeline tasks)
function sortByDeps(dirs) {
  const first = ['src/packages/db', 'src/packages/seed'];
  const rest = dirs.filter((d) => !first.includes(d));
  return [...first.filter((d) => dirs.includes(d)), ...rest.sort()];
}

function hasFileDeps(dir) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, dir, 'package.json'), 'utf8'));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  return Object.values(allDeps).some((v) => typeof v === 'string' && v.startsWith('file:'));
}

const dirs = sortByDeps([...new Set(findPackageDirs(srcDir))]);
console.log('Installing in:', [skipRoot ? '(root skipped)' : '(root)', ...dirs].join(', '));

if (!skipRoot) {
  execSync('npm install', { cwd: root, stdio: 'inherit' });
}
for (const dir of dirs) {
  const flags = hasFileDeps(dir) ? '--install-links --ignore-scripts' : '';
  execSync(`npm install ${flags} --prefix ${dir}`.trim(), { cwd: root, stdio: 'inherit' });
}
