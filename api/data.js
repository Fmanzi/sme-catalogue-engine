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

/* ---------- rebuild / publish ---------- */

let rebuildTimer = null;
let rebuildBusy = false;
let rebuildQueued = false;

const publish = {
  state: 'idle',          /* idle | building | pushing | deploying | live | error */
  lastStatus: null,
  lastStart: null,
  lastEnd: null,
  lastDurationMs: null,
  lastDeployStatus: null,
  lastError: null,
  pushSkipped: false,
  manualTrigger: false
};

function getPublishStatus() {
  return { ...publish };
}

function scheduleRebuild(clientId) {
  publish.manualTrigger = false;
  if (rebuildTimer) clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => runRebuild(clientId), 2000);
}

/**
 * Commit the client's data + processed media and push to the git remote
 * so a static host (e.g. Cloudflare Pages) rebuilds from the repo.
 * Free: uses a GitHub token only. No-op when no token is configured.
 *
 * Env: GIT_PAT or GH_TOKEN, GIT_BRANCH (default main),
 *      GIT_USER / GIT_EMAIL (commit identity, fallback safe defaults),
 *      REBUILD_PUSH=0 to disable auto-push entirely.
 */
async function pushToGit(clientId) {
  if (process.env.REBUILD_PUSH === '0') {
    console.log('[publish] git push disabled via REBUILD_PUSH=0 — skipping');
    return 'skipped';
  }
  const token = process.env.GIT_PAT || process.env.GH_TOKEN;
  if (!token) {
    console.warn('[publish] GIT_PAT/GH_TOKEN not set — changes stay local. Set a token to auto-publish to the live site.');
    return 'skipped';
  }

  const remote = await exec('git', ['remote', 'get-url', 'origin'], { cwd: ROOT })
    .then(r => r.stdout.trim())
    .catch(() => null);
  if (!remote) {
    console.warn('[publish] No git origin configured — skipping push.');
    return 'skipped';
  }

  const safeAddList = [
    `clients/${clientId}`,
    `assets/media/${clientId}`,
    `assets/css/theme.css`,
    `assets/js/client-data.js`,
    `robots.txt`,
    `sitemap.xml`,
    `product`
  ];
  await exec('git', ['add', '-f', '--', ...safeAddList], { cwd: ROOT });

  const status = await exec('git', ['status', '--porcelain'], { cwd: ROOT });
  if (!status.stdout.trim()) {
    console.log(`[publish] No tracked changes to push for ${clientId}.`);
    return 'clean';
  }

  const branch = process.env.GIT_BRANCH || 'main';
  const message = `Deploy ${clientId} changes ${new Date().toISOString()}`;
  const name = process.env.GIT_USER || 'Anon Store Admin';
  const email = process.env.GIT_EMAIL || 'admin@anon-store.local';

  await exec('git', ['-c', `user.name=${name}`, '-c', `user.email=${email}`, 'commit', '-m', message], { cwd: ROOT });

  const auth = Buffer.from('x-access-token:' + token).toString('base64');
  await exec(
    'git',
    ['-c', 'http.version=HTTP/1.1', '-c', `http.extraheader=AUTHORIZATION: basic ${auth}`, 'push', 'origin', `HEAD:${branch}`],
    { cwd: ROOT }
  );
  console.log(`[publish] Pushed to origin/${branch}.`);
  return 'pushed';
}

async function runRebuild(clientId) {
  if (rebuildBusy) {
    rebuildQueued = true;
    console.log('[rebuild] Already running — queuing a follow-up rebuild.');
    return;
  }
  rebuildBusy = true;
  publish.state = 'building';
  publish.lastStart = new Date().toISOString();
  publish.lastError = null;
  publish.pushSkipped = false;
  publish.lastDeployStatus = null;
  try {
    console.log(`[rebuild] Starting for ${clientId}...`);
    await exec('node', ['tools/build-client-data.js', clientId], { cwd: ROOT });
    await exec('node', ['tools/build-static-pages.js', clientId], { cwd: ROOT });
    await exec('node', ['tools/build-seo.js', clientId], { cwd: ROOT });
    publish.state = 'pushing';
    const pushResult = await pushToGit(clientId);
    publish.pushSkipped = pushResult === 'skipped';

    publish.state = 'deploying';
    const hookUrl = process.env.CF_DEPLOY_HOOK;
    if (hookUrl) {
      console.log('[rebuild] Triggering Cloudflare Pages deploy...');
      const res = await fetch(hookUrl, { method: 'POST' });
      publish.lastDeployStatus = res.status;
      console.log(`[rebuild] Deploy hook: ${res.status}`);
    } else {
      console.log('[rebuild] No CF_DEPLOY_HOOK set — Pages deploy not triggered.');
    }

    publish.lastEnd = new Date().toISOString();
    publish.lastDurationMs = Math.max(0, Date.now() - new Date(publish.lastStart).getTime());
    publish.state = 'live';
    publish.lastStatus = 'live';
    console.log(`[rebuild] Complete for ${clientId} (${publish.lastDurationMs}ms).`);
  } catch (err) {
    publish.lastError = err.message;
    publish.lastEnd = new Date().toISOString();
    publish.lastDurationMs = Math.max(0, Date.now() - new Date(publish.lastStart).getTime());
    publish.state = 'error';
    console.error('[rebuild] Failed:', err.message);
  } finally {
    rebuildBusy = false;
    if (rebuildQueued) {
      rebuildQueued = false;
      runRebuild(clientId);
    }
  }
}

/* ---------- image handling ---------- */

function getImageDir(clientId) {
  const dir = path.join(clientDir(clientId), 'media', 'originals');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/* ---------- multi-tenant store registry ---------- */

function listClients() {
  if (!fs.existsSync(CLIENTS_DIR)) return [];
  return fs.readdirSync(CLIENTS_DIR).filter(f => {
    const full = path.join(CLIENTS_DIR, f);
    return fs.statSync(full).isDirectory() && !['schema', 'template'].includes(f);
  });
}

function getClientInfo(clientId) {
  const business = getBusiness(clientId);
  const catalogue = getCatalogue(clientId);
  const admins = getAdminUsers(clientId);
  const site = business.site || {};
  const commerce = business.commerce || {};
  return {
    id: clientId,
    name: business.name || clientId,
    description: business.description || '',
    domain: site.domain || '',
    currency: commerce.currency || 'KES',
    currencySymbol: commerce.currencySymbol || '',
    productCount: (catalogue.products || []).length,
    categoryCount: (catalogue.categories || []).length,
    adminCount: admins.length,
    createdAt: business.createdAt || null
  };
}

function createClient({ id, name, admin }) {
  const dir = path.join(CLIENTS_DIR, id);
  if (fs.existsSync(dir)) throw Object.assign(new Error(`Store "${id}" already exists`), { status: 409 });
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(dir, 'media', 'originals'), { recursive: true });

  const template = path.join(CLIENTS_DIR, 'template', 'business.json');
  let business = fs.existsSync(template) ? readJson(template) : {};
  business.id = id;
  business.name = name;
  business.description = business.description || '';
  business.createdAt = new Date().toISOString();
  business.site = Object.assign({}, business.site, { domain: '', defaultSeoTitle: name });
  writeJson(path.join(dir, 'business.json'), business);

  writeJson(path.join(dir, 'catalogue.json'), { categories: [], brands: [], products: [] });

  if (admin && admin.email && admin.passwordHash) {
    writeJson(path.join(dir, 'admins.json'), [{
      id: uid(),
      name: admin.name || name,
      email: admin.email,
      role: admin.role || 'store_manager',
      passwordHash: admin.passwordHash,
      avatar: '',
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLoginAt: null
    }]);
  } else {
    writeJson(path.join(dir, 'admins.json'), []);
  }

  return getClientInfo(id);
}

module.exports = {
  ROOT, CLIENTS_DIR, TOOLS_DIR,
  clientDir, readJson, writeJson,
  getCatalogue, saveCatalogue, getBusiness, saveBusiness,
  getAdminUsers, saveAdminUsers,
  uid, slugify, scheduleRebuild, runRebuild, getPublishStatus, getImageDir,
  listClients, getClientInfo, createClient
};
