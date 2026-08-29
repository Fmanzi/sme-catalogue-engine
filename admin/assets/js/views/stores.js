/* ------------------------------------------------------------------ *
 *  views/stores.js — multi-store registry (super admin only).
 *  Lists every store plus a "create store" onboarding wizard.
 * ------------------------------------------------------------------ */

'use strict';

(function (global) {

  const UI = global.AdminUI;
  const esc = UI.esc;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.from((r || document).querySelectorAll(s)); }

  const api = () => global.AnonAPI && global.AnonAPI.api;
  const apiConnected = () => { const a = api(); return !!(a && a.base); };

  async function listStores(root) {
    if (!apiConnected()) return null;
    return await api().request('GET', '/api/clients')
      .catch(err => { UI.toast('Could not load stores: ' + err.message, 'err'); return []; });
  }

  AdminApp.register('stores', function (root) {
    listStores(root).then(stores => {
      const offline = `
        <div class="pane-empty">
          <ion-icon name="cloud-offline-outline" style="font-size:34px;opacity:.5"></ion-icon>
          <p>Stores are managed through the live API.</p>
          <p class="hint-inline">You're in <b>demo mode</b> or the API isn't reachable. Start it with <span class="mono">npm run api</span>, then sign in as a platform super admin — your store will appear here (e.g. <span class="mono">meridian</span>).</p>
        </div>`;
      root.innerHTML = `
        <div class="toolbar">
          <div class="tb-hint">Stores you can manage. New stores get their own catalogue, staff and live site.</div>
          <div class="spacer"></div>
          <a href="#/stores/new" class="btn-admin btn-primary"><ion-icon name="add-outline"></ion-icon> New store</a>
        </div>
        <div class="card">
          ${stores === null ? offline : stores.length ? `
          <div class="table-wrap">
            <table class="admin-table">
              <thead><tr><th>Store</th><th>Slug</th><th>Products</th><th>Staff</th><th>Currency</th><th></th></tr></thead>
              <tbody>${stores.map(s => `
                <tr>
                  <td><div class="prod-cell"><div><div class="pc-name">${esc(s.name)}</div><div class="pc-meta">${esc(s.domain || 'no domain set')}</div></div></div></td>
                  <td class="mono">${esc(s.id)}</td>
                  <td>${s.productCount}</td>
                  <td>${s.adminCount}</td>
                  <td>${esc(s.currency)}</td>
                  <td class="ta-r"><button class="btn-admin btn-ghost btn-sm" data-signin="${esc(s.id)}"><ion-icon name="log-in-outline"></ion-icon> Sign in</button></td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
          <p class="hint-inline">Merchants sign in at <span class="mono">/admin/login.html</span> and enter their store slug.</p>
          ` : `<p class="pane-empty">No stores yet. Create your first one.</p>`}
        </div>`;

      $$('[data-signin]', root).forEach(b => b.addEventListener('click', () => {
        const slug = b.getAttribute('data-signin');
        try { sessionStorage.setItem('anon.signin_store', slug); } catch (e) {}
        UI.toast(`Sign-in page will default to store "${slug}".`);
        global.location.href = 'login.html';
      }));
    });
  });

  AdminApp.register('store-form', function (root) {
    root.innerHTML = `
      <div class="toolbar">
        <a href="#/stores" class="btn-admin btn-ghost"><ion-icon name="arrow-back-outline"></ion-icon> All stores</a>
        <div class="spacer"></div>
      </div>

      <div class="card">
        <h2 class="card-title">Create a new store</h2>
        <p class="hint-inline">Each store is fully separate: own catalogue, own staff logins, own live site. Your store opens a stock-empty catalogue — import products with <b>Products → Import CSV</b>.</p>

        <form data-store-form class="form-grid">
          <div class="field">
            <label>Store slug</label>
            <input type="text" name="id" placeholder="e.g. acme" required pattern="[a-z0-9-]{2,30}" title="2–30 chars: lowercase letters, numbers, hyphens">
            <p class="hint-inline">Used in URLs and the sign-in box. Cannot be changed later.</p>
          </div>
          <div class="field">
            <label>Store name</label>
            <input type="text" name="name" placeholder="e.g. Acme Home Goods" required>
          </div>
          <div class="field">
            <label>Currency</label>
            <select name="currency">
              <option value="KES">KES — Kenyan Shilling</option>
              <option value="UGX">UGX — Ugandan Shilling</option>
              <option value="TZS">TZS — Tanzanian Shilling</option>
              <option value="NGN">NGN — Nigerian Naira</option>
              <option value="USD">USD — US Dollar</option>
            </select>
          </div>
          <div class="field">
            <label>Owner name</label>
            <input type="text" name="adminName" placeholder="Store owner / super admin">
          </div>
          <div class="field">
            <label>Owner email</label>
            <input type="email" name="adminEmail" placeholder="owner@acme.co.ke">
          </div>
          <div class="field">
            <label>Owner password</label>
            <input type="password" name="adminPassword" placeholder="Min 6 characters" minlength="6">
          </div>
          <div class="field">
            <label>Owner role</label>
            <select name="role">
              <option value="store_manager">Store manager — full control of this store only</option>
              <option value="super_admin">Super admin — can manage every store &amp; platform</option>
            </select>
            <p class="hint-inline">Choose <b>Store manager</b> unless this is a platform administrator.</p>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn-admin btn-primary"><ion-icon name="storefront-outline"></ion-icon> Create store</button>
          </div>
        </form>
        <p class="form-error" data-store-error></p>
      </div>`;

    $('[data-store-form]', root).addEventListener('submit', async function (e) {
      e.preventDefault();
      const errEl = $('[data-store-error]', root);
      errEl.textContent = '';
      const fd = new FormData(this);
      const payload = {
        id: String(fd.get('id') || '').trim(),
        name: String(fd.get('name') || '').trim(),
        currency: fd.get('currency') || 'KES',
        adminName: String(fd.get('adminName') || '').trim() || null,
        adminEmail: String(fd.get('adminEmail') || '').trim() || null,
        adminPassword: String(fd.get('adminPassword') || '') || null,
        role: fd.get('role') || 'store_manager'
      };
      if (!payload.name) { errEl.textContent = 'Store name is required.'; return; }
      if (payload.adminEmail && !payload.adminPassword) { errEl.textContent = 'Password is required when creating an owner account.'; return; }

      try {
        await api().request('POST', '/api/clients', payload);
        UI.toast('Store created.');
        global.location.hash = '#/stores';
      } catch (e) { errEl.textContent = e.message; }
    });
  });

})(typeof window !== 'undefined' ? window : globalThis);