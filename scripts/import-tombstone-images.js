#!/usr/bin/env node
/**
 * One-time script: copy tombstone images from "Tombstone - web" folder into
 * nextjs-web/public/tombstones with normalized filenames and output mapping for seed.
 *
 * Usage: node scripts/import-tombstone-images.js "/Users/alexstepansky/Downloads/Tombstone - web"
 */

const fs = require('fs');
const path = require('path');

const sourceDir = process.argv[2] || path.join(process.cwd(), 'Tombstone - web');
const repoRoot = path.resolve(__dirname, '..');
const destDir = path.join(repoRoot, 'src/nextjs-web/public/tombstones');

if (!fs.existsSync(sourceDir)) {
  console.error('Source directory not found:', sourceDir);
  process.exit(1);
}

if (!fs.existsSync(path.join(repoRoot, 'src/nextjs-web/public'))) {
  console.error('nextjs-web/public not found. Run from repo root.');
  process.exit(1);
}

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

function slugify(name) {
  return name
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[&,.]/g, '')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const mapping = {};
const files = fs.readdirSync(sourceDir).filter((f) => f.toLowerCase().endsWith('.jpg') || f.toLowerCase().endsWith('.jpeg'));

for (const file of files) {
  const base = file.replace(/\.(jpe?g)$/i, '');
  const companyName = base.replace(/^\d{4}(-\d{1,2}){0,2}\s+/, '').trim();
  const slug = slugify(companyName) || base.replace(/\s+/g, '-');
  const destName = slug + '.jpg';
  const srcPath = path.join(sourceDir, file);
  const destPath = path.join(destDir, destName);
  fs.copyFileSync(srcPath, destPath);
  const urlPath = '/tombstones/' + destName;
  mapping[companyName] = urlPath;
  console.log(file, '->', destName, '(', companyName, ')');
}

const mappingPath = path.join(repoRoot, 'src/api/prisma/tombstone-images.json');
fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2), 'utf-8');
console.log('\nWrote', Object.keys(mapping).length, 'entries to', mappingPath);
