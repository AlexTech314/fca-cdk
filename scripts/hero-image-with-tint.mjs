#!/usr/bin/env node
/**
 * Downloads the nextjs hero image and bakes in the hero-gradient tint,
 * then saves to a file. Uses the exact gradient from globals.css:
 *   rgba(15, 39, 68, 0.85) 0%
 *   rgba(30, 58, 95, 0.65) 40%
 *   rgba(15, 39, 68, 0.75) 100%
 */

import sharp from 'sharp';
import { writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, './hero-with-tint.jpg');

const HERO_IMAGE_URL =
  'https://d1bjh7dvpwoxii.cloudfront.net/hero/ws_White_Winter_Scenery_1366x768.jpg';

async function main() {
  console.log('Downloading hero image...');
  const res = await fetch(HERO_IMAGE_URL);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  const imageBuffer = Buffer.from(await res.arrayBuffer());

  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  const { width = 1366, height = 768 } = metadata;

  console.log(`Image size: ${width}x${height}`);

  // SVG gradient matching .hero-gradient from globals.css
  const svgOverlay = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:rgb(15,39,68);stop-opacity:0.85" />
      <stop offset="40%" style="stop-color:rgb(30,58,95);stop-opacity:0.65" />
      <stop offset="100%" style="stop-color:rgb(15,39,68);stop-opacity:0.75" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#grad)" />
</svg>
`.trim();

  const overlayBuffer = Buffer.from(svgOverlay);

  console.log('Applying hero gradient tint...');
  const result = await image
    .composite([{ input: overlayBuffer, blend: 'over' }])
    .jpeg({ quality: 90 })
    .toBuffer();

  await writeFile(OUTPUT_PATH, result);
  console.log(`Saved to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
