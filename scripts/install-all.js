#!/usr/bin/env node
/**
 * Install dependencies in root and all packages under src/.
 * Discovers package.json files automatically so new packages are never missed.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'src');

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

// Dependency order: packages/db and packages/seed first (others depend on them)
function sortByDeps(dirs) {
  const first = ['src/packages/db', 'src/packages/seed'];
  const rest = dirs.filter((d) => !first.includes(d));
  return [...first.filter((d) => dirs.includes(d)), ...rest.sort()];
}

const dirs = sortByDeps([...new Set(findPackageDirs(srcDir))]);
console.log('Installing in:', ['(root)', ...dirs].join(', '));

execSync('npm install', { cwd: root, stdio: 'inherit' });
for (const dir of dirs) {
  execSync(`npm install --prefix ${dir}`, { cwd: root, stdio: 'inherit' });
}
