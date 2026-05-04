#!/usr/bin/env node
// Generate PWA raster icons from public/icon.svg.
//
// Modern Chrome/Safari/Firefox accept SVG manifest icons, but iOS
// Safari and older Android still want PNGs for "Add to Home Screen"
// previews and the native install splash. This script bakes a few
// well-known sizes; commit the output PNGs to public/ alongside the
// SVG so vite-plugin-pwa can ship them.
//
// Run after edits to public/icon.svg:
//   node scripts/generate-pwa-icons.mjs
//
// P4 #8.

import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, '../public/icon.svg');
const OUT_DIR = resolve(__dirname, '../public');

const TARGETS = [
  // PWA manifest icons (Android, Chrome desktop, Edge)
  { name: 'icon-192.png',           size: 192 },
  { name: 'icon-512.png',           size: 512 },
  // Maskable variant: same source, marked maskable in the manifest.
  // The SVG already has 19% padding via the rounded-square, so the
  // safe area is fine.
  { name: 'icon-512-maskable.png',  size: 512 },
  // iOS Safari "Add to Home Screen" — Apple pulls 180x180.
  { name: 'apple-touch-icon.png',   size: 180 },
];

const svgBuffer = readFileSync(SRC);

for (const { name, size } of TARGETS) {
  const out = resolve(OUT_DIR, name);
  await sharp(svgBuffer, { density: 384 })   // higher density → crisper rasterise
    .resize(size, size, { fit: 'contain', background: { r: 15, g: 26, b: 51, alpha: 1 } })
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log(`✓ ${name} (${size}×${size})`);
}

console.log('Done.');
