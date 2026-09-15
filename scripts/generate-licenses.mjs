// Schreibt Name, Version und Lizenz aller Produktionsabhängigkeiten nach src/legal/licenses.json.
// Aufruf: npm run licenses
//
// Ausgangspunkt sind die `dependencies` aus package.json. Von dort werden rekursiv `dependencies`,
// installierte `optionalDependencies` und installierte `peerDependencies` verfolgt – so, wie Node sie
// aus node_modules auflösen würde. devDependencies bleiben außen vor.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputFile = path.join(root, 'src', 'legal', 'licenses.json');

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));

/** Sucht ein Paket wie Node: erst im eigenen node_modules, dann in den übergeordneten Ordnern. */
function resolvePackageDir(name, fromDir) {
  let dir = fromDir;
  while (true) {
    const candidate = path.join(dir, 'node_modules', name);
    if (existsSync(path.join(candidate, 'package.json'))) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function licenseOf(pkg) {
  if (typeof pkg.license === 'string') return pkg.license;
  if (pkg.license && typeof pkg.license.type === 'string') return pkg.license.type;
  // Veraltetes Format: "licenses": [{ "type": "MIT" }]
  if (Array.isArray(pkg.licenses)) {
    const types = pkg.licenses.map((l) => (typeof l === 'string' ? l : l?.type)).filter(Boolean);
    if (types.length) return types.length === 1 ? types[0] : `(${types.join(' OR ')})`;
  }
  return 'UNKNOWN';
}

const rootPkg = readJson(path.join(root, 'package.json'));
const packages = new Map(); // "name@version" -> { name, version, license }
const visitedDirs = new Set();
const missing = [];

function visit(name, fromDir, optional) {
  const dir = resolvePackageDir(name, fromDir);
  if (!dir) {
    if (!optional) missing.push(name);
    return;
  }
  if (visitedDirs.has(dir)) return;
  visitedDirs.add(dir);

  const pkg = readJson(path.join(dir, 'package.json'));
  const key = `${pkg.name}@${pkg.version}`;
  if (!packages.has(key)) {
    packages.set(key, { name: pkg.name, version: pkg.version, license: licenseOf(pkg) });
  }

  for (const dep of Object.keys(pkg.dependencies ?? {})) visit(dep, dir, false);
  for (const dep of Object.keys(pkg.optionalDependencies ?? {})) visit(dep, dir, true);
  // Peers gehören dazu, wenn sie installiert sind; fehlende Peers sind kein Fehler.
  for (const dep of Object.keys(pkg.peerDependencies ?? {})) visit(dep, dir, true);
}

for (const dep of Object.keys(rootPkg.dependencies ?? {})) visit(dep, root, false);

const list = [...packages.values()].sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
writeFileSync(outputFile, `${JSON.stringify(list, null, 2)}\n`);

const unknown = list.filter((p) => p.license === 'UNKNOWN');
console.log(`${list.length} Pakete nach ${path.relative(root, outputFile)} geschrieben.`);
if (unknown.length) console.warn(`Ohne Lizenzangabe: ${unknown.map((p) => `${p.name}@${p.version}`).join(', ')}`);
if (missing.length) {
  console.error(`Nicht in node_modules gefunden: ${[...new Set(missing)].join(', ')}. Erst "npm install" ausführen.`);
  process.exit(1);
}
