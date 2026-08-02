#!/usr/bin/env node
/**
 * Generate PWA / favicon raster assets from public/icons/app-icon.svg.
 * Run via `pnpm run icons` after changing the master SVG.
 */
import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync, copyFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const svgPath = join(root, 'public', 'icons', 'app-icon.svg');
const outDir = join(root, 'public', 'icons');

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const svg = readFileSync(svgPath);

const outputs = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-32.png', size: 32 },
  { name: 'favicon-16.png', size: 16 },
  { name: 'maskable-512.png', size: 512, padding: 0.12 },
];

for (const { name, size, padding = 0 } of outputs) {
  let pipeline = sharp(svg);
  if (padding > 0) {
    const inner = Math.round(size * (1 - padding * 2));
    const inset = Math.round(size * padding);
    const innerPng = await sharp(svg).resize(inner, inner).png().toBuffer();
    pipeline = sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 7, g: 11, b: 18, alpha: 1 },
      },
    }).composite([{ input: innerPng, left: inset, top: inset }]);
  } else {
    pipeline = pipeline.resize(size, size);
  }
  await pipeline.png().toFile(join(outDir, name));
}

// Favicon.ico (multi-size) — 16 + 32 layered ICO via sharp isn't native; ship PNG + SVG instead.
copyFileSync(svgPath, join(outDir, 'favicon.svg'));

console.log(`Wrote ${outputs.map((o) => o.name).join(', ')}, favicon.svg`);
