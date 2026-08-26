const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { getImageDir, ROOT, clientDir, scheduleRebuild } = require('../data');

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/\.(jpg|jpeg|png|gif|webp|avif)$/i.test(file.originalname)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

async function processImage(buffer, productId, filename) {
  const clientDir = path.join(ROOT, 'clients', 'meridian');
  const productDir = path.join(clientDir, 'media', 'meridian', 'products', productId);
  if (!fs.existsSync(productDir)) fs.mkdirSync(productDir, { recursive: true });

  const name = path.parse(filename).name;
  const results = [];

  const sizes = [
    { suffix: 'thumb', width: 400 },
    { suffix: 'medium', width: 800 },
    { suffix: 'large', width: 1200 }
  ];

  for (const size of sizes) {
    for (const fmt of ['webp', 'avif']) {
      const outName = `${name}-${size.suffix}.${fmt}`;
      const outPath = path.join(productDir, outName);
      await sharp(buffer).resize({ width: size.width, withoutEnlargement: true }).toFormat(fmt, { quality: 80 }).toFile(outPath);
      results.push({
        width: size.width,
        format: fmt,
        src: `assets/media/meridian/products/${productId}/${outName}`
      });
    }
  }

  const originalName = filename;
  const originalDir = getImageDir('meridian');
  fs.writeFileSync(path.join(originalDir, originalName), buffer);

  return results;
}

router.post('/:clientId', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file provided' });
    const productId = req.body.productId || 'misc';
    const variants = await processImage(req.file.buffer, productId, req.file.originalname);
    const primary = variants.find(v => v.width === 800 && v.format === 'webp') || variants[0];
    res.json({
      id: `${productId}-${Date.now()}`,
      src: primary.src,
      alt: req.body.alt || '',
      primary: req.body.primary === 'true',
      variants
    });
  } catch (err) {
    console.error('[upload] Error:', err.message);
    res.status(500).json({ error: 'Image processing failed: ' + err.message });
  }
});

module.exports = router;
