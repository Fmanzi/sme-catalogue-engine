/* ------------------------------------------------------------------ *
 *  views/orders.js — order list with filters and full order detail
 *  with status management + timeline.
 * ------------------------------------------------------------------ */

'use strict';

(function (global) {

  const Store = global.AnonStore;
  const UI = global.AdminUI;
  const esc = UI.esc;

  const listState = { q: '', status: '', payment: '', page: 1 };

  const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
  const PAYMENT_STATUSES = ['unpaid', 'paid', 'refunded', 'failed'];
  const FULFILLMENT_STATUSES = ['unfulfilled', 'partially_fulfilled', 'fulfilled'];

  function filtered() {
    let list = Store.list('orders');
    const q = listState.q.toLowerCase();
    if (q) list = list.filter(o => (o.orderNumber + ' ' + o.customerName + ' ' + o.customerEmail).toLowerCase().includes(q));
    if (listState.status) list = list.filter(o => o.status === listState.status);
    if (listState.payment) list = list.filter(o => o.paymentStatus === listState.payment);
    return list;
  }

  AdminApp.register('orders', function (root, ctx) {
    const perPage = 15;
    const all = filtered();
    const pages = Math.max(1, Math.ceil(all.length / perPage));
    const page = Math.min(listState.page, pages);
    const slice = all.slice((page - 1) * perPage, page * perPage);

    root.innerHTML = `
      <div class="toolbar">
        <input type="search" placeholder="Search order #, customer, email…" value="${esc(listState.q)}" data-ord-search>
        <select data-ord-status>
          <option value="">All statuses</option>
          ${ORDER_STATUSES.map(s => `<option value="${s}" ${listState.status === s ? 'selected' : ''}>${s[0].toUpperCase() + s.slice(1).replace(/_/g, ' ')}</option>`).join('')}
        </select>
        <select data-ord-payment>
          <option value="">All payments</option>
          ${PAYMENT_STATUSES.map(s => `<option value="${s}" ${listState.payment === s ? 'selected' : ''}>${s[0].toUpperCase() + s.slice(1).replace(/_/g, ' ')}</option>`).join('')}
        </select>
        <div class="spacer"></div>
        <button class="btn-admin btn-ghost" data-ord-export><ion-icon name="download-outline"></ion-icon> Export CSV</button>
      </div>
      <div class="card">
        ${all.length ? `
        <div class="table-wrap"><table class="admin-table">
          <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th></th></tr></thead>
          <tbody>${slice.map(o => `
            <tr>
              <td><a href="#/orders/${encodeURIComponent(o.id)}" class="cell-strong">${esc(o.orderNumber)}</a></td>
              <td><div class="cell-strong">${esc(o.customerName)}</div><div class="cell-sub">${esc(o.customerEmail)}</div></td>
              <td>${UI.fmtDate(o.createdAt)}</td>
              <td>${o.items.reduce((s, i) => s + i.quantity, 0)}</td>
              <td class="cell-strong">${UI.money(o.total)}</td>
              <td>${UI.badge(o.paymentStatus)}</td>
              <td>${UI.badge(o.status)}</td>
              <td><a href="#/orders/${encodeURIComponent(o.id)}" class="btn-admin btn-ghost btn-sm">View</a></td>
            </tr>`).join('')}</tbody>
        </table></div>
        <div class="pagination" data-ord-pagination></div>`
        : UI.empty('receipt-outline', 'No orders match your filters.')}
      </div>`;

    const search = $('[data-ord-search]', root);
    const statusSel = $('[data-ord-status]', root);
    const paySel = $('[data-ord-payment]', root);
    const apply = () => { listState.page = 1; ctx.refresh(); };
    if (search) search.addEventListener('input', () => { listState.q = search.value; clearTimeout(apply._t); apply._t = setTimeout(() => { listState.page = 1; ctx.refresh(); }, 250); });
    if (statusSel) statusSel.addEventListener('change', () => { listState.status = statusSel.value; apply(); });
    if (paySel) paySel.addEventListener('change', () => { listState.payment = paySel.value; apply(); });
    UI.pagination($('[data-ord-pagination]', root), page, pages, p => { listState.page = p; ctx.refresh(); });

    $('[data-ord-export]', root).addEventListener('click', () => {
      UI.downloadCSV('meridian-orders.csv', [['Order', 'Customer', 'Email', 'Date', 'Items', 'Subtotal', 'Discount', 'Shipping', 'Tax', 'Total', 'Status', 'Payment']]
        .concat(all.map(o => [o.orderNumber, o.customerName, o.customerEmail, o.createdAt, o.items.reduce((s, i) => s + i.quantity, 0), o.subtotal, o.discount, o.shipping, o.tax, o.total, o.status, o.paymentStatus])));
      UI.toast('CSV exported.');
    });
  });

  /* ---------------- order detail ---------------- */

  AdminApp.register('order-detail', function (root, ctx) {
    const order = Store.get('orders', ctx.params.id);
    if (!order) {
      root.innerHTML = UI.empty('alert-circle-outline', 'Order not found.', `<a href="#/orders" class="btn-admin btn-secondary">Back to orders</a>`);
      return;
    }

    const addr = order.shippingAddress || {};
    const totalQty = order.items.reduce((s, i) => s + i.quantity, 0);

    root.innerHTML = `
      <div class="flex-between mb-12">
        <div>
          <a href="#/orders" class="btn-admin btn-ghost btn-sm"><ion-icon name="arrow-back-outline"></ion-icon> All orders</a>
          <h2 style="font-family:var(--serif);margin-top:10px">Order ${esc(order.orderNumber)} ${UI.badge(order.status)} ${UI.badge(order.paymentStatus)}</h2>
          <p class="muted" style="font-size:12.5px">Placed ${UI.fmtDateTime(order.createdAt)} · ${totalQty} item(s)</p>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn-admin btn-secondary btn-sm" data-print-order><ion-icon name="print-outline"></ion-icon> Print</button>
          <button class="btn-admin btn-danger btn-sm" data-cancel-order ${order.status === 'cancelled' || order.status === 'delivered' ? 'disabled' : ''}><ion-icon name="close-outline"></ion-icon> Cancel order</button>
        </div>
      </div>

      <div class="detail-grid mb-20">
        <div class="card">
          <div class="card-title">Items</div>
          <div class="table-wrap"><table class="admin-table">
            <thead><tr><th>Product</th><th>Price</th><th>Qty</th><th>Total</th></tr></thead>
            <tbody>${order.items.map(i => `
              <tr>
                <td><div class="prod-cell"><img src="${UI.img(i.image)}" alt=""><div><div class="pc-name">${esc(i.name)}</div><div class="pc-meta">${esc(i.sku)}</div></div></div></td>
                <td>${UI.money(i.price)}</td>
                <td>${i.quantity}</td>
                <td class="cell-strong">${UI.money(i.total)}</td>
              </tr>`).join('')}</tbody>
          </table></div>
          <div class="divider"></div>
          <div style="max-width:320px;margin-left:auto">
            <div class="kv"><span class="k">Subtotal</span><span>${UI.money(order.subtotal)}</span></div>
            ${order.discount ? `<div class="kv"><span class="k">Discount${order.couponCode ? ' (' + esc(order.couponCode) + ')' : ''}</span><span style="color:var(--green)">− ${UI.money(order.discount)}</span></div>` : ''}
            <div class="kv"><span class="k">Shipping</span><span>${order.shipping === 0 ? 'Free' : UI.money(order.shipping)}</span></div>
            <div class="kv"><span class="k">Tax</span><span>${UI.money(order.tax)}</span></div>
            <div class="kv"><span class="k"><b>Total</b></span><span><b>${UI.money(order.total)}</b></span></div>
            <div class="kv"><span class="k">Payment method</span><span>${esc(order.paymentMethod || '—')}</span></div>
          </div>
        </div>

        <div>
          <div class="card mb-20">
            <div class="card-title">Update status</div>
            <form data-status-form>
              <div class="field"><label>Order status</label><select name="status">
                ${ORDER_STATUSES.map(s => `<option value="${s}" ${order.status === s ? 'selected' : ''}>${s[0].toUpperCase() + s.slice(1).replace(/_/g, ' ')}</option>`).join('')}
              </select></div>
              <div class="field"><label>Payment status</label><select name="paymentStatus">
                ${PAYMENT_STATUSES.map(s => `<option value="${s}" ${order.paymentStatus === s ? 'selected' : ''}>${s[0].toUpperCase() + s.slice(1).replace(/_/g, ' ')}</option>`).join('')}
              </select></div>
              <div class="field"><label>Fulfilment</label><select name="fulfillmentStatus">
                ${FULFILLMENT_STATUSES.map(s => `<option value="${s}" ${order.fulfillmentStatus === s ? 'selected' : ''}>${s[0].toUpperCase().replace(/_/g, ' ') + s.slice(1).replace(/_/g, ' ')}</option>`).join('')}
              </select></div>
              <div class="field"><label>Internal note</label><input type="text" name="note" placeholder="Added to the order timeline"></div>
              <button type="submit" class="btn-admin btn-primary btn-block">Save status</button>
            </form>
          </div>

          <div class="card mb-20">
            <div class="card-title">Customer</div>
            <div class="kv"><span class="k">Name</span><span class="v">${esc(order.customerName)}</span></div>
            <div class="kv"><span class="k">Email</span><span class="v">${esc(order.customerEmail)}</span></div>
            <div class="kv"><span class="k">Phone</span><span class="v">${esc(addr.phone || '—')}</span></div>
            <div class="kv"><span class="k">Customer</span><span class="v">${order.customerId ? `<a href="#/customers/${encodeURIComponent(order.customerId)}">View profile</a>` : 'Guest'}</span></div>
          </div>

          <div class="card mb-20">
            <div class="card-title">Shipping</div>
            <p style="font-size:13px;line-height:1.7;color:var(--text-soft)">
              ${esc(addr.firstName + ' ' + addr.lastName)}<br>
              ${esc(addr.line1)}${addr.line2 ? '<br>' + esc(addr.line2) : ''}<br>
              ${esc(addr.city)}${addr.postalCode ? ', ' + esc(addr.postalCode) : ''}<br>
              ${esc(addr.country || '')}
            </p>
            <div class="divider"></div>
            <div class="kv"><span class="k">Method</span><span class="v">${esc(order.shippingMethod)}</span></div>
            <div class="kv"><span class="k">Shipping status</span><span class="v">${esc(order.shippingStatus || '—')}</span></div>
            ${order.notes ? `<div class="divider"></div><div class="kv"><span class="k">Notes</span><span class="v">${esc(order.notes)}</span></div>` : ''}
          </div>

          <div class="card">
            <div class="card-title">Timeline</div>
            <div class="timeline">${(order.timeline || []).slice().reverse().map(t => `
              <div class="timeline-item done">
                <div class="tl-label">${esc(t.label)}</div>
                <div class="tl-at">${UI.fmtDateTime(t.at)}</div>
                ${t.status ? `<div class="tl-status">${esc(t.status)}</div>` : ''}
              </div>`).join('')}
            </div>
          </div>
        </div>
      </div>`;

    const statusForm = $('[data-status-form]', root);
    statusForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(statusForm);
      const patch = { status: f.get('status'), paymentStatus: f.get('paymentStatus'), fulfillmentStatus: f.get('fulfillmentStatus') };
      const timeline = (order.timeline || []).slice();
      const note = String(f.get('note') || '').trim();
      if (patch.status !== order.status) timeline.push({ label: 'Status changed to ' + patch.status.replace(/_/g, ' '), at: new Date().toISOString(), status: note || 'Updated by ' + ((Store.adminSession().user || {}).name || 'Admin') });
      if (patch.paymentStatus !== order.paymentStatus) timeline.push({ label: 'Payment marked as ' + patch.paymentStatus.replace(/_/g, ' '), at: new Date().toISOString() });
      Store.update('orders', order.id, { ...patch, timeline });
      UI.toast('Order updated.');
      ctx.refresh();
    });

    const cancel = $('[data-cancel-order]', root);
    if (cancel && !cancel.disabled) cancel.addEventListener('click', () => {
      UI.confirm(`Cancel order ${order.orderNumber}? The customer will be notified.`, 'Cancel order').then(ok => {
        if (!ok) return;
        const timeline = (order.timeline || []).slice();
        timeline.push({ label: 'Order cancelled', at: new Date().toISOString(), status: 'Cancelled by ' + ((Store.adminSession().user || {}).name || 'Admin') });
        Store.update('orders', order.id, { status: 'cancelled', timeline });
        UI.toast('Order cancelled.');
        ctx.refresh();
      });
    });

    const print = $('[data-print-order]', root);
    if (print) print.addEventListener('click', () => {
      const w = global.open('', '_blank', 'width=760,height=900');
      if (!w) return;
      w.document.write(`<html><head><title>Order ${esc(order.orderNumber)}</title><style>body{font-family:Arial,sans-serif;padding:30px;color:#222}h1{font-size:18px}table{width:100%;border-collapse:collapse;margin-top:14px}th,td{border:1px solid #ccc;padding:8px;text-align:left;font-size:13px}</style></head><body>
        <h1>Order ${esc(order.orderNumber)}</h1><p>${esc(UI.fmtDateTime(order.createdAt))} · ${esc(order.customerName)} · ${esc(order.customerEmail)}</p>
        <table><thead><tr><th>Product</th><th>SKU</th><th>Price</th><th>Qty</th><th>Total</th></tr></thead><tbody>
        ${order.items.map(i => `<tr><td>${esc(i.name)}</td><td>${esc(i.sku)}</td><td>${UI.money(i.price)}</td><td>${i.quantity}</td><td>${UI.money(i.total)}</td></tr>`).join('')}
        </tbody></table>
        <p>Subtotal ${UI.money(order.subtotal)} · Shipping ${order.shipping === 0 ? 'Free' : UI.money(order.shipping)} · Tax ${UI.money(order.tax)} · <b>Total ${UI.money(order.total)}</b></p>
        </body></html>`);
      w.document.close();
      w.print();
    });
  });

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.from((r || document).querySelectorAll(s)); }

})(typeof window !== 'undefined' ? window : globalThis);
