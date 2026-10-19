#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(scriptDir);
const findings = [];

const dependencySections = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
  "bundleDependencies",
  "bundledDependencies",
];

function readText(path) {
  return readFileSync(path, "utf8");
}

function addFinding(path, message) {
  findings.push(`${relative(projectRoot, path)}: ${message}`);
}

function checkPackageManifest() {
  const manifestPath = join(projectRoot, "package.json");
  const manifest = JSON.parse(readText(manifestPath));

  for (const section of dependencySections) {
    const value = manifest[section];

    if (Array.isArray(value) && value.includes("axios")) {
      addFinding(manifestPath, `axios staat in ${section}`);
    }

    if (value && typeof value === "object" && !Array.isArray(value) && "axios" in value) {
      addFinding(manifestPath, `axios staat in ${section}`);
    }
  }
}

function checkLockfiles() {
  const lockfilePatterns = [
    /(^|\n)\s*axios:\s*(\n|$)/,
    /(^|\n)\s*axios@/,
    /(^|\n)\s*\/axios@/,
    /node_modules\/axios/,
  ];

  for (const filename of ["package-lock.json", "pnpm-lock.yaml", "yarn.lock"]) {
    const path = join(projectRoot, filename);
    if (!existsSync(path)) continue;

    const contents = readText(path);
    if (lockfilePatterns.some((pattern) => pattern.test(contents))) {
      addFinding(path, "axios staat in lockfile");
    }
  }
}

function walk(path) {
  for (const entry of readdirSync(path)) {
    if ([".git", "dist", "node_modules", "scripts"].includes(entry)) continue;

    const childPath = join(path, entry);
    const stats = statSync(childPath);

    if (stats.isDirectory()) {
      walk(childPath);
      continue;
    }

    if (![".cjs", ".js", ".jsx", ".mjs", ".ts", ".tsx"].includes(extname(childPath))) {
      continue;
    }

    const contents = readText(childPath);
    const importsAxios =
      /from\s+["']axios["']/.test(contents) ||
      /import\s*\(\s*["']axios["']\s*\)/.test(contents) ||
      /require\s*\(\s*["']axios["']\s*\)/.test(contents);

    if (importsAxios) {
      addFinding(childPath, "axios import/require gevonden");
    }
  }
}

checkPackageManifest();
checkLockfiles();
walk(projectRoot);

if (findings.length > 0) {
  console.error("Axios is verboden in deze app.");
  console.error("Gebruik native fetch of de bestaande src/api.ts helper.");
  console.error("");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log("OK: axios is niet aanwezig en blijft geblokkeerd.");
