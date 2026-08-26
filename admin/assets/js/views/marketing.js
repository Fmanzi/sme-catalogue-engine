/* ------------------------------------------------------------------ *
 *  views/marketing.js — coupons, reviews, content (settings editor).
 * ------------------------------------------------------------------ */

'use strict';

(function (global) {

  const Store = global.AnonStore;
  const UI = global.AdminUI;
  const esc = UI.esc;

  /* ---------------- coupons ---------------- */

  AdminApp.register('coupons', function (root, ctx) {
    const coupons = Store.list('coupons');
    root.innerHTML = `
      <div class="toolbar"><h2 style="font-family:var(--serif)">Coupons</h2><div class="spacer"></div>
        <button class="btn-admin btn-primary" data-new-coupon><ion-icon name="add-outline"></ion-icon> New coupon</button></div>
      <div class="card">
        ${coupons.length ? `<div class="table-wrap"><table class="admin-table">
          <thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Min order</th><th>Usage</th><th>Valid</th><th>Status</th><th></th></tr></thead>
          <tbody>${coupons.map(c => `
            <tr>
              <td class="mono cell-strong">${esc(c.code)}</td>
              <td>${esc(c.type.replace(/_/g, ' '))}</td>
              <td>${c.type === 'percentage' ? c.amount + '%' : c.type === 'free_shipping' ? 'Free shipping' : UI.money(c.amount)}</td>
              <td>${c.minimumOrder ? UI.money(c.minimumOrder) : '—'}</td>
              <td>${(c.usageCount || 0)}${c.usageLimit ? ' / ' + c.usageLimit : ''}</td>
              <td>${UI.fmtDate(c.startDate)} → ${UI.fmtDate(c.endDate)}</td>
              <td>${UI.badge(c.status)}</td>
              <td><div class="row-actions">
                <button class="btn-admin btn-ghost btn-sm" data-edit-coupon="${c.id}">Edit</button>
                <button class="btn-admin btn-ghost btn-sm" data-toggle-coupon="${c.id}" data-status="${c.status}">${c.status === 'active' ? 'Disable' : 'Enable'}</button>
                <button class="btn-admin btn-danger btn-sm" data-del-coupon="${c.id}">Delete</button>
              </div></td>
            </tr>`).join('')}</tbody>
        </table></div>` : UI.empty('ticket-outline', 'No coupons yet.')}
      </div>`;

    const TYPES = ['percentage', 'fixed', 'free_shipping', 'category', 'collection', 'product', 'first_order', 'minimum_order'];

    const openForm = (c) => {
      const { el, close } = UI.openModal(`
        <h3 class="admin-modal-title">${c ? 'Edit coupon' : 'New coupon'}</h3>
        <form data-coupon-form>
          <div class="form-grid">
            <div class="field"><label>Code <span class="req">*</span></label><input type="text" name="code" value="${c ? esc(c.code) : ''}" placeholder="SUMMER25" required></div>
            <div class="field"><label>Type</label><select name="type">${TYPES.map(t => `<option value="${t}" ${c && c.type === t ? 'selected' : ''}>${t.replace(/_/g, ' ')}</option>`).join('')}</select></div>
            <div class="field"><label>Amount</label><input type="number" name="amount" step="0.01" value="${c ? c.amount : 0}"><div class="hint">% or currency amount depending on type.</div></div>
            <div class="field"><label>Minimum order</label><input type="number" name="minimumOrder" step="0.01" value="${c ? c.minimumOrder : 0}"></div>
            <div class="field"><label>Max discount</label><input type="number" name="maximumDiscount" step="0.01" value="${c ? c.maximumDiscount : 0}"></div>
            <div class="field"><label>Usage limit (0 = unlimited)</label><input type="number" name="usageLimit" value="${c ? c.usageLimit : 0}"></div>
            <div class="field"><label>Start date</label><input type="date" name="startDate" value="${c ? toDateInput(c.startDate) : toDateInput(new Date().toISOString())}"></div>
            <div class="field"><label>End date</label><input type="date" name="endDate" value="${c ? toDateInput(c.endDate) : toDateInput(new Date(Date.now() + 30 * 864e5).toISOString())}"></div>
            <div class="field full"><label>Status</label><select name="status">${['active', 'inactive'].map(s => `<option value="${s}" ${c && c.status === s ? 'selected' : ''}>${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}</select></div>
          </div>
          <div class="admin-modal-actions">
            <button type="button" class="btn-admin btn-secondary" data-close-modal>Cancel</button>
            <button type="submit" class="btn-admin btn-primary">Save</button>
          </div>
        </form>`);
      $('[data-coupon-form]', el).addEventListener('submit', (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        const data = {
          code: String(f.get('code')).toUpperCase(), type: f.get('type'), amount: Number(f.get('amount') || 0),
          minimumOrder: Number(f.get('minimumOrder') || 0), maximumDiscount: Number(f.get('maximumDiscount') || 0),
          usageLimit: Number(f.get('usageLimit') || 0), startDate: f.get('startDate'), endDate: f.get('endDate'), status: f.get('status')
        };
        if (c) Store.update('coupons', c.id, data); else Store.create('coupons', data);
        close(); UI.toast('Coupon saved.'); ctx.refresh();
      });
    };
    $('[data-new-coupon]', root).addEventListener('click', () => openForm(null));
    $$('[data-edit-coupon]', root).forEach(b => b.addEventListener('click', () => openForm(Store.get('coupons', b.dataset.editCoupon))));
    $$('[data-toggle-coupon]', root).forEach(b => b.addEventListener('click', () => {
      Store.update('coupons', b.dataset.toggleCoupon, { status: b.dataset.status === 'active' ? 'inactive' : 'active' });
      UI.toast('Coupon status updated.'); ctx.refresh();
    }));
    $$('[data-del-coupon]', root).forEach(b => b.addEventListener('click', () => {
      UI.confirm('Delete this coupon?', 'Delete coupon').then(ok => {
        if (ok) { Store.remove('coupons', b.dataset.delCoupon); UI.toast('Coupon deleted.'); ctx.refresh(); }
      });
    }));
  });

  /* ---------------- reviews ---------------- */

  AdminApp.register('reviews', function (root, ctx) {
    const state = ctx.reviewsState = ctx.reviewsState || { status: '' };
    let list = Store.list('reviews').slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (state.status) list = list.filter(r => r.status === state.status);

    root.innerHTML = `
      <div class="toolbar"><h2 style="font-family:var(--serif)">Reviews</h2>
        <select data-rev-status>
          <option value="">All statuses</option>
          ${['pending', 'approved', 'rejected'].map(s => `<option value="${s}" ${state.status === s ? 'selected' : ''}>${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}
        </select>
        <div class="spacer"></div>
        <button class="btn-admin btn-ghost" data-rev-export><ion-icon name="download-outline"></ion-icon> Export CSV</button>
      </div>
      <div class="card">
        ${list.length ? `<div class="table-wrap"><table class="admin-table">
          <thead><tr><th>Product</th><th>Author</th><th>Rating</th><th>Review</th><th>Date</th><th>Status</th><th></th></tr></thead>
          <tbody>${list.map(r => {
            const p = Store.get('products', r.productId);
            return `<tr>
              <td><div class="prod-cell">${p ? `<img src="${UI.img(p.mainImage)}" alt="">` : ''}<div><div class="pc-name">${p ? esc(p.name) : '—'}</div><div class="pc-meta">${p ? esc(p.sku) : ''}</div></div></div></td>
              <td>${esc(r.customerName)}</td>
              <td>${UI.ratingStars(r.rating)}</td>
              <td style="max-width:320px;min-width:200px">${esc(r.comment)}</td>
              <td>${UI.fmtDate(r.createdAt)}</td>
              <td>${UI.badge(r.status)}</td>
              <td><div class="row-actions">
                ${r.status !== 'approved' ? `<button class="btn-admin btn-secondary btn-sm" data-approve="${r.id}">Approve</button>` : ''}
                ${r.status !== 'rejected' ? `<button class="btn-admin btn-ghost btn-sm" data-reject="${r.id}">Reject</button>` : ''}
                <button class="btn-admin btn-danger btn-sm" data-del-review="${r.id}">Delete</button>
              </div></td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>` : UI.empty('star-outline', 'No reviews match your filters.')}
      </div>`;

    const statusSel = $('[data-rev-status]', root);
    if (statusSel) statusSel.addEventListener('change', () => { state.status = statusSel.value; ctx.refresh(); });
    $$('[data-approve]', root).forEach(b => b.addEventListener('click', () => { Store.update('reviews', b.dataset.approve, { status: 'approved' }); UI.toast('Review approved.'); ctx.refresh(); }));
    $$('[data-reject]', root).forEach(b => b.addEventListener('click', () => { Store.update('reviews', b.dataset.reject, { status: 'rejected' }); UI.toast('Review rejected.'); ctx.refresh(); }));
    $$('[data-del-review]', root).forEach(b => b.addEventListener('click', () => {
      UI.confirm('Delete this review permanently?', 'Delete review').then(ok => { if (ok) { Store.remove('reviews', b.dataset.delReview); UI.toast('Review deleted.'); ctx.refresh(); } });
    }));
    $('[data-rev-export]', root).addEventListener('click', () => {
      UI.downloadCSV('meridian-reviews.csv', [['Product', 'Author', 'Rating', 'Review', 'Date', 'Status']]
        .concat(list.map(r => [(Store.get('products', r.productId) || {}).name || '', r.customerName, r.rating, r.comment, r.createdAt, r.status])));
      UI.toast('CSV exported.');
    });
  });

  /* ---------------- content ---------------- */

  AdminApp.register('content', function (root, ctx) {
    const s = Store.settings();
    const sections = [
      { key: 'hero.title', label: 'Hero — Title', val: s.hero.title },
      { key: 'hero.subtitle', label: 'Hero — Kicker', val: s.hero.subtitle },
      { key: 'hero.text', label: 'Hero — Description', val: s.hero.text, area: true },
      { key: 'hero.buttonText', label: 'Hero — Button text', val: s.hero.buttonText },
      { key: 'aboutContent', label: 'About — Story', val: s.aboutContent, area: true },
      { key: 'contactInfo', label: 'Contact — Info line', val: s.contactInfo },
      { key: 'footerText', label: 'Footer — Tagline', val: s.footerText }
    ];
    root.innerHTML = `
      <div class="card">
        <div class="card-title">Storefront content</div>
        <form data-content-form>
          ${sections.map(sec => `
            <div class="field"><label>${esc(sec.label)}</label>
              ${sec.area ? `<textarea name="${esc(sec.key)}" rows="4">${esc(sec.val)}</textarea>` : `<input type="text" name="${esc(sec.key)}" value="${esc(sec.val)}">`}
            </div>`).join('')}
          <div class="form-actions">
            <button type="submit" class="btn-admin btn-primary">Save content</button>
            <a href="../index.html" target="_blank" class="btn-admin btn-secondary">Preview storefront</a>
          </div>
        </form>
      </div>`;

    $('[data-content-form]', root).addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const hero = { ...s.hero, title: f.get('hero.title'), subtitle: f.get('hero.subtitle'), text: f.get('hero.text'), buttonText: f.get('hero.buttonText') };
      Store.updateSettings({ hero, aboutContent: f.get('aboutContent'), contactInfo: f.get('contactInfo'), footerText: f.get('footerText') });
      UI.toast('Content saved.');
      ctx.refresh();
    });
  });

  function toDateInput(iso) {
    const d = new Date(iso);
    return isNaN(d) ? '' : d.toISOString().slice(0, 10);
  }

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.from((r || document).querySelectorAll(s)); }

})(typeof window !== 'undefined' ? window : globalThis);
