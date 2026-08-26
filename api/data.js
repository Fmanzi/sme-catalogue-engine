const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const exec = promisify(execFile);
const ROOT = path.resolve(__dirname, '..');
const CLIENTS_DIR = path.join(ROOT, 'clients');
const TOOLS_DIR = path.join(ROOT, 'tools');

/* ---------- data access ---------- */

function clientDir(clientId) {
  const dir = path.join(CLIENTS_DIR, clientId);
  if (!fs.existsSync(dir)) throw new Error(`Client "${clientId}" not found`);
  return dir;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function getCatalogue(clientId) {
  return readJson(path.join(clientDir(clientId), 'catalogue.json'));
}

function saveCatalogue(clientId, data) {
  writeJson(path.join(clientDir(clientId), 'catalogue.json'), data);
}

function getBusiness(clientId) {
  return readJson(path.join(clientDir(clientId), 'business.json'));
}

function saveBusiness(clientId, data) {
  writeJson(path.join(clientDir(clientId), 'business.json'), data);
}

function getAdminUsers(clientId) {
  const file = path.join(clientDir(clientId), 'admins.json');
  if (!fs.existsSync(file)) return [];
  return readJson(file);
}

function saveAdminUsers(clientId, users) {
  writeJson(path.join(clientDir(clientId), 'admins.json'), users);
}

/* ---------- id generation ---------- */

function uid() {
  return 'id_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function slugify(s) {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
}

/* ---------- rebuild ---------- */

let rebuildTimer = null;

function scheduleRebuild(clientId) {
  if (rebuildTimer) clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => runRebuild(clientId), 2000);
}

async function runRebuild(clientId) {
  try {
    console.log(`[rebuild] Starting for ${clientId}...`);
    await exec('node', ['tools/build-client-data.js', clientId], { cwd: ROOT });
    await exec('node', ['tools/build-static-pages.js', clientId], { cwd: ROOT });
    await exec('node', ['tools/build-seo.js', clientId], { cwd: ROOT });
    console.log(`[rebuild] Complete for ${clientId}`);

    const hookUrl = process.env.CF_DEPLOY_HOOK;
    if (hookUrl) {
      console.log('[rebuild] Triggering Cloudflare Pages deploy...');
      const res = await fetch(hookUrl, { method: 'POST' });
      console.log(`[rebuild] Deploy hook: ${res.status}`);
    }
  } catch (err) {
    console.error('[rebuild] Failed:', err.message);
  }
}

/* ---------- image handling ---------- */

function getImageDir(clientId) {
  const dir = path.join(clientDir(clientId), 'media', 'originals');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

module.exports = {
  ROOT, CLIENTS_DIR, TOOLS_DIR,
  clientDir, readJson, writeJson,
  getCatalogue, saveCatalogue, getBusiness, saveBusiness,
  getAdminUsers, saveAdminUsers,
  uid, slugify, scheduleRebuild, runRebuild, getImageDir
};
