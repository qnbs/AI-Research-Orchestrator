import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const svgPath = join(root, 'public', 'icons', 'app-icon.svg');
const outDir = join(root, 'public', 'icons');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
const svg = readFileSync(svgPath);
await sharp(svg).resize(192, 192).png().toFile(join(outDir, 'icon-192.png'));
await sharp(svg).resize(512, 512).png().toFile(join(outDir, 'icon-512.png'));
console.log('Wrote icon-192.png and icon-512.png');
