/* ------------------------------------------------------------------ *
 *  views/dashboard.js
 *  Overview stats, revenue chart, order status, top products,
 *  recent orders and stock alerts.
 * ------------------------------------------------------------------ */

'use strict';

(function (global) {

  const Store = global.AnonStore;
  const UI = global.AdminUI;
  const esc = UI.esc;
  function $(s, r) { return (r || document).querySelector(s); }

  const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString();
  const inRange = (iso, from, to) => iso && iso >= from && iso <= to;

  function statCards() {
    const orders = Store.list('orders');
    const customers = Store.list('customers');
    const now = new Date().toISOString();
    const d30 = daysAgo(30);

    const rev30 = orders.filter(o => inRange(o.createdAt, d30, now)).reduce((s, o) => s + o.total, 0);
    const orders30 = orders.filter(o => inRange(o.createdAt, d30, now)).length;
    const cust30 = customers.filter(c => inRange(c.createdAt, d30, now)).length;
    const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
    const aov = orders.length ? totalRevenue / orders.length : 0;
    const pending = orders.filter(o => o.status === 'pending' || o.fulfillmentStatus === 'unfulfilled').length;
    const products = Store.products();
    const outOfStock = products.filter(p => p.stockStatus === 'out_of_stock').length;
    const lowStock = products.filter(p => p.stockStatus === 'low_stock').length;

    return [
      { label: 'Revenue (30d)', value: UI.money(rev30), icon: 'cash-outline', cls: 'gold', sub: `All time ${UI.money(totalRevenue)}`, subCls: '' },
      { label: 'Orders (30d)', value: String(orders30), icon: 'receipt-outline', cls: 'blue', sub: `${orders.length} lifetime orders`, subCls: '' },
      { label: 'Avg order value', value: UI.money(aov), icon: 'calculator-outline', cls: 'amber', sub: `${pending} awaiting fulfilment`, subCls: 'down' },
      { label: 'New customers (30d)', value: String(cust30), icon: 'person-add-outline', cls: 'green', sub: `${customers.length} total customers`, subCls: '' },
      { label: 'Products', value: String(products.length), icon: 'watch-outline', cls: 'blue', sub: `${products.length - outOfStock - lowStock} in stock`, subCls: '' },
      { label: 'Low stock alerts', value: String(lowStock + outOfStock), icon: 'alert-circle-outline', cls: 'red', sub: `${outOfStock} out of stock`, subCls: 'down' }
    ];
  }

  function weeklyRevenue() {
    const orders = Store.list('orders');
    const buckets = [];
    const now = Date.now();
    for (let i = 7; i >= 0; i--) {
      const from = now - (i + 1) * 7 * 864e5;
      const to = now - i * 7 * 864e5;
      const val = orders.filter(o => inRange(o.createdAt, new Date(from).toISOString(), new Date(to).toISOString())).reduce((s, o) => s + o.total, 0);
      buckets.push({ label: i === 0 ? 'This wk' : `-${i}w`, value: Math.round(val) });
    }
    return buckets;
  }

  function statusDonut() {
    const orders = Store.list('orders');
    const counts = {};
    orders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });
    return Object.keys(counts).map(k => ({ label: k.replace(/_/g, ' '), value: counts[k] }));
  }

  function topProducts() {
    return Store.products().slice().sort((a, b) => b.soldCount - a.soldCount).slice(0, 8);
  }

  AdminApp.register('dashboard', function (root) {
    root.innerHTML = `
      <div class="stat-grid">${statCards().map(s => `
        <div class="stat-card">
          <div class="stat-icon ${s.cls}"><ion-icon name="${s.icon}"></ion-icon></div>
          <div><div class="stat-value">${s.value}</div>
          <div class="stat-label">${s.label}</div>
          <div class="stat-sub ${s.subCls}">${s.sub}</div></div>
        </div>`).join('')}
      </div>

      <div class="grid-2 mb-20">
        <div class="card">
          <div class="card-title">Revenue <small>last 8 weeks · ${UI.money(weeklyRevenue().reduce((s, w) => s + w.value, 0))} total</small></div>
          <div id="rev-chart"></div>
        </div>
        <div class="card">
          <div class="card-title">Orders by status</div>
          <div id="status-chart"></div>
        </div>
      </div>

      <div class="card mb-20">
        <div class="card-title">Top sellers <small>by units sold</small>
          <a href="#/products" class="btn-admin btn-ghost btn-sm">Manage products</a>
        </div>
        <div class="table-wrap">
          <table class="admin-table">
            <thead><tr><th>Product</th><th>SKU</th><th>Price</th><th>Sold</th><th>Stock</th><th>Status</th></tr></thead>
            <tbody>${topProducts().map(p => `
              <tr>
                <td><div class="prod-cell"><img src="${UI.img(p.mainImage)}" alt=""><div><div class="pc-name">${esc(p.name)}</div><div class="pc-meta">${esc((p.brand || {}).name || '')}</div></div></div></td>
                <td class="mono">${esc(p.sku)}</td>
                <td>${UI.money(p.salePrice || p.price)}</td>
                <td>${p.soldCount}</td>
                <td>${p.stockQuantity}</td>
                <td>${UI.badge(p.stockStatus)}</td>
              </tr>`).join('')}</tbody>
          </table>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-title">Recent orders <small>latest activity</small>
            <a href="#/orders" class="btn-admin btn-ghost btn-sm">View all</a>
          </div>
          <div class="table-wrap">
            <table class="admin-table">
              <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead>
              <tbody>${Store.list('orders').slice(0, 6).map(o => `
                <tr>
                  <td><a href="#/orders/${encodeURIComponent(o.id)}" class="cell-strong">${esc(o.orderNumber)}</a><div class="cell-sub">${UI.fmtDate(o.createdAt)}</div></td>
                  <td>${esc(o.customerName)}</td>
                  <td>${UI.money(o.total)}</td>
                  <td>${UI.badge(o.status)}</td>
                </tr>`).join('')}</tbody>
            </table>
          </div>
        </div>
        <div class="card">
          <div class="card-title">Stock alerts</div>
          ${(() => {
            const low = Store.products().filter(p => p.stockStatus === 'low_stock' || p.stockStatus === 'out_of_stock');
            if (!low.length) return UI.empty('checkmark-circle-outline', 'All products are sufficiently stocked.');
            return `<div class="table-wrap"><table class="admin-table">
              <thead><tr><th>Product</th><th>Stock</th><th>Status</th><th></th></tr></thead>
              <tbody>${low.slice(0, 8).map(p => `<tr>
                <td><div class="prod-cell"><img src="${UI.img(p.mainImage)}" alt=""><div class="pc-name">${esc(p.name)}</div></div></td>
                <td>${p.stockQuantity}</td>
                <td>${UI.badge(p.stockStatus)}</td>
                <td><a href="#/products/${encodeURIComponent(p.id)}" class="btn-admin btn-ghost btn-sm">Restock</a></td>
              </tr>`).join('')}</tbody></table></div>
              <div class="mt-12"><a href="#/inventory" class="btn-admin btn-secondary btn-sm">Open inventory</a></div>`;
          })()}
        </div>
      </div>`;

    requestAnimationFrame(() => {
      UI.lineChart($('#rev-chart', root), weeklyRevenue());
      UI.donutChart($('#status-chart', root), statusDonut(), { centerLabel: Store.list('orders').length });
    });

    /* ---------- live site · publish panel ---------- */

    const apiUp = global.AnonAPI && global.AnonAPI.api && global.AnonAPI.api.base ? global.AnonAPI : null;
    const pubBusy = ['building', 'pushing', 'deploying', 'queued'].join(' ');

    function pubHuman(state) {
      return {
        idle: 'Ready — saves publish automatically',
        queued: 'Queued…',
        building: 'Rebuilding store bundle…',
        pushing: 'Pushing to repo…',
        deploying: 'Deploying to Cloudflare Pages…',
        live: 'Live',
        error: 'Needs attention'
      }[state] || state;
    }

    function pubCardHTML(st) {
      const last = st.lastEnd ? UI.fmtDateTime(st.lastEnd) : 'Never published yet';
      const tip = st.pushSkipped
        ? 'Git auto-push is off (no GIT_PAT token set) — changes are saved locally.'
        : 'Every save rebuilds and deploys the live store automatically.';
      const badge = st.state === 'live' ? UI.badge('live')
        : st.state === 'error' ? UI.badge('ERROR')
        : `<span class="pub-pulse"></span><span class="pub-badge">${esc(pubHuman(st.state))}</span>`;
      return `
        <div class="card mb-20">
          <div class="card-title">Live site <small>your published storefront</small> ${badge}</div>
          <div class="kv"><span class="k">Status</span><span class="v" data-pub-state>${esc(pubHuman(st.state))}</span></div>
          <div class="kv"><span class="k">Last published</span><span class="v" data-pub-last>${esc(last)}</span></div>
          ${st.lastError ? `<div class="kv"><span class="k">Last error</span><span class="v pub-error">${esc(st.lastError)}</span></div>` : ''}
          ${st.lastDeployStatus ? `<div class="kv"><span class="k">Deploy hook</span><span class="v">HTTP ${st.lastDeployStatus}</span></div>` : ''}
          <p class="hint" style="margin-bottom:10px">${esc(tip)}</p>
          <button class="btn-admin btn-primary btn-sm" data-pub-now ${pubBusy.includes(st.state) ? 'disabled' : ''}>
            <ion-icon name="cloud-upload-outline"></ion-icon> ${pubBusy.includes(st.state) ? 'Publishing…' : 'Publish now'}
          </button>
        </div>`;
    }

    const pubCard = document.createElement('div');
    pubCard.className = 'mb-20';
    pubCard.id = 'publish-card';
    root.insertBefore(pubCard, root.querySelector('.stat-grid').nextSibling);

    if (!apiUp) {
      pubCard.innerHTML = `
        <div class="card mb-20">
          <div class="card-title">Live site <small>publishing</small></div>
          <p class="hint">Run the store server (<span class="mono">npm run api</span>) to publish changes to your live store through the free GitHub + Cloudflare pipeline.</p>
        </div>`;
    } else {
      let pollTimer = null;
      async function refreshPub() {
        try {
          const st = await apiUp.publishStatus();
          pubCard.innerHTML = pubCardHTML(st);
          const btn = $('[data-pub-now]', pubCard);
          if (btn) btn.addEventListener('click', async () => {
            try {
              await apiUp.publishNow();
              UI.toast('Publish started — your store is rebuilding.', 'neutral');
              refreshPub();
            } catch (err) {
              UI.toast(err.message || 'Could not start publish.', 'error');
            }
          });
          if (pubBusy.includes(st.state)) {
            const body = document.body;
            if (pollTimer) clearTimeout(pollTimer);
            pollTimer = setTimeout(refreshPub, 3000);
          }
        } catch (err) {
          pubCard.innerHTML = `<div class="card mb-20"><div class="card-title">Live site</div><p class="hint">Could not read publish status: ${esc(err.message || 'network error')}</p></div>`;
        }
      }
      refreshPub();
    }
  });

})(typeof window !== 'undefined' ? window : globalThis);
