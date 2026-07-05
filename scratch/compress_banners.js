const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const imagesDir = path.join(__dirname, '..', 'public', 'images');

const files = [
  'banner-1.png',
  'banner-2.png',
  'banner-3.png'
];

async function compress() {
  for (const file of files) {
    const inputPath = path.join(imagesDir, file);
    const baseName = path.basename(file, path.extname(file));
    const outputPath = path.join(imagesDir, `${baseName}.webp`);

    console.log(`Compressing ${file}...`);
    const info = await sharp(inputPath)
      .webp({ quality: 80, effort: 6 }) // high effort = best compression
      .toFile(outputPath);

    console.log(`Saved ${baseName}.webp: ${info.size} bytes (original: ${fs.statSync(inputPath).size} bytes)`);
  }
}

compress().catch(console.error);
