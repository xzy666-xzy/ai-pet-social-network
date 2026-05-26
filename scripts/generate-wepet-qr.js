const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const QR_CONTENT = 'https://wepet.asia/login';
const OUTPUT_PATH = path.resolve(__dirname, '../public/wepet-live-demo-qr.png');

async function generate() {
  const outputDir = path.dirname(OUTPUT_PATH);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  await QRCode.toFile(OUTPUT_PATH, QR_CONTENT, {
    type: 'png',
    width: 2400,
    margin: 8,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'H',
  });

  console.log(`QR code generated: ${OUTPUT_PATH}`);
}

generate().catch((error) => {
  console.error('Failed to generate QR code:', error);
  process.exit(1);
});

