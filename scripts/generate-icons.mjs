// Erzeugt alle App-Icons aus assets/source/icon.svg und prüft das Ergebnis.
// Aufruf: npm run icons

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetsDir = path.join(root, 'assets');
const source = await readFile(path.join(assetsDir, 'source', 'icon.svg'), 'utf8');

const background = source.match(/<rect id="background"[^>]*fill="(#[0-9A-Fa-f]{6})"/)?.[1];
const motifMatch = source.match(/<g id="motif"([^>]*)>([\s\S]*?)<\/g>/);
if (!background || !motifMatch) {
  throw new Error('icon.svg braucht <rect id="background" fill="#RRGGBB"> und <g id="motif">…</g>.');
}
const motifShapes = motifMatch[2];

// Android: Das adaptive Icon ist 108 dp groß, sichtbar ist garantiert nur ein Kreis mit 66 dp Durchmesser.
const ADAPTIVE_SAFE_ZONE = 66 / 108;

/**
 * Baut ein SVG mit dem Motiv.
 * @param {object} o
 * @param {number} o.size Kantenlänge in Pixeln
 * @param {number} o.motifScale Anteil der Kantenlänge, den das 100er-Motivraster einnimmt
 * @param {string} o.color Farbe des Motivs
 * @param {string | null} o.fill Hintergrundfarbe oder null für transparent
 */
function composeSvg({ size, motifScale, color, fill }) {
  const scale = (size * motifScale) / 100;
  const offset = (size - size * motifScale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${fill ? `<rect width="${size}" height="${size}" fill="${fill}"/>` : ''}
  <g transform="translate(${offset} ${offset}) scale(${scale})" fill="${color}" stroke="${color}">${motifShapes}</g>
</svg>`;
}

const outputs = [
  // iOS/App Store: 1024 px, ohne Alphakanal. Das Motiv nutzt 56 % der Fläche, damit nach der Eckenmaske genug Rand bleibt.
  { file: 'icon.png', size: 1024, motifScale: 0.56, color: '#FFFFFF', fill: background, opaque: true },
  // Splash: Hintergrund #F5F6F8 kommt aus dem Plugin, daher grünes Motiv auf transparentem Grund.
  { file: 'splash-icon.png', size: 1024, motifScale: 0.9, color: background, fill: null, opaque: false },
  // Android adaptive Icon: Vordergrund transparent, Motiv (inkl. Diagonale) innerhalb der Safe Zone.
  { file: 'android-icon-foreground.png', size: 512, motifScale: 0.4, color: '#FFFFFF', fill: null, opaque: false, safeZone: true },
  { file: 'android-icon-background.png', size: 512, motifScale: 0, color: background, fill: background, opaque: true },
  // Android 13+ „Designfarben“-Icon: das System nutzt nur den Alphakanal.
  { file: 'android-icon-monochrome.png', size: 432, motifScale: 0.4, color: '#FFFFFF', fill: null, opaque: false, safeZone: true },
  { file: 'favicon.png', size: 48, motifScale: 0.66, color: '#FFFFFF', fill: background, opaque: true },
];

for (const out of outputs) {
  const svg = out.motifScale > 0 ? composeSvg(out) : `<svg xmlns="http://www.w3.org/2000/svg" width="${out.size}" height="${out.size}"><rect width="100%" height="100%" fill="${out.fill}"/></svg>`;
  let image = sharp(Buffer.from(svg)).resize(out.size, out.size);
  image = out.opaque ? image.flatten({ background: out.fill }).removeAlpha() : image.ensureAlpha();
  await image.png({ compressionLevel: 9 }).toFile(path.join(assetsDir, out.file));
}

// Prüfung
const rows = [];
let failed = false;

for (const out of outputs) {
  const file = path.join(assetsDir, out.file);
  const meta = await sharp(file).metadata();
  const problems = [];

  if (meta.width !== out.size || meta.height !== out.size) problems.push(`Größe ${meta.width}×${meta.height} statt ${out.size}×${out.size}`);
  if (out.opaque && meta.hasAlpha) problems.push('hat Alphakanal');
  if (!out.opaque && !meta.hasAlpha) problems.push('kein Alphakanal');

  let safeZone = '';
  if (out.safeZone) {
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const center = (info.width - 1) / 2;
    let maxDistance = 0;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        if (data[(y * info.width + x) * 4 + 3] > 0) {
          maxDistance = Math.max(maxDistance, Math.hypot(x - center, y - center));
        }
      }
    }
    const allowed = (info.width * ADAPTIVE_SAFE_ZONE) / 2;
    safeZone = `${Math.round(maxDistance)}/${Math.round(allowed)} px`;
    if (maxDistance > allowed) problems.push('Motiv ragt aus der Safe Zone');
  }

  if (problems.length) failed = true;
  rows.push({
    Datei: out.file,
    Größe: `${meta.width}×${meta.height}`,
    Farbraum: meta.space,
    Kanäle: meta.channels,
    Alpha: meta.hasAlpha ? 'ja' : 'nein',
    'Safe Zone (max/erlaubt)': safeZone || '–',
    Ergebnis: problems.length ? problems.join(', ') : 'OK',
  });
}

console.table(rows);
if (failed) {
  console.error('Mindestens ein Icon entspricht nicht den Vorgaben.');
  process.exit(1);
}
