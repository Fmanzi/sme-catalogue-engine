/* ------------------------------------------------------------------ *
 *  views/reports.js — analytics: revenue trend, category split,
 *  top products, exports.
 * ------------------------------------------------------------------ */

'use strict';

(function (global) {

  const Store = global.AnonStore;
  const UI = global.AdminUI;
  const esc = UI.esc;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString();
  const inRange = (iso, from, to) => iso && iso >= from && iso <= to;

  AdminApp.register('reports', function (root) {
    const orders = Store.list('orders');
    const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
    const totalOrders = orders.length;
    const d30 = daysAgo(30);
    const rev30 = orders.filter(o => inRange(o.createdAt, d30, new Date().toISOString())).reduce((s, o) => s + o.total, 0);
    const aov = totalOrders ? totalRevenue / totalOrders : 0;
    const conversionNote = 'demo';

    /* monthly revenue (last 6 months) */
    const monthly = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = d.toISOString();
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1).toISOString();
      const val = orders.filter(o => inRange(o.createdAt, start, end)).reduce((s, o) => s + o.total, 0);
      monthly.push({ label: months[d.getMonth()] + " '" + String(d.getFullYear()).slice(2), value: Math.round(val) });
    }

    /* sales by category */
    const catTotals = {};
    orders.forEach(o => o.items.forEach(i => {
      const p = Store.get('products', i.productId);
      const catId = p ? p.categoryId : '__none';
      catTotals[catId] = (catTotals[catId] || 0) + i.total;
    }));
    const byCategory = Object.keys(catTotals).map(k => ({
      label: (Store.get('categories', k) || { name: 'Uncategorised' }).name,
      value: Math.round(catTotals[k])
    })).sort((a, b) => b.value - a.value).slice(0, 8);

    /* order status donut */
    const statusCounts = {};
    orders.forEach(o => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });
    const byStatus = Object.keys(statusCounts).map(k => ({ label: k.replace(/_/g, ' '), value: statusCounts[k] }));

    /* top products */
    const top = Store.products().slice().sort((a, b) => b.soldCount - a.soldCount).slice(0, 10);

    root.innerHTML = `
      <div class="stat-grid mb-20">
        <div class="stat-card"><div class="stat-icon gold"><ion-icon name="cash-outline"></ion-icon></div><div><div class="stat-value">${UI.money(totalRevenue)}</div><div class="stat-label">Total revenue</div></div></div>
        <div class="stat-card"><div class="stat-icon blue"><ion-icon name="receipt-outline"></ion-icon></div><div><div class="stat-value">${totalOrders}</div><div class="stat-label">Total orders</div></div></div>
        <div class="stat-card"><div class="stat-icon green"><ion-icon name="trending-up-outline"></ion-icon></div><div><div class="stat-value">${UI.money(rev30)}</div><div class="stat-label">Revenue (30d)</div></div></div>
        <div class="stat-card"><div class="stat-icon amber"><ion-icon name="calculator-outline"></ion-icon></div><div><div class="stat-value">${UI.money(aov)}</div><div class="stat-label">Avg order value</div></div></div>
      </div>

      <div class="grid-2 mb-20">
        <div class="card">
          <div class="card-title">Revenue by month <small>last 6 months</small></div>
          <div id="month-chart"></div>
        </div>
        <div class="card">
          <div class="card-title">Orders by status</div>
          <div id="status-chart"></div>
        </div>
      </div>

      <div class="card mb-20">
        <div class="card-title">Revenue by category</div>
        <div id="cat-chart"></div>
      </div>

      <div class="card mb-20">
        <div class="card-title">Top products <small>by units sold</small>
          <button class="btn-admin btn-ghost btn-sm" data-rep-export>Export orders CSV</button>
        </div>
        <div class="table-wrap"><table class="admin-table">
          <thead><tr><th>Product</th><th>SKU</th><th>Price</th><th>Units sold</th><th>Est. revenue</th><th>Stock</th></tr></thead>
          <tbody>${top.map(p => `
            <tr>
              <td><div class="prod-cell"><img src="${UI.img(p.mainImage)}" alt=""><div><div class="pc-name">${esc(p.name)}</div><div class="pc-meta">${esc((p.brand || {}).name || '')}</div></div></div></td>
              <td class="mono">${esc(p.sku)}</td>
              <td>${UI.money(p.salePrice || p.price)}</td>
              <td>${p.soldCount}</td>
              <td>${UI.money((p.salePrice || p.price) * p.soldCount)}</td>
              <td>${UI.badge(p.stockStatus)}</td>
            </tr>`).join('')}</tbody>
        </table></div>
      </div>

      <div class="card">
        <div class="card-title">Notes</div>
        <p class="muted" style="font-size:12.5px">
          Reports are generated from the local demo dataset (${totalOrders} orders, ${Store.products().length} products, ${Store.count('customers')} customers).
          Revenue figures use order totals including tax and shipping. Conversion and channel analytics will be available once the store is connected to a backend. (${conversionNote})
        </p>
      </div>`;

    requestAnimationFrame(() => {
      UI.lineChart($('#month-chart', root), monthly);
      UI.donutChart($('#status-chart', root), byStatus, { centerLabel: totalOrders });
      UI.barChart($('#cat-chart', root), byCategory);
    });

    $('[data-rep-export]', root).addEventListener('click', () => {
      UI.downloadCSV('meridian-revenue-report.csv', [['Metric', 'Value']]
        .concat([['Total revenue', totalRevenue], ['Total orders', totalOrders], ['Revenue (30d)', rev30], ['Avg order value', aov], ['Products', Store.products().length], ['Customers', Store.count('customers')]]));
      UI.toast('Report exported.');
    });
  });

  function $(s, r) { return (r || document).querySelector(s); }

})(typeof window !== 'undefined' ? window : globalThis);
