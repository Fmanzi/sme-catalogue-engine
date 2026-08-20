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
const sizes = [{ name: 'thumb', width: 400 }, { name: 'medium', width: 800 }];
const allowed = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
const BATCH = 20;

async function processFile(file) {
  const input = path.join(originals, file);
  const id = path.basename(file, path.extname(file));
  const destination = path.join(outputRoot, id);
  const testFile = path.join(destination, `${id}-thumb.webp`);
  if (fs.existsSync(testFile)) {
    return readExisting(id, file, destination);
  }
  let meta;
  try { meta = await sharp(input).metadata(); }
  catch (_) { return null; }
  fs.mkdirSync(destination, { recursive: true });
  const variants = [];
  const jobs = [];
  for (const size of sizes) {
    for (const format of ['webp', 'avif']) {
      const filename = `${id}-${size.name}.${format}`;
      const out = path.join(destination, filename);
      jobs.push(
        sharp(input).resize({ width: size.width, withoutEnlargement: true })
          .toFormat(format, { quality: format === 'avif' ? 45 : 72 })
          .toFile(out)
          .then(() => { variants.push({ width: Math.min(meta.width || size.width, size.width), format, src: `assets/media/${client}/products/${id}/${filename}` }); })
          .catch(() => {})
      );
    }
  }
  await Promise.all(jobs);
  if (variants.length) return { id, source: `clients/${client}/media/originals/${file}`, width: meta.width, height: meta.height, alt: '', variants };
  return null;
}

function readExisting(id, file, destination) {
  const variants = [];
  for (const size of sizes) {
    for (const format of ['webp', 'avif']) {
      const filename = `${id}-${size.name}.${format}`;
      const filePath = path.join(destination, filename);
      if (fs.existsSync(filePath)) {
        variants.push({ width: size.width, format, src: `assets/media/${client}/products/${id}/${filename}` });
      }
    }
  }
  if (!variants.length) return null;
  return { id, source: `clients/${client}/media/originals/${file}`, width: 300, height: 300, alt: '', variants };
}

async function run() {
  if (!fs.existsSync(originals)) throw new Error(`Originals directory does not exist: ${originals}`);
  const files = fs.readdirSync(originals).filter(file => allowed.has(path.extname(file).toLowerCase()));
  console.log(`Found ${files.length} images to process...`);
  const images = [];
  let done = 0, generated = 0;
  for (let i = 0; i < files.length; i += BATCH) {
    const batch = files.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(f => processFile(f)));
    results.forEach(r => { if (r) { images.push(r); generated++; } });
    done += batch.length;
    if (done % 200 === 0 || done === files.length) process.stdout.write(`\r  ${done}/${files.length}`);
  }
  console.log(`\n${images.length} images in manifest`);
  const manifestPath = path.join(root, 'clients', client, 'image-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify({ generatedAt: new Date().toISOString(), storage: { type: 'static', baseUrl: '' }, images }, null, 2) + '\n');
  const cataloguePath = path.join(root, 'clients', client, 'catalogue.json');
  if (fs.existsSync(cataloguePath)) {
    const catalogue = JSON.parse(fs.readFileSync(cataloguePath, 'utf8'));
    const byId = new Map(images.map(image => [image.id, image]));
    let patched = 0;
    catalogue.products.forEach(product => {
      const updated = [];
      (product.images || []).forEach(image => {
        let id;
        if (typeof image === 'string') {
          id = path.basename(image, path.extname(image));
        } else if (image && image.id) {
          id = image.id;
        } else {
          updated.push(image);
          return;
        }
        const processed = byId.get(id);
        if (!processed) { updated.push(image); return; }
        patched++;
        if (typeof image === 'string') {
          const medium = processed.variants.find(variant => variant.width === 800 && variant.format === 'webp');
          updated.push({ id: processed.id, src: medium ? medium.src : image, alt: product.name || '', primary: updated.length === 0, variants: processed.variants });
        } else {
          image.variants = processed.variants;
          const medium = processed.variants.find(variant => variant.width === 800 && variant.format === 'webp');
          if (medium) image.src = medium.src;
          updated.push(image);
        }
      });
      product.images = updated;
    });
    fs.writeFileSync(cataloguePath, JSON.stringify(catalogue, null, 2) + '\n');
    console.log(`Patched ${patched} image entries in catalogue`);
  }
  console.log(`Wrote ${path.relative(root, manifestPath)}`);
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });
