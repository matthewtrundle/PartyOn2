/**
 * Image Optimization Script
 * Converts PNG images to WebP format with quality optimization
 * Run: node scripts/optimize-images.js
 */

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const IMAGE_QUALITY = 85; // 85% quality is usually indistinguishable from 100%
const SIZES = {
  thumbnail: 400,
  mobile: 768,
  desktop: 1920,
  hero: 2560
};

async function optimizeImages() {
  const publicDir = path.join(__dirname, '../public');
  const imagesDir = path.join(publicDir, 'images');
  
  console.log('🖼️  Starting image optimization...\n');
  
  async function processDirectory(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await processDirectory(fullPath);
      } else if (entry.name.match(/\.(png|jpg|jpeg)$/i)) {
        await optimizeImage(fullPath);
      }
    }
  }
  
  async function optimizeImage(imagePath) {
    const fileName = path.basename(imagePath, path.extname(imagePath));
    const dirName = path.dirname(imagePath);
    
    try {
      const metadata = await sharp(imagePath).metadata();
      const originalSize = (await fs.stat(imagePath)).size;
      
      console.log(`Processing: ${path.relative(publicDir, imagePath)}`);
      console.log(`  Original: ${(originalSize / 1024 / 1024).toFixed(2)}MB (${metadata.width}x${metadata.height})`);
      
      // Create WebP version at original size
      const webpPath = path.join(dirName, `${fileName}.webp`);
      await sharp(imagePath)
        .webp({ quality: IMAGE_QUALITY })
        .toFile(webpPath);
      
      const webpSize = (await fs.stat(webpPath)).size;
      const savings = ((originalSize - webpSize) / originalSize * 100).toFixed(1);
      
      console.log(`  WebP: ${(webpSize / 1024 / 1024).toFixed(2)}MB (${savings}% smaller)`);
      
      // Create responsive sizes for hero images
      if (imagePath.includes('hero')) {
        for (const [sizeName, width] of Object.entries(SIZES)) {
          if (width < metadata.width) {
            const responsivePath = path.join(dirName, `${fileName}-${sizeName}.webp`);
            await sharp(imagePath)
              .resize(width, null, { withoutEnlargement: true })
              .webp({ quality: IMAGE_QUALITY })
              .toFile(responsivePath);
            
            const responsiveSize = (await fs.stat(responsivePath)).size;
            console.log(`  ${sizeName}: ${(responsiveSize / 1024 / 1024).toFixed(2)}MB`);
          }
        }
      }
      
      console.log('');
    } catch (error) {
      console.error(`  ❌ Error processing ${imagePath}:`, error.message);
    }
  }
  
  await processDirectory(imagesDir);
  console.log('✅ Image optimization complete!');
  
  // Generate import map for easy usage
  await generateImageMap(imagesDir);
}

async function generateImageMap(imagesDir) {
  const imageMap = {};
  
  async function scanDirectory(dir, basePath = '') {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(basePath, entry.name);
      
      if (entry.isDirectory()) {
        await scanDirectory(fullPath, relativePath);
      } else if (entry.name.endsWith('.webp') && !entry.name.includes('-mobile') && !entry.name.includes('-desktop')) {
        const key = relativePath.replace(/\.(webp|png|jpg|jpeg)$/i, '').replace(/\\/g, '/');
        imageMap[key] = `/images/${relativePath.replace(/\\/g, '/')}`;
      }
    }
  }
  
  await scanDirectory(imagesDir);
  
  const outputPath = path.join(__dirname, '../src/lib/optimized-images.json');
  await fs.writeFile(outputPath, JSON.stringify(imageMap, null, 2));
  console.log(`📄 Image map generated at: ${outputPath}`);
}

// Check if sharp is installed
try {
  require('sharp');
  optimizeImages().catch(console.error);
} catch (error) {
  console.log('📦 Installing required dependencies...');
  require('child_process').execSync('npm install sharp', { stdio: 'inherit' });
  console.log('✅ Dependencies installed. Please run the script again.');
}