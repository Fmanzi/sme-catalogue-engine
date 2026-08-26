/* ------------------------------------------------------------------ *
 *  views/customers.js — customer list and detail with order history.
 * ------------------------------------------------------------------ */

'use strict';

(function (global) {

  const Store = global.AnonStore;
  const UI = global.AdminUI;
  const esc = UI.esc;

  function spend(id) { return Store.list('orders').filter(o => o.customerId === id).reduce((s, o) => s + o.total, 0); }
  function orderCount(id) { return Store.list('orders').filter(o => o.customerId === id).length; }

  const listState = { q: '', status: '', page: 1 };

  function filtered() {
    let list = Store.list('customers');
    const q = listState.q.toLowerCase();
    if (q) list = list.filter(c => (c.firstName + ' ' + c.lastName + ' ' + c.email).toLowerCase().includes(q));
    if (listState.status) list = list.filter(c => c.status === listState.status);
    return list;
  }

  AdminApp.register('customers', function (root, ctx) {
    const perPage = 15;
    const all = filtered();
    const pages = Math.max(1, Math.ceil(all.length / perPage));
    const page = Math.min(listState.page, pages);
    const slice = all.slice((page - 1) * perPage, page * perPage);

    root.innerHTML = `
      <div class="toolbar">
        <input type="search" placeholder="Search name or email…" value="${esc(listState.q)}" data-cus-search>
        <select data-cus-status>
          <option value="">All statuses</option>
          ${['active', 'disabled'].map(s => `<option value="${s}" ${listState.status === s ? 'selected' : ''}>${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}
        </select>
        <div class="spacer"></div>
        <button class="btn-admin btn-ghost" data-cus-export><ion-icon name="download-outline"></ion-icon> Export CSV</button>
      </div>
      <div class="card">
        ${all.length ? `
        <div class="table-wrap"><table class="admin-table">
          <thead><tr><th>Customer</th><th>Orders</th><th>Total spent</th><th>Joined</th><th>Status</th><th></th></tr></thead>
          <tbody>${slice.map(c => `
            <tr>
              <td><div class="prod-cell"><div class="avatar" style="width:36px;height:36px;font-size:12px">${UI.initials(c.firstName + ' ' + c.lastName)}</div><div><div class="pc-name">${esc(c.firstName + ' ' + c.lastName)}</div><div class="pc-meta">${esc(c.email)}</div></div></div></td>
              <td>${orderCount(c.id)}</td>
              <td class="cell-strong">${UI.money(spend(c.id))}</td>
              <td>${UI.fmtDate(c.createdAt)}</td>
              <td>${UI.badge(c.status)}</td>
              <td><a href="#/customers/${encodeURIComponent(c.id)}" class="btn-admin btn-ghost btn-sm">View</a></td>
            </tr>`).join('')}</tbody>
        </table></div>
        <div class="pagination" data-cus-pagination></div>`
        : UI.empty('people-outline', 'No customers match your filters.')}
      </div>`;

    const search = $('[data-cus-search]', root);
    const statusSel = $('[data-cus-status]', root);
    if (search) search.addEventListener('input', () => { listState.q = search.value; clearTimeout(search._t); search._t = setTimeout(() => { listState.page = 1; ctx.refresh(); }, 250); });
    if (statusSel) statusSel.addEventListener('change', () => { listState.status = statusSel.value; listState.page = 1; ctx.refresh(); });
    UI.pagination($('[data-cus-pagination]', root), page, pages, p => { listState.page = p; ctx.refresh(); });

    $('[data-cus-export]', root).addEventListener('click', () => {
      UI.downloadCSV('meridian-customers.csv', [['Name', 'Email', 'Phone', 'Orders', 'Total spent', 'Joined', 'Status']]
        .concat(all.map(c => [c.firstName + ' ' + c.lastName, c.email, c.phone, orderCount(c.id), spend(c.id), c.createdAt, c.status])));
      UI.toast('CSV exported.');
    });
  });

  /* ---------------- customer detail ---------------- */

  AdminApp.register('customer-detail', function (root, ctx) {
    const cust = Store.get('customers', ctx.params.id);
    if (!cust) {
      root.innerHTML = UI.empty('alert-circle-outline', 'Customer not found.', `<a href="#/customers" class="btn-admin btn-secondary">Back to customers</a>`);
      return;
    }
    const orders = Store.list('orders').filter(o => o.customerId === cust.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const total = orders.reduce((s, o) => s + o.total, 0);
    const aov = orders.length ? total / orders.length : 0;

    root.innerHTML = `
      <div class="flex-between mb-12">
        <div>
          <a href="#/customers" class="btn-admin btn-ghost btn-sm"><ion-icon name="arrow-back-outline"></ion-icon> All customers</a>
          <div class="flex mt-12" style="gap:12px;align-items:center">
            <div class="avatar" style="width:46px;height:46px;font-size:16px">${UI.initials(cust.firstName + ' ' + cust.lastName)}</div>
            <div><h2 style="font-family:var(--serif)">${esc(cust.firstName + ' ' + cust.lastName)} ${UI.badge(cust.status)}</h2>
            <p class="muted" style="font-size:12.5px">${esc(cust.email)} · joined ${UI.fmtDate(cust.createdAt)}</p></div>
          </div>
        </div>
        <button class="btn-admin btn-ghost btn-sm" data-toggle-status>${cust.status === 'active' ? 'Disable account' : 'Enable account'}</button>
      </div>

      <div class="stat-grid mb-20">
        <div class="stat-card"><div class="stat-icon gold"><ion-icon name="receipt-outline"></ion-icon></div><div><div class="stat-value">${orders.length}</div><div class="stat-label">Orders</div></div></div>
        <div class="stat-card"><div class="stat-icon green"><ion-icon name="cash-outline"></ion-icon></div><div><div class="stat-value">${UI.money(total)}</div><div class="stat-label">Total spent</div></div></div>
        <div class="stat-card"><div class="stat-icon blue"><ion-icon name="calculator-outline"></ion-icon></div><div><div class="stat-value">${UI.money(aov)}</div><div class="stat-label">Avg order value</div></div></div>
        <div class="stat-card"><div class="stat-icon amber"><ion-icon name="heart-outline"></ion-icon></div><div><div class="stat-value">${(cust.wishlist || []).length}</div><div class="stat-label">Wishlist items</div></div></div>
      </div>

      <div class="detail-grid">
        <div class="card">
          <div class="card-title">Order history <small>${orders.length} order(s)</small></div>
          ${orders.length ? `<div class="table-wrap"><table class="admin-table">
            <thead><tr><th>Order</th><th>Date</th><th>Total</th><th>Status</th><th></th></tr></thead>
            <tbody>${orders.map(o => `
              <tr>
                <td><a href="#/orders/${encodeURIComponent(o.id)}" class="cell-strong">${esc(o.orderNumber)}</a></td>
                <td>${UI.fmtDate(o.createdAt)}</td>
                <td>${UI.money(o.total)}</td>
                <td>${UI.badge(o.status)}</td>
                <td><a href="#/orders/${encodeURIComponent(o.id)}" class="btn-admin btn-ghost btn-sm">View</a></td>
              </tr>`).join('')}</tbody>
          </table></div>` : UI.empty('receipt-outline', 'No orders yet.')}
        </div>
        <div>
          <div class="card mb-20">
            <div class="card-title">Addresses</div>
            ${(cust.addresses || []).length ? cust.addresses.map(a => `
              <div style="font-size:13px;line-height:1.7;color:var(--text-soft);border:1px solid var(--line);border-radius:6px;padding:12px;margin-bottom:10px">
                <div style="display:flex;justify-content:space-between;gap:10px"><b style="color:var(--text)">${esc(a.label || 'Address')}</b>${a.isDefault ? UI.badge('active', 'Default') : ''}</div>
                ${esc(a.line1)}<br>${a.line2 ? esc(a.line2) + '<br>' : ''}${esc(a.city)}${a.postalCode ? ', ' + esc(a.postalCode) : ''}<br>${esc(a.country || '')}<br>${esc(a.phone || '')}
              </div>`).join('') : UI.empty('location-outline', 'No saved addresses.')}
          </div>
          <div class="card">
            <div class="card-title">Contact</div>
            <div class="kv"><span class="k">Email</span><span class="v">${esc(cust.email)}</span></div>
            <div class="kv"><span class="k">Phone</span><span class="v">${esc(cust.phone || '—')}</span></div>
            <div class="kv"><span class="k">Notes</span><span class="v">${esc(cust.notes || '—')}</span></div>
          </div>
        </div>
      </div>`;

    $('[data-toggle-status]', root).addEventListener('click', () => {
      const next = cust.status === 'active' ? 'disabled' : 'active';
      Store.update('customers', cust.id, { status: next });
      UI.toast(next === 'disabled' ? 'Account disabled.' : 'Account enabled.');
      ctx.refresh();
    });
  });

  function $(s, r) { return (r || document).querySelector(s); }

})(typeof window !== 'undefined' ? window : globalThis);
