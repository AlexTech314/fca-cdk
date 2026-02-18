#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "..", "keywords.config.json");
const config = JSON.parse(
  fs.readFileSync(configPath, "utf8")
);

const keywords = config.keywords || [];
const ignoreCase = config.ignoreCase !== false;
const extensions = new Set(
  (config.extensions || [".ts", ".tsx", ".js", ".jsx"]).map((e) =>
    e.startsWith(".") ? e : "." + e
  )
);
const dirs = config.dirs || ["src", "lib", "bin"];
const ignoreDirs = new Set(config.ignore || ["node_modules", "dist", "build", ".next", "cdk.out", ".cdk.staging", "coverage", "report"]);

const rootDir = path.join(__dirname, "..");

function shouldIgnoreDir(dirName) {
  return ignoreDirs.has(dirName);
}

function getExt(filePath) {
  const ext = path.extname(filePath);
  return ext ? ext.toLowerCase() : "";
}

function walkDir(dir, filePaths) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!shouldIgnoreDir(entry.name)) walkDir(fullPath, filePaths);
    } else if (entry.isFile() && extensions.has(getExt(entry.name))) {
      filePaths.push(fullPath);
    }
  }
}

function collectFiles() {
  const filePaths = [];
  for (const d of dirs) {
    const fullPath = path.join(rootDir, d);
    walkDir(fullPath, filePaths);
  }
  return filePaths;
}

function findInFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  const relPath = path.relative(rootDir, filePath);
  const results = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineToSearch = ignoreCase ? line.toLowerCase() : line;

    for (const kw of keywords) {
      const search = ignoreCase ? kw.toLowerCase() : kw;
      if (lineToSearch.includes(search)) {
        results.push({
          file: relPath,
          lineNum: i + 1,
          line: line.trim(),
          keyword: kw,
        });
      }
    }
  }
  return results;
}

const files = collectFiles();
const allResults = [];

for (const filePath of files) {
  const results = findInFile(filePath);
  allResults.push(...results);
}

for (const r of allResults) {
  console.log(`${r.file}:${r.lineNum}: ${r.line}`);
}

if (allResults.length === 0) {
  console.log("No keyword matches found.");
} else {
  process.exitCode = 0;
}
