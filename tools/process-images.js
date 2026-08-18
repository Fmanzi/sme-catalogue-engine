/* Generate responsive WebP/AVIF variants and a storage-agnostic image manifest from originals. */
'use strict';
const fs = require('fs');
const path = require('path');
let sharp;
try { sharp = require('sharp'); } catch (_) { throw new Error('sharp is required. Run npm install before processing images.'); }
const root = path.join(__dirname, '..');
const client = process.argv[2] || 'meridian';
const originals = path.join(root, 'clients', client, 'media', 'originals');
const outputRoot = path.join(root, 'assets', 'media', client, 'products');
const sizes = [{ name: 'thumb', width: 400 }, { name: 'medium', width: 800 }, { name: 'large', width: 1400 }];
const allowed = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
async function run() {
  if (!fs.existsSync(originals)) throw new Error(`Originals directory does not exist: ${originals}`);
  const files = fs.readdirSync(originals).filter(file => allowed.has(path.extname(file).toLowerCase()));
  const images = [];
  for (const file of files) {
    const input = path.join(originals, file); const id = path.basename(file, path.extname(file)); const destination = path.join(outputRoot, id);
    fs.mkdirSync(destination, { recursive: true });
    const meta = await sharp(input).rotate().metadata(); const variants = [];
    for (const size of sizes) {
      for (const format of ['webp', 'avif']) {
        const filename = `${id}-${size.name}.${format}`;
        await sharp(input).rotate().resize({ width: size.width, withoutEnlargement: true }).toFormat(format, { quality: format === 'avif' ? 50 : 78 }).toFile(path.join(destination, filename));
        variants.push({ width: Math.min(meta.width || size.width, size.width), format, src: `assets/media/${client}/products/${id}/${filename}` });
      }
    }
    images.push({ id, source: `clients/${client}/media/originals/${file}`, width: meta.width, height: meta.height, alt: '', variants });
  }
  const manifestPath = path.join(root, 'clients', client, 'image-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify({ generatedAt: new Date().toISOString(), storage: { type: 'static', baseUrl: '' }, images }, null, 2) + '\n');
  const cataloguePath = path.join(root, 'clients', client, 'catalogue.json');
  if (fs.existsSync(cataloguePath)) {
    const catalogue = JSON.parse(fs.readFileSync(cataloguePath, 'utf8'));
    const byId = new Map(images.map(image => [image.id, image]));
    catalogue.products.forEach(product => (product.images || []).forEach(image => {
      const processed = byId.get(image.id);
      if (!processed) return;
      image.variants = processed.variants;
      const medium = processed.variants.find(variant => variant.width === 800 && variant.format === 'webp');
      if (medium) image.src = medium.src;
    }));
    fs.writeFileSync(cataloguePath, JSON.stringify(catalogue, null, 2) + '\n');
  }
  console.log(`Processed ${images.length} originals and wrote ${path.relative(root, manifestPath)}`);
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });
