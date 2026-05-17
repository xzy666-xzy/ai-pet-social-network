/**
 * Generate icon.png and favicon.ico from wepet-logo-source.png
 *
 * Requirements:
 * 1. Auto-crop transparent margins
 * 2. Logo occupies 85-90% of canvas
 * 3. favicon.ico includes 16/32/48/64 sizes
 * 4. Does NOT modify tsx/js/layout files
 */

import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.resolve(__dirname, '..', 'app');
const SOURCE = path.join(APP_DIR, 'wepet-logo-source.png');
const ICON_PNG = path.join(APP_DIR, 'icon.png');
const FAVICON_ICO = path.join(APP_DIR, 'favicon.ico');

// Target canvas sizes
const ICON_SIZE = 512;        // icon.png (PWA standard)
const FAVICON_SIZES = [16, 32, 48, 64];

// Logo should fill 87.5% of canvas (middle of 85-90%)
const LOGO_FILL_RATIO = 0.875;

async function main() {
  console.log('🔍 Loading source image...');
  const metadata = await sharp(SOURCE).metadata();
  console.log(`   Source: ${metadata.width}x${metadata.height}, ${metadata.format}`);

  // Step 1: Auto-trim transparent margins
  console.log('✂️  Auto-cropping transparent margins...');
  const trimmedBuffer = await sharp(SOURCE)
    .trim({ threshold: 0 }) // threshold=0 means only exact transparent pixels
    .png()
    .toBuffer();

  const trimmedMeta = await sharp(trimmedBuffer).metadata();
  console.log(`   Trimmed: ${trimmedMeta.width}x${trimmedMeta.height}`);

  // Step 2: Calculate scale so logo fills 87.5% of the target canvas
  // We want the larger dimension (width or height) of the trimmed logo
  // to occupy LOGO_FILL_RATIO of the target canvas size
  const logoMaxDim = Math.max(trimmedMeta.width, trimmedMeta.height);

  // For icon.png (512x512 square canvas)
  const iconScale = (ICON_SIZE * LOGO_FILL_RATIO) / logoMaxDim;
  const iconLogoW = Math.round(trimmedMeta.width * iconScale);
  const iconLogoH = Math.round(trimmedMeta.height * iconScale);

  console.log(`📐 icon.png: scaling logo by ${(iconScale * 100).toFixed(1)}% → ${iconLogoW}x${iconLogoH} on ${ICON_SIZE}x${ICON_SIZE} canvas`);

  // Generate icon.png
  console.log('🖼️  Generating icon.png (512x512)...');

  // Resize trimmed logo to calculated dimensions
  const resizedLogo = await sharp(trimmedBuffer)
    .resize(iconLogoW, iconLogoH, { fit: 'fill' })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: ICON_SIZE,
      height: ICON_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: resizedLogo,
        top: Math.round((ICON_SIZE - iconLogoH) / 2),
        left: Math.round((ICON_SIZE - iconLogoW) / 2),
      },
    ])
    .png()
    .toFile(ICON_PNG);

  const iconResult = await sharp(ICON_PNG).metadata();
  console.log(`   ✅ icon.png: ${iconResult.width}x${iconResult.height}, ${iconResult.size} bytes`);

  // Step 3: Generate favicon.ico with multiple sizes
  console.log('🖼️  Generating favicon.ico (16/32/48/64)...');

  // For favicon, use a smaller base canvas (64x64 is the largest size)
  const FAVICON_BASE = 64;
  const faviconScale = (FAVICON_BASE * LOGO_FILL_RATIO) / logoMaxDim;

  // Generate PNG buffers for each ICO size
  const pngBuffers = [];
  for (const size of FAVICON_SIZES) {
    const scale = (size * LOGO_FILL_RATIO) / logoMaxDim;
    const logoW = Math.round(trimmedMeta.width * scale);
    const logoH = Math.round(trimmedMeta.height * scale);

    // Resize trimmed logo to calculated dimensions for this size
    const resizedLogo = await sharp(trimmedBuffer)
      .resize(logoW, logoH, { fit: 'fill' })
      .png()
      .toBuffer();

    const buf = await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: resizedLogo,
          top: Math.round((size - logoH) / 2),
          left: Math.round((size - logoW) / 2),
        },
      ])
      .png()
      .toBuffer();

    pngBuffers.push(buf);
    console.log(`   ${size}x${size} PNG: ${buf.length} bytes`);
  }

  // Pack PNGs into ICO using png-to-ico
  console.log('📦 Packing into favicon.ico...');
  const { default: pngToIco } = await import('png-to-ico');

  const icoBuffer = await pngToIco(pngBuffers);
  fs.writeFileSync(FAVICON_ICO, icoBuffer);

  const icoStat = fs.statSync(FAVICON_ICO);
  console.log(`   ✅ favicon.ico: ${icoStat.size} bytes`);

  console.log('\n🎉 Done! Both icon files regenerated successfully.');
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
