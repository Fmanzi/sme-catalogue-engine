/**
 * sms-gate — Cloudflare Worker gate for the SME catalogue engine.
 *
 * OPTIONAL production component. It lets a store run with NO Node server:
 *  - the admin panel posts a rebuilt catalogue + settings bundle,
 *  - this Worker commits those files to the GitHub repo (via the Git Data API),
 *  - Cloudflare Pages auto-rebuilds the static site from the repo.
 * It also forwards new orders to a Telegram channel/chat.
 *
 * Secrets (create in the dashboard, never commit):
 *   GITHUB_TOKEN  — fine-grained PAT, Contents: Read+Write on the SME repo
 *   REPO_OWNER    — e.g. "Fmanzi"
 *   REPO_NAME     — e.g. "sme-catalogue-engine"
 *   API_TOKEN     — shared secret the admin panel sends as `x-api-token`
 *   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID — for order forwarding
 *
 * Deploy (dashboard or wrangler):
 *   wrangler deploy   (then set the secrets above and a route/subdomain)
 *
 * NOT deployable/tested in this repo's local harness — the Node API
 * (api/server.js) is the local equivalent of this worker.
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-token'
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...CORS } });
}

async function handle(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const url = new URL(request.url);
  const path = url.pathname;

  /* optional shared-token gate */
  const token = request.headers.get('x-api-token');
  if (env.API_TOKEN && token !== env.API_TOKEN) {
    return json({ error: 'Unauthorized' }, 401);
  }

  if (request.method === 'POST' && path === '/api/publish') {
    return await publish(await request.json(), env);
  }

  if (request.method === 'GET' && path === '/api/publish/status') {
    return await publishStatus(url, env);
  }

  if (request.method === 'POST' && path === '/api/orders') {
    return await forwardOrder(await request.json(), env);
  }

  return json({ error: `No route for ${request.method} ${path}` }, 404);
}

/**
 * Commit rebuilt files to the SME repo as one commit.
 * body: { clientId, branch?, files: { "clients/<id>/catalogue.json": "...", ... } }
 */
async function publish(body, env) {
  const { clientId, branch = 'main', files } = body || {};
  if (!clientId || !files || typeof files !== 'object' || !Object.keys(files).length) {
    return json({ error: 'clientId and files are required' }, 400);
  }
  if (!env.GITHUB_TOKEN || !env.REPO_OWNER || !env.REPO_NAME) {
    return json({ error: 'Worker is missing GITHUB_TOKEN / REPO_OWNER / REPO_NAME secrets' }, 500);
  }

  const api = `https://api.github.com/repos/${env.REPO_OWNER}/${env.REPO_NAME}`;
  const headers = {
    'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'sms-gate-worker',
    'X-GitHub-Api-Version': '2022-11-28'
  };
  const commitMsg = `Publish ${clientId} — ${new Date().toISOString()} (via sms-gate)`;

  try {
    /* 1. current HEAD SHA */
    const refRes = await fetch(`${api}/git/ref/heads/${branch}`, { headers });
    if (!refRes.ok) return json({ error: `Could not read branch ref (${refRes.status})` }, 502);
    const ref = await refRes.json();
    const baseSha = ref.object.sha;

    /* 2. create a blob per file */
    const treeItems = [];
    for (const [filePath, content] of Object.entries(files)) {
      const blobRes = await fetch(`${api}/git/blobs`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: String(content), encoding: 'utf-8' })
      });
      if (!blobRes.ok) return json({ error: `Blob create failed for ${filePath} (${blobRes.status})` }, 502);
      const blob = await blobRes.json();
      treeItems.push({ path: filePath, mode: '100644', type: 'blob', sha: blob.sha });
    }

    /* 3. new tree on top of HEAD (overwrites each listed file) */
    const treeRes = await fetch(`${api}/git/trees`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ base_tree: baseSha, tree: treeItems })
    });
    if (!treeRes.ok) return json({ error: `Tree create failed (${treeRes.status})` }, 502);
    const tree = await treeRes.json();

    /* 4. commit */
    const commitRes = await fetch(`${api}/git/commits`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: commitMsg, tree: tree.sha, parents: [baseSha] })
    });
    if (!commitRes.ok) return json({ error: `Commit failed (${commitRes.status})` }, 502);
    const commit = await commitRes.json();

    /* 5. update branch ref */
    const updateRes = await fetch(`${api}/git/refs/heads/${branch}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sha: commit.sha, force: true })
    });
    if (!updateRes.ok) return json({ error: `Ref update failed (${updateRes.status})` }, 502);

    return json({ ok: true, clientId, commit: commit.sha, files: Object.keys(files).length });
  } catch (err) {
    return json({ error: 'Worker publish error: ' + err.message }, 500);
  }
}

async function publishStatus(url, env) {
  if (!env.GITHUB_TOKEN || !env.REPO_OWNER || !env.REPO_NAME) {
    return json({ error: 'Worker is missing repository secrets' }, 500);
  }
  const clientId = url.searchParams.get('clientId') || '';
  const perPage = clientId ? 100 : 1;
  const res = await fetch(
    `https://api.github.com/repos/${env.REPO_OWNER}/${env.REPO_NAME}/commits?per_page=${perPage}`,
    { headers: { 'Authorization': `Bearer ${env.GITHUB_TOKEN}`, 'Accept': 'application/vnd.github+json', 'User-Agent': 'sms-gate-worker' } }
  );
  if (!res.ok) return json({ error: `Commits fetch failed (${res.status})` }, 502);
  const commits = await res.json();
  const list = (Array.isArray(commits) ? commits : []).map(c => ({ sha: c.sha, date: c.commit && c.commit.committer && c.commit.committer.date, msg: (c.commit && c.commit.message) || '' }));
  const mine = clientId ? list.filter(c => (c.msg || '').includes(clientId)) : list;
  return json({ latest: mine[0] || null, total: list.length });
}

async function forwardOrder(order, env) {
  const bot = env.TELEGRAM_BOT_TOKEN;
  const chat = env.TELEGRAM_CHAT_ID;
  if (!bot || !chat) return json({ error: 'Worker is missing Telegram secrets' }, 500);

  const lines = [
    `🛍️ NEW ORDER — ${order.orderNumber || order.id || 'unknown'}`,
    `Store: ${order.clientId || '—'}`,
    `Name: ${order.customerName || '—'}`,
    `Phone: ${order.phone || '—'}`,
    `Delivery: ${order.deliveryAddress || order.shippingAddress || '—'}`,
    '--- items ---'
  ];
  (order.items || []).forEach(it => lines.push(`• ${it.name} × ${it.quantity} = ${it.price * it.quantity} ${order.currency || 'KES'}`));
  if (order.note) lines.push(`Note: ${order.note}`);
  lines.push(`TOTAL: ${order.total} ${order.currency || 'KES'}`);

  const res = await fetch(`https://api.telegram.org/bot${bot}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: lines.join('\n') })
  });
  if (!res.ok) return json({ error: `Telegram send failed (${res.status})` }, 502);
  return json({ ok: true, delivered: true });
}

export default {
  fetch: handle
};