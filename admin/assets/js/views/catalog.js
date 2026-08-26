/* ------------------------------------------------------------------ *
 *  views/catalog.js — categories, collections, brands, inventory.
 * ------------------------------------------------------------------ */

'use strict';

(function (global) {

  const Store = global.AnonStore;
  const UI = global.AdminUI;
  const esc = UI.esc;

  /* ---------------- categories ---------------- */

  AdminApp.register('categories', function (root, ctx) {
    const cats = Store.list('categories').slice().sort((a, b) => a.order - b.order);
    root.innerHTML = `
      <div class="toolbar"><h2 style="font-family:var(--serif)">Categories</h2><div class="spacer"></div>
        <button class="btn-admin btn-primary" data-new-cat><ion-icon name="add-outline"></ion-icon> New category</button></div>
      <div class="card">
        <div class="table-wrap"><table class="admin-table">
          <thead><tr><th>Name</th><th>Slug</th><th>Products</th><th>Order</th><th>Status</th><th></th></tr></thead>
          <tbody>${cats.map(c => `
            <tr>
              <td class="cell-strong">${esc(c.name)}</td>
              <td class="mono">${esc(c.slug)}</td>
              <td>${Store.products().filter(p => p.categoryId === c.id).length}</td>
              <td>${c.order}</td>
              <td>${UI.badge(c.status)}</td>
              <td><div class="row-actions">
                <button class="btn-admin btn-ghost btn-sm" data-edit-cat="${c.id}">Edit</button>
                <button class="btn-admin btn-danger btn-sm" data-del-cat="${c.id}">Delete</button>
              </div></td>
            </tr>`).join('')}</tbody>
        </table></div>
      </div>`;

    $$('[data-del-cat]', root).forEach(b => b.addEventListener('click', () => {
      UI.confirm('Delete this category? Products assigned to it will keep their records but show no category.', 'Delete category').then(ok => {
        if (ok) { Store.remove('categories', b.dataset.delCat); UI.toast('Category deleted.'); ctx.refresh(); }
      });
    }));

    const openForm = (cat) => {
      const { el, close } = UI.openModal(`
        <h3 class="admin-modal-title">${cat ? 'Edit category' : 'New category'}</h3>
        <form data-cat-form>
          <div class="field"><label>Name <span class="req">*</span></label><input type="text" name="name" value="${cat ? esc(cat.name) : ''}" required></div>
          <div class="field"><label>Slug</label><input type="text" name="slug" value="${cat ? esc(cat.slug) : ''}" placeholder="auto-generated from name"></div>
          <div class="field"><label>Description</label><textarea name="description" rows="2">${cat ? esc(cat.description) : ''}</textarea></div>
          <div class="form-grid">
            <div class="field"><label>Sort order</label><input type="number" name="order" value="${cat ? cat.order : cats.length + 1}"></div>
            <div class="field"><label>Status</label><select name="status">${['active', 'inactive'].map(s => `<option value="${s}" ${cat && cat.status === s ? 'selected' : ''}>${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}</select></div>
          </div>
          <div class="admin-modal-actions">
            <button type="button" class="btn-admin btn-secondary" data-close-modal>Cancel</button>
            <button type="submit" class="btn-admin btn-primary">Save</button>
          </div>
        </form>`);
      $('[data-cat-form]', el).addEventListener('submit', (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        const data = { name: f.get('name'), slug: f.get('slug') || slugify(f.get('name')), description: f.get('description'), order: Number(f.get('order') || 0), status: f.get('status') };
        if (cat) Store.update('categories', cat.id, data); else Store.create('categories', data);
        close(); UI.toast('Category saved.'); ctx.refresh();
      });
    };
    $('[data-new-cat]', root).addEventListener('click', () => openForm(null));
    $$('[data-edit-cat]', root).forEach(b => b.addEventListener('click', () => openForm(Store.get('categories', b.dataset.editCat))));
  });

  /* ---------------- collections ---------------- */

  AdminApp.register('collections', function (root, ctx) {
    const colls = Store.list('collections');
    const imgs = ['collection-1.svg', 'collection-2.svg', 'collection-3.svg', 'collection-4.svg', 'collection-5.svg', 'collection-6.svg'];
    root.innerHTML = `
      <div class="toolbar"><h2 style="font-family:var(--serif)">Collections</h2><div class="spacer"></div>
        <button class="btn-admin btn-primary" data-new-coll><ion-icon name="add-outline"></ion-icon> New collection</button></div>
      <div class="grid-3">${colls.map((c, i) => `
        <div class="card">
          <img src="../assets/images/watch/${imgs[i % imgs.length]}" alt="" style="border-radius:6px;margin-bottom:12px">
          <div class="flex-between"><h3 style="font-family:var(--serif);font-size:15px">${esc(c.name)}</h3>${UI.badge(c.status)}</div>
          <p class="muted mt-8" style="font-size:12.5px">${esc(c.description)}</p>
          <p class="mt-8" style="font-size:12.5px">${Store.products().filter(p => p.collectionIds.includes(c.id)).length} products · ${c.featured ? 'Featured' : 'Standard'}</p>
          <div class="row-actions mt-12">
            <button class="btn-admin btn-ghost btn-sm" data-edit-coll="${c.id}">Edit</button>
            <button class="btn-admin btn-danger btn-sm" data-del-coll="${c.id}">Delete</button>
          </div>
        </div>`).join('')}
      </div>`;

    $$('[data-del-coll]', root).forEach(b => b.addEventListener('click', () => {
      UI.confirm('Delete this collection? Products will be removed from it.', 'Delete collection').then(ok => {
        if (ok) { Store.remove('collections', b.dataset.delColl); UI.toast('Collection deleted.'); ctx.refresh(); }
      });
    }));

    const openForm = (c) => {
      const { el, close } = UI.openModal(`
        <h3 class="admin-modal-title">${c ? 'Edit collection' : 'New collection'}</h3>
        <form data-coll-form>
          <div class="field"><label>Name <span class="req">*</span></label><input type="text" name="name" value="${c ? esc(c.name) : ''}" required></div>
          <div class="field"><label>Slug</label><input type="text" name="slug" value="${c ? esc(c.slug) : ''}"></div>
          <div class="field"><label>Description</label><textarea name="description" rows="3">${c ? esc(c.description) : ''}</textarea></div>
          <div class="form-grid">
            <div class="field"><label>Status</label><select name="status">${['active', 'inactive'].map(s => `<option value="${s}" ${c && c.status === s ? 'selected' : ''}>${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}</select></div>
            <div class="field"><label>Featured</label><select name="featured"><option value="false">No</option><option value="true" ${c && c.featured ? 'selected' : ''}>Yes</option></select></div>
          </div>
          <div class="admin-modal-actions">
            <button type="button" class="btn-admin btn-secondary" data-close-modal>Cancel</button>
            <button type="submit" class="btn-admin btn-primary">Save</button>
          </div>
        </form>`);
      $('[data-coll-form]', el).addEventListener('submit', (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        const data = { name: f.get('name'), slug: f.get('slug') || slugify(f.get('name')), description: f.get('description'), status: f.get('status'), featured: f.get('featured') === 'true' };
        if (c) Store.update('collections', c.id, data); else Store.create('collections', data);
        close(); UI.toast('Collection saved.'); ctx.refresh();
      });
    };
    $('[data-new-coll]', root).addEventListener('click', () => openForm(null));
    $$('[data-edit-coll]', root).forEach(b => b.addEventListener('click', () => openForm(Store.get('collections', b.dataset.editColl))));
  });

  /* ---------------- brands ---------------- */

  AdminApp.register('brands', function (root, ctx) {
    const brands = Store.list('brands');
    root.innerHTML = `
      <div class="toolbar"><h2 style="font-family:var(--serif)">Brands</h2><div class="spacer"></div>
        <button class="btn-admin btn-primary" data-new-brand><ion-icon name="add-outline"></ion-icon> New brand</button></div>
      <div class="card">
        <div class="table-wrap"><table class="admin-table">
          <thead><tr><th>Brand</th><th>Country</th><th>Products</th><th>Status</th><th></th></tr></thead>
          <tbody>${brands.map(b => `
            <tr>
              <td><div class="prod-cell"><img src="${UI.img(b.logo)}" alt="" style="object-fit:contain;background:var(--ink-3)"><div><div class="pc-name">${esc(b.name)}</div><div class="pc-meta">${esc(b.slug)}</div></div></div></td>
              <td>${esc(b.country || '—')}</td>
              <td>${Store.products().filter(p => p.brandId === b.id).length}</td>
              <td>${UI.badge(b.status)}</td>
              <td><div class="row-actions">
                <button class="btn-admin btn-ghost btn-sm" data-edit-brand="${b.id}">Edit</button>
                <button class="btn-admin btn-danger btn-sm" data-del-brand="${b.id}">Delete</button>
              </div></td>
            </tr>`).join('')}</tbody>
        </table></div>
      </div>`;

    $$('[data-del-brand]', root).forEach(b => b.addEventListener('click', () => {
      UI.confirm('Delete this brand?', 'Delete brand').then(ok => {
        if (ok) { Store.remove('brands', b.dataset.delBrand); UI.toast('Brand deleted.'); ctx.refresh(); }
      });
    }));

    const openForm = (br) => {
      const { el, close } = UI.openModal(`
        <h3 class="admin-modal-title">${br ? 'Edit brand' : 'New brand'}</h3>
        <form data-brand-form>
          <div class="field"><label>Name <span class="req">*</span></label><input type="text" name="name" value="${br ? esc(br.name) : ''}" required></div>
          <div class="field"><label>Slug</label><input type="text" name="slug" value="${br ? esc(br.slug) : ''}"></div>
          <div class="field"><label>Logo path</label><input type="text" name="logo" value="${br ? esc(br.logo) : ''}" placeholder="brands/meridian-logo.svg"></div>
          <div class="field"><label>Country</label><input type="text" name="country" value="${br ? esc(br.country) : ''}"></div>
          <div class="field"><label>Website</label><input type="url" name="website" value="${br ? esc(br.website) : ''}"></div>
          <div class="field"><label>Status</label><select name="status">${['active', 'inactive'].map(s => `<option value="${s}" ${br && br.status === s ? 'selected' : ''}>${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}</select></div>
          <div class="admin-modal-actions">
            <button type="button" class="btn-admin btn-secondary" data-close-modal>Cancel</button>
            <button type="submit" class="btn-admin btn-primary">Save</button>
          </div>
        </form>`);
      $('[data-brand-form]', el).addEventListener('submit', (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        const data = { name: f.get('name'), slug: f.get('slug') || slugify(f.get('name')), logo: f.get('logo') || 'brands/placeholder-logo.svg', country: f.get('country'), website: f.get('website'), status: f.get('status') };
        if (br) Store.update('brands', br.id, data); else Store.create('brands', data);
        close(); UI.toast('Brand saved.'); ctx.refresh();
      });
    };
    $('[data-new-brand]', root).addEventListener('click', () => openForm(null));
    $$('[data-edit-brand]', root).forEach(b => b.addEventListener('click', () => openForm(Store.get('brands', b.dataset.editBrand))));
  });

  /* ---------------- inventory ---------------- */

  AdminApp.register('inventory', function (root, ctx) {
    const products = Store.products();
    const history = Store.list('inventory').slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    root.innerHTML = `
      <div class="grid-2 mb-20">
        <div class="card">
          <div class="card-title">Stock levels <small>live product stock</small></div>
          <div class="table-wrap"><table class="admin-table">
            <thead><tr><th>Product</th><th>Available</th><th>Reserved</th><th>Status</th><th></th></tr></thead>
            <tbody>${products.map(p => `
              <tr>
                <td><div class="prod-cell"><img src="${UI.img(p.mainImage)}" alt=""><div><div class="pc-name">${esc(p.name)}</div><div class="pc-meta">${esc(p.sku)}</div></div></div></td>
                <td class="cell-strong">${p.stockQuantity}</td>
                <td>${p.reservedStock || 0}</td>
                <td>${UI.badge(p.stockStatus)}</td>
                <td><button class="btn-admin btn-ghost btn-sm" data-adjust="${p.id}">Adjust</button></td>
              </tr>`).join('')}</tbody>
          </table></div>
        </div>
        <div class="card">
          <div class="card-title">Movement history <small>restocks, sales &amp; adjustments</small>
            <button class="btn-admin btn-ghost btn-sm" data-inv-export>Export CSV</button>
          </div>
          <div class="table-wrap"><table class="admin-table">
            <thead><tr><th>Product</th><th>Type</th><th>Qty</th><th>Note</th><th>By</th><th>When</th></tr></thead>
            <tbody>${history.slice(0, 50).map(h => {
              const p = Store.get('products', h.productId);
              const delta = Number(h.quantity) || 0;
              return `<tr>
                <td>${esc(p ? p.name : '—')}</td>
                <td>${UI.badge(h.type, h.type)}</td>
                <td class="${delta < 0 ? 'cell-sub' : 'cell-strong'}" style="color:${delta < 0 ? 'var(--red)' : 'var(--green)'}">${delta > 0 ? '+' : ''}${delta}</td>
                <td>${esc(h.note)}</td>
                <td>${esc(h.adminName || '—')}</td>
                <td>${UI.fmtDateTime(h.createdAt)}</td>
              </tr>`;
            }).join('')}</tbody>
          </table></div>
        </div>
      </div>`;

    $$('[data-adjust]', root).forEach(b => b.addEventListener('click', () => {
      const p = Store.get('products', b.dataset.adjust);
      if (!p) return;
      const { el, close } = UI.openModal(`
        <h3 class="admin-modal-title">Adjust stock — ${esc(p.name)}</h3>
        <p class="muted mb-12" style="font-size:12.5px">Current stock: <b>${p.stockQuantity}</b>. Use a negative value to reduce stock.</p>
        <form data-inv-form>
          <div class="field"><label>Type</label><select name="type"><option value="restock">Restock</option><option value="adjustment">Adjustment</option><option value="sale">Sale / removal</option></select></div>
          <div class="field"><label>Quantity <span class="req">*</span></label><input type="number" name="quantity" value="1" step="1" required></div>
          <div class="field"><label>Note</label><input type="text" name="note" placeholder="e.g. Supplier delivery"></div>
          <div class="admin-modal-actions">
            <button type="button" class="btn-admin btn-secondary" data-close-modal>Cancel</button>
            <button type="submit" class="btn-admin btn-primary">Apply</button>
          </div>
        </form>`);
      $('[data-inv-form]', el).addEventListener('submit', (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        let qty = Number(f.get('quantity')) || 0;
        const type = f.get('type');
        if (type === 'sale') qty = -Math.abs(qty);
        else qty = Math.abs(qty);
        const newStock = Math.max(0, p.stockQuantity + qty);
        Store.update('products', p.id, {
          stockQuantity: newStock,
          stockStatus: newStock === 0 ? 'out_of_stock' : newStock <= p.lowStockThreshold ? 'low_stock' : 'in_stock'
        });
        Store.create('inventory', { productId: p.id, type, quantity: qty, note: f.get('note') || type, adminName: (Store.adminSession().user || {}).name || 'Admin' });
        close(); UI.toast('Stock updated.'); ctx.refresh();
      });
    }));

    $('[data-inv-export]', root).addEventListener('click', () => {
      UI.downloadCSV('meridian-inventory-history.csv', [['Product', 'Type', 'Qty', 'Note', 'By', 'When']]
        .concat(history.map(h => [Store.get('products', h.productId) ? Store.get('products', h.productId).name : '', h.type, h.quantity, h.note, h.adminName, h.createdAt])));
      UI.toast('CSV exported.');
    });
  });

  function slugify(str) {
    return String(str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.from((r || document).querySelectorAll(s)); }

})(typeof window !== 'undefined' ? window : globalThis);
