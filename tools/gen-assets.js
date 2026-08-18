/**
 * gen-assets.js — one-off generator for the watch store's SVG imagery.
 * Produces product watch illustrations, hero banners, collection art,
 * brand wordmarks and the store logo/favicon.
 *
 * Run: node tools/gen-assets.js   (from project root)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'assets', 'images');
const PRODUCTS = path.join(OUT, 'products');
const WATCH = path.join(OUT, 'watch');
const LOGO = path.join(OUT, 'logo');

for (const d of [PRODUCTS, WATCH, LOGO, path.join(OUT, 'brands')]) fs.mkdirSync(d, { recursive: true });

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ------------------------------------------------------------------ *
 *  Parametric luxury watch illustration
 * ------------------------------------------------------------------ */
function watchSVG(o) {
  const {
    strapTop = '#2b2118', strapBottom = '#2b2118', strapTopAlt = '#33281d',
    caseColor = '#c9ccd2', bezelColor = '#9aa1ab', dialFrom = '#f7f4ec', dialTo = '#e9e4d8',
    marker = '#5a5f66', hand = '#2f3135', second = '#b8874a',
    accent = '#b8874a', text = '#8b8377', crown = true, date = false, openwork = false
  } = o;

  const markers = [];
  for (let i = 0; i < 12; i++) {
    const a = (i * 30) * Math.PI / 180;
    const x1 = 200 + Math.sin(a) * 66, y1 = 200 - Math.cos(a) * 66;
    const x2 = 200 + Math.sin(a) * 74, y2 = 200 - Math.cos(a) * 74;
    markers.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${marker}" stroke-width="3.4" stroke-linecap="round"/>`);
  }

  const defs = `
    <defs>
      <linearGradient id="dialG" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${dialFrom}"/>
        <stop offset="100%" stop-color="${dialTo}"/>
      </linearGradient>
      <radialGradient id="caseG" cx="0.38" cy="0.32" r="0.9">
        <stop offset="0%" stop-color="${caseColor}"/>
        <stop offset="70%" stop-color="${caseColor}"/>
        <stop offset="100%" stop-color="#6f757e"/>
      </radialGradient>
      <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="6" stdDeviation="9" flood-color="#000" flood-opacity="0.22"/>
      </filter>
      <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="${accent}" flood-opacity="0.55"/>
      </filter>
    </defs>`;

  const dateWindow = date
    ? `<g><rect x="214" y="218" width="18" height="13" rx="3" fill="#fff" stroke="${marker}" stroke-width="1"/><text x="223" y="229" font-family="Georgia,serif" font-size="9" fill="${marker}" text-anchor="middle">14</text></g>` : '';

  const openworkDial = openwork
    ? `<g stroke="${marker}" stroke-width="1.2" opacity="0.5">
         <circle cx="200" cy="200" r="70"/><circle cx="200" cy="200" r="46"/>
         <line x1="200" y1="130" x2="200" y2="154"/><line x1="200" y1="246" x2="200" y2="270"/>
         <line x1="130" y1="200" x2="154" y2="200"/><line x1="246" y1="200" x2="270" y2="200"/>
       </g>` : '';

  const crownSvg = crown
    ? `<rect x="312" y="186" width="12" height="28" rx="5" fill="${caseColor}" stroke="#6f757e" stroke-width="1"/>
       <rect x="324" y="191" width="6" height="18" rx="3" fill="${caseColor}" stroke="#6f757e" stroke-width="1"/>` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="Luxury wristwatch">
${defs}
  <!-- straps -->
  <rect x="146" y="0" width="108" height="92" rx="22" fill="${strapTop}"/>
  <rect x="146" y="308" width="108" height="92" rx="22" fill="${strapBottom}"/>
  <!-- stitching -->
  <line x1="158" y1="6" x2="158" y2="88" stroke="${strapTopAlt}" stroke-width="2" stroke-dasharray="4 5"/>
  <line x1="242" y1="6" x2="242" y2="88" stroke="${strapTopAlt}" stroke-width="2" stroke-dasharray="4 5"/>
  <line x1="158" y1="312" x2="158" y2="394" stroke="${strapTopAlt}" stroke-width="2" stroke-dasharray="4 5"/>
  <line x1="242" y1="312" x2="242" y2="394" stroke="${strapTopAlt}" stroke-width="2" stroke-dasharray="4 5"/>
  <!-- lugs -->
  <rect x="134" y="78" width="132" height="38" rx="12" fill="${caseColor}"/>
  <rect x="134" y="284" width="132" height="38" rx="12" fill="${caseColor}"/>
  <!-- case group -->
  <g filter="url(#soft)">
    <circle cx="200" cy="200" r="122" fill="url(#caseG)"/>
    <circle cx="200" cy="200" r="112" fill="none" stroke="${bezelColor}" stroke-width="6"/>
    <circle cx="200" cy="200" r="104" fill="none" stroke="#000" stroke-opacity="0.14" stroke-width="2"/>
    <circle cx="200" cy="200" r="92" fill="url(#dialG)"/>
    <circle cx="200" cy="200" r="92" fill="none" stroke="#000" stroke-opacity="0.10" stroke-width="2"/>
  </g>
  <!-- hour track -->
  <circle cx="200" cy="200" r="82" fill="none" stroke="${marker}" stroke-opacity="0.25" stroke-width="0.8"/>
  ${markers.join('\n  ')}
  ${dateWindow}
  ${openworkDial}
  <!-- hands -->
  <g stroke-linecap="round">
    <rect x="197" y="146" width="6" height="62" rx="3" fill="${hand}" transform="rotate(-40 200 200)"/>
    <rect x="198.6" y="118" width="2.8" height="86" rx="1.4" fill="${hand}" transform="rotate(8 200 200)"/>
    <line x1="200" y1="208" x2="200" y2="126" stroke="${second}" stroke-width="1.6" transform="rotate(142 200 200)"/>
  </g>
  <circle cx="200" cy="200" r="6" fill="${hand}"/>
  <circle cx="200" cy="200" r="2.4" fill="${accent}"/>
  <!-- dial text -->
  <text x="200" y="252" font-family="Georgia, 'Times New Roman', serif" font-size="11" letter-spacing="3.5" fill="${text}" text-anchor="middle">MERIDIAN</text>
  <text x="200" y="264" font-family="Georgia, 'Times New Roman', serif" font-size="7" letter-spacing="2" fill="${text}" text-anchor="middle">AUTOMATIC</text>
  ${crownSvg}
</svg>`;
}

/* ------------------------------------------------------------------ *
 *  Product variants
 * ------------------------------------------------------------------ */
const variants = [
  { strapTop: '#3b2f23', strapBottom: '#3b2f23', dialFrom: '#f8f5ec', dialTo: '#e8e2d2', caseColor: '#d6d9de', bezelColor: '#aab0b9', hand: '#3a3d42', accent: '#b8874a', text: '#8b8377' },
  { strapTop: '#e7dcc9', strapBottom: '#e7dcc9', dialFrom: '#fdf7ec', dialTo: '#f2e3c8', caseColor: '#e6c98f', bezelColor: '#c8a25c', hand: '#6b5a3e', accent: '#b8874a', text: '#9a8a6e', crown: true },
  { strapTop: '#2f2a24', strapBottom: '#2f2a24', dialFrom: '#f2ead9', dialTo: '#e2d6bd', caseColor: '#c9a24a', bezelColor: '#a9812f', hand: '#4a3d28', accent: '#8a6b28', text: '#8b7a58' },
  { strapTop: '#141a20', strapBottom: '#141a20', dialFrom: '#0f2230', dialTo: '#0a1824', caseColor: '#b9bfc7', bezelColor: '#8c939d', marker: '#d8e0e8', hand: '#d8e0e8', second: '#38b6ff', accent: '#38b6ff', text: '#7fa3bd' },
  { strapTop: '#241c17', strapBottom: '#241c17', dialFrom: '#efe6d8', dialTo: '#dcd0bd', caseColor: '#d7d2c8', bezelColor: '#b3aca0', marker: '#6b5f52', hand: '#3f3a35', accent: '#b8874a', text: '#7a7066' },
  { strapTop: '#26201a', strapBottom: '#26201a', dialFrom: '#ece5d8', dialTo: '#ded3c1', caseColor: '#cfd3d8', bezelColor: '#a7adb5', hand: '#2f3135', accent: '#c0a060', text: '#837a6e' },
  { strapTop: '#1b1b1d', strapBottom: '#1b1b1d', dialFrom: '#26262a', dialTo: '#19191c', caseColor: '#b8bec6', bezelColor: '#8f969f', marker: '#e8e8ea', hand: '#e8e8ea', second: '#e74c3c', accent: '#e74c3c', text: '#8f9299' },
  { strapTop: '#20262a', strapBottom: '#20262a', dialFrom: '#e8ecef', dialTo: '#d3d9de', caseColor: '#8e97a3', bezelColor: '#6d7683', hand: '#2f353b', accent: '#d9a441', text: '#7c848d' },
  { strapTop: '#2c221d', strapBottom: '#2c221d', dialFrom: '#f4ece0', dialTo: '#e9dcc8', caseColor: '#e0b185', bezelColor: '#c88e5a', marker: '#8a5a38', hand: '#5d4030', second: '#c0392b', accent: '#c0392b', text: '#a07a5a' },
  { strapTop: '#5c4326', strapBottom: '#5c4326', dialFrom: '#fdfaf2', dialTo: '#f0e7d2', caseColor: '#c6cbd2', bezelColor: '#9aa2ac', hand: '#3a3d42', accent: '#8a6b28', text: '#8b8377' },
  { strapTop: '#221c1a', strapBottom: '#221c1a', dialFrom: '#1d1d22', dialTo: '#121216', caseColor: '#c8ccd3', bezelColor: '#9aa1ab', marker: '#d9a441', hand: '#d9a441', second: '#d9a441', accent: '#d9a441', text: '#9a8b72', openwork: true },
  { strapTop: '#1f1f22', strapBottom: '#1f1f22', dialFrom: '#2b2b2f', dialTo: '#1b1b1e', caseColor: '#bcc1c8', bezelColor: '#9097a0', marker: '#e8e8ea', hand: '#e8e8ea', accent: '#b8874a', text: '#8f9299' },
  { strapTop: '#24311f', strapBottom: '#24311f', dialFrom: '#eef2e4', dialTo: '#dde5c9', caseColor: '#c7ccd3', bezelColor: '#9aa1ab', marker: '#4d5a40', hand: '#33382f', second: '#2ecc71', accent: '#4c8a57', text: '#76806b' },
  { strapTop: '#152238', strapBottom: '#152238', dialFrom: '#123a5e', dialTo: '#0a2035', caseColor: '#b9bfc7', bezelColor: '#8c939d', marker: '#dfeaf4', hand: '#dfeaf4', second: '#f39c12', accent: '#f39c12', text: '#7fa3bd' },
  { strapTop: '#e7d9c2', strapBottom: '#e7d9c2', dialFrom: '#f8f1e3', dialTo: '#ecdbbd', caseColor: '#d9a441', bezelColor: '#b8874a', marker: '#6b5136', hand: '#4a3d28', accent: '#c0392b', text: '#9a835f' },
  { strapTop: '#3a2d1c', strapBottom: '#3a2d1c', dialFrom: '#0e2f45', dialTo: '#071a28', caseColor: '#c2c7ce', bezelColor: '#959ca6', marker: '#e3ebf2', hand: '#e3ebf2', second: '#b8874a', accent: '#b8874a', text: '#7fa3bd', date: true },
  { strapTop: '#2a221d', strapBottom: '#2a221d', dialFrom: '#1f4d8a', dialTo: '#123263', caseColor: '#d9b18c', bezelColor: '#c08d5a', marker: '#f2ece2', hand: '#f2ece2', accent: '#b8874a', text: '#9ab4cc' },
  { strapTop: '#2f3a24', strapBottom: '#2f3a24', dialFrom: '#eef2e6', dialTo: '#dde4c9', caseColor: '#bcc1c8', bezelColor: '#9097a0', marker: '#43503a', hand: '#2f3830', accent: '#4c8a57', text: '#74806d' },
  { strapTop: '#3b2c24', strapBottom: '#3b2c24', dialFrom: '#fdfaf2', dialTo: '#efe4cd', caseColor: '#d3a24f', bezelColor: '#b8874a', marker: '#6b5136', hand: '#4a3d28', accent: '#8a6b28', text: '#967f5d' },
  { strapTop: '#20262a', strapBottom: '#20262a', dialFrom: '#e2552a', dialTo: '#c23b14', caseColor: '#7f8996', bezelColor: '#5f6a78', marker: '#f6e9e2', hand: '#2f353b', second: '#f1c40f', accent: '#f1c40f', text: '#e0a68c' },
  { strapTop: '#4a3a26', strapBottom: '#4a3a26', dialFrom: '#f3ede1', dialTo: '#e3d8c3', caseColor: '#cdd1d7', bezelColor: '#a0a7b0', hand: '#3a3d42', accent: '#b8874a', text: '#837a6e' },
  { strapTop: '#33383d', strapBottom: '#33383d', dialFrom: '#f2ede4', dialTo: '#e2d9ca', caseColor: '#c3c8cf', bezelColor: '#969ea8', marker: '#4d545c', hand: '#2f353b', accent: '#6d7683', text: '#7c848d', crown: true },
  { strapTop: '#3a2d1c', strapBottom: '#3a2d1c', dialFrom: '#d99a6c', dialTo: '#c57e50', caseColor: '#c2c7ce', bezelColor: '#959ca6', marker: '#5a3a2a', hand: '#3a2a20', second: '#8a6b28', accent: '#8a6b28', text: '#9a7a5e', date: true },
  { strapTop: '#17171a', strapBottom: '#17171a', dialFrom: '#202024', dialTo: '#101013', caseColor: '#6f7680', bezelColor: '#4d545e', marker: '#e8e8ea', hand: '#e8e8ea', second: '#b8874a', accent: '#b8874a', text: '#8f9299' }
];

variants.forEach((v, i) => {
  const n = String(i + 1).padStart(2, '0');
  const alt = { ...v, strapTop: v.strapBottom === v.strapTop ? (i % 2 ? '#4a3a2a' : '#1d1d1f') : v.strapBottom };
  fs.writeFileSync(path.join(PRODUCTS, `watch-${n}.svg`), watchSVG(v));
  fs.writeFileSync(path.join(PRODUCTS, `watch-${n}-b.svg`), watchSVG({ ...alt, date: true, crown: false }));
});
console.log('generated 48 product watch SVGs');

/* ------------------------------------------------------------------ *
 *  Hero banners (1400 x 520)
 * ------------------------------------------------------------------ */
function heroSVG(opts) {
  const { bg1, bg2, dialFrom, dialTo, accent, caseColor, bezelColor, strap, marker, text } = opts;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 520" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Meridian timepiece">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bg1}"/><stop offset="100%" stop-color="${bg2}"/>
    </linearGradient>
    <radialGradient id="halo" cx="0.78" cy="0.5" r="0.42">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.35"/>
      <stop offset="60%" stop-color="${accent}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="caseH" cx="0.38" cy="0.32" r="0.9">
      <stop offset="0%" stop-color="${caseColor}"/><stop offset="70%" stop-color="${caseColor}"/><stop offset="100%" stop-color="#6f757e"/>
    </radialGradient>
    <linearGradient id="dialH" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${dialFrom}"/><stop offset="100%" stop-color="${dialTo}"/>
    </linearGradient>
  </defs>
  <rect width="1400" height="520" fill="url(#bg)"/>
  <rect width="1400" height="520" fill="url(#halo)"/>
  <circle cx="1150" cy="260" r="300" fill="none" stroke="${accent}" stroke-opacity="0.18" stroke-width="1.5"/>
  <circle cx="1150" cy="260" r="360" fill="none" stroke="${accent}" stroke-opacity="0.10" stroke-width="1.5"/>
  <circle cx="1150" cy="260" r="252" fill="none" stroke="${accent}" stroke-opacity="0.28" stroke-width="1"/>
  <!-- watch -->
  <g transform="translate(1010,120) scale(1.18)">
    <rect x="-54" y="-90" width="108" height="84" rx="20" fill="${strap}"/>
    <rect x="-54" y="6" width="108" height="84" rx="20" fill="${strap}"/>
    <circle r="112" fill="url(#caseH)"/>
    <circle r="102" fill="none" stroke="${bezelColor}" stroke-width="6"/>
    <circle r="88" fill="url(#dialH)"/>
    <g>
      ${[0,30,60,90,120,150,180,210,240,270,300,330].map(a => {
        const r = (a * Math.PI) / 180;
        const x1 = Math.sin(r) * 62, y1 = -Math.cos(r) * 62, x2 = Math.sin(r) * 70, y2 = -Math.cos(r) * 70;
        return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${marker}" stroke-width="3.4" stroke-linecap="round"/>`;
      }).join('')}
    </g>
    <g transform="rotate(-35)"><rect x="-3" y="-50" width="6" height="54" rx="3" fill="${marker}"/></g>
    <g transform="rotate(14)"><rect x="-1.4" y="-66" width="2.8" height="72" rx="1.4" fill="${marker}"/></g>
    <line x1="0" y1="4" x2="0" y2="-60" stroke="${accent}" stroke-width="1.6" transform="rotate(120)"/>
    <circle r="5.6" fill="${marker}"/>
    <text y="48" font-family="Georgia,serif" font-size="11" letter-spacing="3.5" fill="${text}" text-anchor="middle">MERIDIAN</text>
  </g>
</svg>`;
}

const heroes = [
  { bg1: '#0d0f14', bg2: '#1d1a26', dialFrom: '#f8f5ec', dialTo: '#e6e0d0', accent: '#c9a04c', caseColor: '#d6d9de', bezelColor: '#aab0b9', strap: '#32271b', marker: '#3a3d42', text: '#8b8377' },
  { bg1: '#0a1312', bg2: '#0f1d1a', dialFrom: '#123a5e', dialTo: '#0a2035', accent: '#e0c37a', caseColor: '#b9bfc7', bezelColor: '#8c939d', strap: '#151a20', marker: '#dfeaf4', text: '#7fa3bd' },
  { bg1: '#160f0d', bg2: '#241412', dialFrom: '#efe6d8', dialTo: '#dccbb4', accent: '#d9a441', caseColor: '#e0b185', bezelColor: '#c88e5a', strap: '#2c221d', marker: '#5d4030', text: '#9a7a5e' }
];
heroes.forEach((h, i) => fs.writeFileSync(path.join(WATCH, `hero-${i + 1}.svg`), heroSVG(h)));
console.log('generated 3 hero banners');

/* CTA banner */
fs.writeFileSync(path.join(WATCH, 'cta.svg'), heroSVG({ bg1: '#0d0f14', bg2: '#1a1720', dialFrom: '#26262a', dialTo: '#161619', accent: '#c9a04c', caseColor: '#6f7680', bezelColor: '#4d545e', strap: '#1d1d1f', marker: '#e8e8ea', text: '#8f9299' }));
console.log('generated CTA banner');

/* ------------------------------------------------------------------ *
 *  Collection cards (600 x 420)
 * ------------------------------------------------------------------ */
function collectionSVG(o) {
  const { bg1, bg2, accent, dialFrom, dialTo, caseColor, bezelColor, strap } = o;
  const marks = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(a => {
    const r = (a * Math.PI) / 180;
    return `<line x1="${(300 + Math.sin(r) * 58).toFixed(1)}" y1="${(210 - Math.cos(r) * 58).toFixed(1)}" x2="${(300 + Math.sin(r) * 66).toFixed(1)}" y2="${(210 - Math.cos(r) * 66).toFixed(1)}" stroke="#5a5f66" stroke-width="3.2" stroke-linecap="round"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420" role="img">
  <defs>
    <linearGradient id="cbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${bg1}"/><stop offset="100%" stop-color="${bg2}"/></linearGradient>
    <linearGradient id="cdial" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${dialFrom}"/><stop offset="100%" stop-color="${dialTo}"/></linearGradient>
    <radialGradient id="ccase" cx="0.38" cy="0.32" r="0.9"><stop offset="0%" stop-color="${caseColor}"/><stop offset="70%" stop-color="${caseColor}"/><stop offset="100%" stop-color="#6f757e"/></radialGradient>
  </defs>
  <rect width="600" height="420" fill="url(#cbg)"/>
  <rect x="0" y="0" width="600" height="6" fill="${accent}"/>
  <g transform="translate(300,210)">
    <circle r="126" fill="none" stroke="${accent}" stroke-opacity="0.2" stroke-width="1.2"/>
    <circle r="146" fill="none" stroke="${accent}" stroke-opacity="0.1" stroke-width="1.2"/>
    <rect x="-46" y="-128" width="92" height="56" rx="14" fill="${strap}"/>
    <rect x="-46" y="72" width="92" height="56" rx="14" fill="${strap}"/>
    <circle r="92" fill="url(#ccase)"/>
    <circle r="84" fill="none" stroke="${bezelColor}" stroke-width="5"/>
    <circle r="72" fill="url(#cdial)"/>
    ${marks}
    <g transform="rotate(-40)"><rect x="-2.6" y="-42" width="5.2" height="46" rx="2.6" fill="#3a3d42"/></g>
    <g transform="rotate(10)"><rect x="-1.2" y="-54" width="2.4" height="60" rx="1.2" fill="#3a3d42"/></g>
    <circle r="5" fill="#3a3d42"/>
  </g>
</svg>`;
}
const collections = [
  { bg1: '#10131a', bg2: '#1b202c', accent: '#c9a04c', dialFrom: '#f8f5ec', dialTo: '#e6e0d0', caseColor: '#d6d9de', bezelColor: '#aab0b9', strap: '#32271b' },
  { bg1: '#171204', bg2: '#2a2109', accent: '#e3c273', dialFrom: '#f2ead9', dialTo: '#e0d2b5', caseColor: '#c9a24a', bezelColor: '#a9812f', strap: '#3b2f23' },
  { bg1: '#0c0f14', bg2: '#161b24', accent: '#d9a441', dialFrom: '#efe6d8', dialTo: '#dccbb4', caseColor: '#c7ccd3', bezelColor: '#9aa1ab', strap: '#241c17' },
  { bg1: '#0a1312', bg2: '#12201d', accent: '#38b6ff', dialFrom: '#123a5e', dialTo: '#0a2035', caseColor: '#b9bfc7', bezelColor: '#8c939d', strap: '#151a20' },
  { bg1: '#120b12', bg2: '#1f1320', accent: '#c9a04c', dialFrom: '#26262a', dialTo: '#161619', caseColor: '#d3a24f', bezelColor: '#b8874a', strap: '#1d1d1f' },
  { bg1: '#161412', bg2: '#241f18', accent: '#b8874a', dialFrom: '#d99a6c', dialTo: '#c07a4a', caseColor: '#c2c7ce', bezelColor: '#959ca6', strap: '#3a2d1c' }
];
collections.forEach((c, i) => fs.writeFileSync(path.join(WATCH, `collection-${i + 1}.svg`), collectionSVG(c)));
console.log('generated 6 collection cards');

/* ------------------------------------------------------------------ *
 *  Brand wordmarks + store logo + favicon
 * ------------------------------------------------------------------ */
function wordmark(name, sub, color = '#c9a04c') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 64" role="img" aria-label="${esc(name)}">
  <text x="100" y="34" font-family="Georgia, 'Times New Roman', serif" font-size="20" letter-spacing="4" fill="#222" text-anchor="middle">${esc(name)}</text>
  <text x="100" y="50" font-family="Georgia, serif" font-size="8" letter-spacing="2" fill="${color}" text-anchor="middle">${esc(sub)}</text>
</svg>`;
}
const brandWords = [
  ['AURELIA', 'SWISS MAISON'],
  ['NOCTURNE', 'HAND-WOUND'],
  ['HELIOS', 'ENGINEERED'],
  ['OBSIDIAN', 'HAUTE HORLOGERIE'],
  ['MERIDIAN', 'EST. 1904'],
  ['VELOCITÀ', 'RACING INSTRUMENTS']
];
brandWords.forEach((b, i) => fs.writeFileSync(path.join(OUT, 'brands', `${b[0].toLowerCase()}-logo.svg`), wordmark(b[0], b[1])));
console.log('generated 6 brand wordmarks');

fs.writeFileSync(path.join(LOGO, 'logo.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 60" role="img" aria-label="MERIDIAN Fine Timepieces">
  <circle cx="30" cy="30" r="22" fill="none" stroke="#b8874a" stroke-width="2.4"/>
  <circle cx="30" cy="30" r="16" fill="none" stroke="#2f3135" stroke-width="1"/>
  <g stroke="#2f3135" stroke-width="1.6" stroke-linecap="round">
    <line x1="30" y1="18" x2="30" y2="22"/><line x1="30" y1="38" x2="30" y2="42"/>
    <line x1="18" y1="30" x2="22" y2="30"/><line x1="38" y1="30" x2="42" y2="30"/>
  </g>
  <g transform="rotate(-30 30 30)"><rect x="28.4" y="14" width="3.2" height="16" rx="1.6" fill="#2f3135"/></g>
  <text x="62" y="30" font-family="Georgia, serif" font-size="24" letter-spacing="3" fill="#1f1f22">MERIDIAN</text>
  <text x="64" y="46" font-family="Georgia, serif" font-size="9" letter-spacing="4" fill="#b8874a">FINE TIMEPIECES</text>
</svg>`);

fs.writeFileSync(path.join(LOGO, 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#101014"/>
  <circle cx="32" cy="32" r="22" fill="none" stroke="#c9a04c" stroke-width="3"/>
  <circle cx="32" cy="32" r="14" fill="none" stroke="#e9e4d8" stroke-width="1.6"/>
  <g stroke="#e9e4d8" stroke-width="2" stroke-linecap="round">
    <line x1="32" y1="24" x2="32" y2="27"/><line x1="32" y1="37" x2="32" y2="40"/>
    <line x1="24" y1="32" x2="27" y2="32"/><line x1="37" y1="32" x2="40" y2="32"/>
  </g>
  <g transform="rotate(-35 32 32)"><rect x="30.4" y="19" width="3.2" height="13" rx="1.6" fill="#e9e4d8"/></g>
  <circle cx="32" cy="32" r="2.4" fill="#c9a04c"/>
</svg>`);
console.log('generated logo + favicon');

console.log('done.');
