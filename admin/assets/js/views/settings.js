/* ------------------------------------------------------------------ *
 *  views/settings.js — general, shipping, taxes, payments, staff.
 * ------------------------------------------------------------------ */

'use strict';

(function (global) {

  const Store = global.AnonStore;
  const UI = global.AdminUI;
  const esc = UI.esc;

  const ROLES = [
    { id: 'super_admin', label: 'Super Admin' },
    { id: 'store_manager', label: 'Store Manager' },
    { id: 'order_manager', label: 'Order Manager' },
    { id: 'catalog_manager', label: 'Catalog Manager' }
  ];

  AdminApp.register('settings', function (root, ctx) {
    const s = Store.settings();
    const canStaff = Store.hasPermission('*') || Store.hasPermission('settings');
    const admins = Store.list('adminUsers');

    root.innerHTML = `
      <div class="grid-2 mb-20">
        <div class="card">
          <div class="card-title">General</div>
          <form data-settings-general>
            <div class="form-grid">
              <div class="field"><label>Store name</label><input type="text" name="storeName" value="${esc(s.storeName)}"></div>
              <div class="field"><label>Tagline</label><input type="text" name="tagline" value="${esc(s.tagline)}"></div>
              <div class="field full"><label>Description</label><textarea name="description" rows="3">${esc(s.description)}</textarea></div>
              <div class="field"><label>Contact email</label><input type="email" name="contactEmail" value="${esc(s.contactEmail)}"></div>
              <div class="field"><label>Phone</label><input type="text" name="phone" value="${esc(s.phone)}"></div>
              <div class="field full"><label>Address</label><input type="text" name="address" value="${esc(s.address)}"></div>
              <div class="field"><label>Currency symbol</label><input type="text" name="currencySymbol" value="${esc(s.currencySymbol)}"></div>
              <div class="field"><label>Decimal format</label><select name="decimalFormat">
                <option value="2" ${s.decimalFormat === '2' ? 'selected' : ''}>2 decimals (Ksh 1,234.50)</option>
                <option value="0" ${s.decimalFormat === '0' ? 'selected' : ''}>No decimals (Ksh 1,235)</option>
              </select></div>
              <div class="field full"><label>Free shipping threshold (0 = never)</label><input type="number" name="freeShippingThreshold" step="0.01" min="0" value="${s.freeShippingThreshold}"></div>
            </div>
            <div class="form-actions"><button type="submit" class="btn-admin btn-primary">Save general</button></div>
          </form>
        </div>

        <div class="card">
          <div class="card-title">Shipping methods</div>
          <form data-settings-shipping>
            <div id="ship-list">
              ${s.shippingMethods.map((m, i) => `
                <div class="ship-row" style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
                  <input type="text" name="name" value="${esc(m.name)}" placeholder="Method name" style="flex:1;min-width:140px;background:var(--ink);border:1px solid var(--line);color:var(--text);padding:9px 12px;border-radius:6px;font-size:13px">
                  <input type="number" name="fee" value="${m.fee}" step="0.01" min="0" placeholder="Fee" style="width:90px;background:var(--ink);border:1px solid var(--line);color:var(--text);padding:9px 12px;border-radius:6px;font-size:13px">
                  <input type="text" name="deliveryDays" value="${esc(m.deliveryDays)}" placeholder="Delivery time" style="flex:1;min-width:120px;background:var(--ink);border:1px solid var(--line);color:var(--text);padding:9px 12px;border-radius:6px;font-size:13px">
                  <button type="button" class="btn-admin btn-danger btn-sm" data-remove-ship>Remove</button>
                </div>`).join('')}
            </div>
            <button type="button" class="btn-admin btn-ghost btn-sm mb-12" data-add-ship><ion-icon name="add-outline"></ion-icon> Add method</button>
            <div class="form-actions"><button type="submit" class="btn-admin btn-primary">Save shipping</button></div>
          </form>

          <div class="divider"></div>

          <div class="card-title">Taxes</div>
          <form data-settings-tax>
            <div class="form-grid">
              <div class="field"><label>Standard rate (%)</label><input type="number" name="standard" step="0.01" min="0" value="${s.taxRates.standard}"></div>
              <div class="field"><label>Reduced rate (%)</label><input type="number" name="reduced" step="0.01" min="0" value="${s.taxRates.reduced}"></div>
            </div>
            <div class="form-actions"><button type="submit" class="btn-admin btn-primary">Save taxes</button></div>
          </form>
        </div>
      </div>

      <div class="card mb-20">
        <div class="card-title">Payment options <small>pay on delivery — no prepayment</small></div>
        <form data-settings-payments>
          ${['mpesa', 'cash', 'whatsapp'].map(key => {
            const p = s.paymentProviders[key] || {};
            const label = { mpesa: 'M-Pesa on delivery', cash: 'Cash on delivery', whatsapp: 'WhatsApp orders' }[key];
            return `
            <div class="ship-row" style="display:flex;gap:14px;align-items:center;padding:14px;border:1px solid var(--line);border-radius:8px;margin-bottom:12px;flex-wrap:wrap">
              <label style="display:flex;align-items:center;gap:8px;min-width:170px;cursor:pointer">
                <input type="checkbox" name="enabled_${key}" ${p.enabled ? 'checked' : ''}> <b>${label}</b> ${p.connected ? UI.badge('active', 'Connected') : UI.badge('draft', 'Not connected')}
              </label>
              ${key === 'whatsapp' ? `<input type="text" name="number_${key}" value="${esc(p.number || '')}" placeholder="International number, e.g. 254728580415" style="flex:1;min-width:200px;background:var(--ink);border:1px solid var(--line);color:var(--text);padding:9px 12px;border-radius:6px;font-size:13px">` : ''}
              ${key === 'mpesa' ? `<input type="text" name="phone_${key}" value="${esc(p.phone || '')}" placeholder="M-Pesa number" style="flex:1;min-width:200px;background:var(--ink);border:1px solid var(--line);color:var(--text);padding:9px 12px;border-radius:6px;font-size:13px">` : ''}
            </div>`;
          }).join('')}
          <div class="form-actions"><button type="submit" class="btn-admin btn-primary">Save payment options</button></div>
        </form>
      </div>

      ${canStaff ? `
      <div class="card">
        <div class="card-title">Staff &amp; roles <small>demo password for all accounts: admin123</small></div>
        <div class="table-wrap">
          <table class="admin-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last login</th><th></th></tr></thead>
            <tbody>${admins.map(a => `
              <tr>
                <td><div class="prod-cell"><div class="avatar" style="width:32px;height:32px;font-size:11px">${UI.initials(a.name)}</div><div class="pc-name">${esc(a.name)}</div></div></td>
                <td>${esc(a.email)}</td>
                <td>${esc(((global.AnonModels.Roles[a.role] || {}).label) || a.role)}</td>
                <td>${UI.badge(a.status)}</td>
                <td>${UI.fmtDateTime(a.lastLoginAt)}</td>
                <td><div class="row-actions">
                  <button class="btn-admin btn-ghost btn-sm" data-edit-admin="${a.id}">Edit</button>
                  ${a.status === 'active' ? `<button class="btn-admin btn-danger btn-sm" data-disable-admin="${a.id}">Disable</button>` : `<button class="btn-admin btn-secondary btn-sm" data-enable-admin="${a.id}">Enable</button>`}
                </div></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div class="mt-12"><button class="btn-admin btn-primary" data-new-admin><ion-icon name="add-outline"></ion-icon> Add staff member</button></div>
      </div>` : ''}
      `;

    /* general */
    $('[data-settings-general]', root).addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      Store.updateSettings({
        storeName: f.get('storeName'), tagline: f.get('tagline'), description: f.get('description'),
        contactEmail: f.get('contactEmail'), phone: f.get('phone'), address: f.get('address'),
        currencySymbol: f.get('currencySymbol'), decimalFormat: f.get('decimalFormat'),
        freeShippingThreshold: Number(f.get('freeShippingThreshold') || 0)
      });
      UI.toast('General settings saved.');
      ctx.refresh();
    });

    /* shipping */
    const shipList = $('#ship-list', root);
    $('[data-add-ship]', root).addEventListener('click', () => {
      const row = document.createElement('div');
      row.className = 'ship-row';
      row.style.cssText = 'display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap';
      row.innerHTML = `
        <input type="text" name="name" placeholder="Method name" style="flex:1;min-width:140px;background:var(--ink);border:1px solid var(--line);color:var(--text);padding:9px 12px;border-radius:6px;font-size:13px">
        <input type="number" name="fee" value="0" step="0.01" min="0" placeholder="Fee" style="width:90px;background:var(--ink);border:1px solid var(--line);color:var(--text);padding:9px 12px;border-radius:6px;font-size:13px">
        <input type="text" name="deliveryDays" placeholder="Delivery time" style="flex:1;min-width:120px;background:var(--ink);border:1px solid var(--line);color:var(--text);padding:9px 12px;border-radius:6px;font-size:13px">
        <button type="button" class="btn-admin btn-danger btn-sm" data-remove-ship>Remove</button>`;
      shipList.appendChild(row);
      row.querySelector('[data-remove-ship]').addEventListener('click', () => row.remove());
    });
    shipList.addEventListener('click', (e) => {
      const b = e.target.closest('[data-remove-ship]');
      if (b) b.closest('.ship-row').remove();
    });
    $('[data-settings-shipping]', root).addEventListener('submit', (e) => {
      e.preventDefault();
      const rows = Array.from(shipList.querySelectorAll('.ship-row'));
      const methods = rows.map((r, i) => ({
        id: 'ship-' + (i + 1),
        name: r.querySelector('[name=name]').value || 'Shipping method',
        fee: Number(r.querySelector('[name=fee]').value || 0),
        deliveryDays: r.querySelector('[name=deliveryDays]').value || '5–7 business days'
      }));
      Store.updateSettings({ shippingMethods: methods });
      UI.toast('Shipping methods saved.');
      ctx.refresh();
    });

    /* tax */
    $('[data-settings-tax]', root).addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      Store.updateSettings({ taxRates: { standard: Number(f.get('standard') || 0), reduced: Number(f.get('reduced') || 0) } });
      UI.toast('Tax rates saved.');
      ctx.refresh();
    });

    /* payments */
    $('[data-settings-payments]', root).addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const providers = {};
      ['mpesa', 'cash', 'whatsapp'].forEach(key => {
        const prev = s.paymentProviders[key] || {};
        providers[key] = { ...prev, enabled: !!f.get('enabled_' + key) };
        if (key === 'mpesa') providers[key].phone = f.get('phone_mpesa');
        if (key === 'whatsapp') providers[key].number = f.get('number_whatsapp');
        providers[key].connected = providers[key].enabled;
      });
      Store.updateSettings({ paymentProviders: providers });
      UI.toast('Payment options saved.');
      ctx.refresh();
    });

    /* staff */
    if (canStaff) {
      const openStaffForm = (admin) => {
        const { el, close } = UI.openModal(`
          <h3 class="admin-modal-title">${admin ? 'Edit staff member' : 'Add staff member'}</h3>
          <form data-admin-form>
            <div class="field"><label>Name <span class="req">*</span></label><input type="text" name="name" value="${admin ? esc(admin.name) : ''}" required></div>
            <div class="field"><label>Email <span class="req">*</span></label><input type="email" name="email" value="${admin ? esc(admin.email) : ''}" required></div>
            <div class="field"><label>Role</label><select name="role">
              ${ROLES.map(r => `<option value="${r.id}" ${admin && admin.role === r.id ? 'selected' : ''}>${r.label}</option>`).join('')}
            </select></div>
            <div class="field"><label>Status</label><select name="status">
              ${['active', 'disabled'].map(x => `<option value="${x}" ${admin && admin.status === x ? 'selected' : ''}>${x[0].toUpperCase() + x.slice(1)}</option>`).join('')}
            </select></div>
            ${!admin ? `<p class="muted" style="font-size:12.5px">New accounts use the demo password <b class="mono">admin123</b>.</p>` : ''}
            <div class="admin-modal-actions">
              <button type="button" class="btn-admin btn-secondary" data-close-modal>Cancel</button>
              <button type="submit" class="btn-admin btn-primary">Save</button>
            </div>
          </form>`);
        $('[data-admin-form]', el).addEventListener('submit', (e) => {
          e.preventDefault();
          const f = new FormData(e.target);
          const data = { name: f.get('name'), email: f.get('email'), role: f.get('role'), status: f.get('status') };
          if (admin) {
            Store.update('adminUsers', admin.id, data);
            UI.toast('Staff member updated.');
          } else {
            Store.create('adminUsers', { ...data, passwordHash: '185030e4', avatar: '' });
            UI.toast('Staff member created (password: admin123).');
          }
          close(); ctx.refresh();
        });
      };
      $('[data-new-admin]', root).addEventListener('click', () => openStaffForm(null));
      $$('[data-edit-admin]', root).forEach(b => b.addEventListener('click', () => openStaffForm(Store.get('adminUsers', b.dataset.editAdmin))));
      $$('[data-disable-admin]', root).forEach(b => b.addEventListener('click', () => {
        Store.update('adminUsers', b.dataset.disableAdmin, { status: 'disabled' }); UI.toast('Account disabled.'); ctx.refresh();
      }));
      $$('[data-enable-admin]', root).forEach(b => b.addEventListener('click', () => {
        Store.update('adminUsers', b.dataset.enableAdmin, { status: 'active' }); UI.toast('Account enabled.'); ctx.refresh();
      }));
    }
  });

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.from((r || document).querySelectorAll(s)); }

})(typeof window !== 'undefined' ? window : globalThis);
