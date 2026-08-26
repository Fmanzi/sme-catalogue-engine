/* ------------------------------------------------------------------ *
 *  components.js — admin UI components (toasts, modals, charts,
 *  badges, pagination, formatting). No external dependencies.
 *  Depends on: models.js, store.js
 * ------------------------------------------------------------------ */

'use strict';

(function (global) {

  const Store = global.AnonStore;
  const AdminUI = {};

  /* ---------- formatting ---------- */

  AdminUI.esc = (str) => String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  AdminUI.money = (n) => {
    const s = Store.settings();
    const sym = s.currencySymbol || '$';
    const digits = s.decimalFormat === '0' ? 0 : 2;
    return sym + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  };

  AdminUI.img = (src) => {
    if (!src) return '';
    if (/^(https?:|data:|blob:)/.test(src)) return src;
    return '../assets/images/' + src.replace(/^(\.\/)?(assets\/images\/)?/, '');
  };

  AdminUI.fmtDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  AdminUI.fmtDateTime = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d) ? '—' : d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  AdminUI.ratingStars = (r) => {
    const n = Math.round(Number(r || 0));
    return Array.from({ length: 5 }, (_, i) => `<ion-icon name="${i < n ? 'star' : 'star-outline'}"></ion-icon>`).join('');
  };

  AdminUI.initials = (name) => String(name || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();

  /* ---------- badges ---------- */

  const BADGE_COLORS = {
    active: 'green', in_stock: 'green', paid: 'green', fulfilled: 'green', approved: 'green', delivered: 'green',
    pending: 'amber', low_stock: 'amber', unpaid: 'amber', unfulfilled: 'amber', draft: 'amber', partial: 'amber',
    disabled: 'gray', archived: 'gray', inactive: 'gray', failed: 'gray', cancelled: 'red', rejected: 'red',
    out_of_stock: 'red', refunded: 'purple', returned: 'purple', processing: 'blue', shipped: 'blue',
    confirmed: 'blue', partially_fulfilled: 'amber'
  };

  AdminUI.badge = (value, label) => {
    const v = String(value || '').toLowerCase();
    const color = BADGE_COLORS[v] || 'gray';
    return `<span class="badge badge-${color}">${AdminUI.esc(label || String(value == null ? '' : value).replace(/_/g, ' '))}</span>`;
  };

  /* ---------- toast ---------- */

  AdminUI.toast = (msg, type) => {
    const existing = document.querySelector('.admin-toast');
    if (existing) existing.remove();
    const t = document.createElement('div');
    t.className = 'admin-toast' + (type === 'error' ? ' error' : '');
    t.innerHTML = `<ion-icon name="${type === 'error' ? 'alert-circle-outline' : 'checkmark-circle-outline'}"></ion-icon><span>${AdminUI.esc(msg)}</span>`;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 250); }, 3200);
  };

  /* ---------- modal ---------- */

  AdminUI.openModal = (html) => {
    const m = document.createElement('div');
    m.className = 'admin-modal';
    m.innerHTML = `<div class="admin-modal-backdrop"></div><div class="admin-modal-card">${html}</div>`;
    document.body.appendChild(m);
    const close = () => m.remove();
    m.querySelector('.admin-modal-backdrop').addEventListener('click', close);
    m.querySelectorAll('[data-close-modal]').forEach(b => b.addEventListener('click', close));
    return { el: m, close };
  };

  AdminUI.confirm = (message, title) => new Promise((resolve) => {
    const { el, close } = AdminUI.openModal(`
      <h3 class="admin-modal-title">${title || 'Please confirm'}</h3>
      <p style="color:var(--text-soft)">${AdminUI.esc(message)}</p>
      <div class="admin-modal-actions">
        <button class="btn-admin btn-secondary" data-close-modal>Cancel</button>
        <button class="btn-admin btn-danger" data-confirm>Confirm</button>
      </div>`);
    el.querySelector('[data-confirm]').addEventListener('click', () => { close(); resolve(true); });
    el.querySelectorAll('[data-close-modal]').forEach(b => b.addEventListener('click', () => resolve(false)));
  });

  /* ---------- pagination ---------- */

  AdminUI.pagination = (el, page, totalPages, onChange) => {
    if (!el) return;
    if (totalPages <= 1) { el.innerHTML = ''; return; }
    const mk = (p, label, disabled, active) => `<button class="btn-admin btn-ghost btn-sm" ${disabled ? 'disabled' : ''} data-page="${p}" style="${active ? 'border-color:var(--gold);color:var(--gold-light)' : ''}">${label}</button>`;
    el.innerHTML = mk(page - 1, '&laquo;', page <= 1) +
      `<span class="info">Page ${page} of ${totalPages}</span>` +
      mk(page + 1, '&raquo;', page >= totalPages);
    el.querySelectorAll('[data-page]').forEach(b => b.addEventListener('click', () => onChange && onChange(Number(b.dataset.page))));
  };

  /* ---------- empty state ---------- */

  AdminUI.empty = (icon, msg, actions) => `
    <div class="empty-state">
      <ion-icon name="${icon}"></ion-icon>
      <p>${AdminUI.esc(msg)}</p>
      ${actions || ''}
    </div>`;

  /* ---------- CSV export ---------- */

  AdminUI.downloadCSV = (filename, rows) => {
    const csv = rows.map(r => r.map(cell => {
      const s = String(cell == null ? '' : cell);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  };

  /* ---------- charts (pure SVG) ---------- */

  /* Bar chart. data: [{label, value, color?}] */
  AdminUI.barChart = (el, data, opts) => {
    opts = opts || {};
    if (!data || !data.length) { el.innerHTML = AdminUI.empty('bar-chart-outline', 'No data to display.'); return; }
    const w = opts.width || 520, h = opts.height || 220, padL = 46, padR = 10, padT = 16, padB = 34;
    const max = Math.max(1, ...data.map(d => d.value));
    const bw = (w - padL - padR) / data.length;
    const bars = data.map((d, i) => {
      const bh = Math.max(2, (d.value / max) * (h - padT - padB));
      const x = padL + i * bw + bw * 0.18;
      const y = h - padB - bh;
      return `<rect x="${x}" y="${y}" width="${bw * 0.64}" height="${bh}" rx="3" fill="${d.color || '#b8874a'}" opacity=".9">
        <title>${AdminUI.esc(d.label)}: ${d.value}</title></rect>` +
        `<text x="${padL + i * bw + bw / 2}" y="${h - padB + 16}" text-anchor="middle" font-size="10" fill="#9aa3b2">${AdminUI.esc(d.label)}</text>` +
        `<text x="${x + bw * 0.32}" y="${y - 5}" text-anchor="middle" font-size="10" fill="#e8e6e1">${d.value}</text>`;
    }).join('');
    let grid = '';
    for (let i = 0; i <= 4; i++) {
      const gy = padT + ((h - padT - padB) / 4) * i;
      const val = Math.round(max - (max / 4) * i);
      grid += `<line x1="${padL}" y1="${gy}" x2="${w - padR}" y2="${gy}" stroke="#232833" stroke-width="1"/>
        <text x="${padL - 6}" y="${gy + 3}" text-anchor="end" font-size="10" fill="#6b7484">${val}</text>`;
    }
    el.innerHTML = `<div class="chart-wrap"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="chart">${grid}${bars}</svg></div>`;
  };

  /* Line chart. data: [{label, value}] */
  AdminUI.lineChart = (el, data, opts) => {
    opts = opts || {};
    if (!data || !data.length) { el.innerHTML = AdminUI.empty('analytics-outline', 'No data to display.'); return; }
    const w = opts.width || 520, h = opts.height || 220, padL = 46, padR = 10, padT = 16, padB = 30;
    const max = Math.max(1, ...data.map(d => d.value));
    const step = (w - padL - padR) / Math.max(1, data.length - 1);
    const pts = data.map((d, i) => [padL + i * step, h - padB - (d.value / max) * (h - padT - padB)]);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const area = line + ` L${pts[pts.length - 1][0].toFixed(1)} ${h - padB} L${pts[0][0].toFixed(1)} ${h - padB} Z`;
    const dots = pts.map((p, i) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.5" fill="#b8874a"><title>${AdminUI.esc(data[i].label)}: ${data[i].value}</title></circle>`).join('');
    const labels = data.map((d, i) => `<text x="${pts[i][0].toFixed(1)}" y="${h - padB + 16}" text-anchor="middle" font-size="10" fill="#9aa3b2">${AdminUI.esc(d.label)}</text>`).join('');
    let grid = '';
    for (let i = 0; i <= 4; i++) {
      const gy = padT + ((h - padT - padB) / 4) * i;
      grid += `<line x1="${padL}" y1="${gy}" x2="${w - padR}" y2="${gy}" stroke="#232833" stroke-width="1"/>`;
    }
    el.innerHTML = `<div class="chart-wrap"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="chart">
      ${grid}<path d="${area}" fill="rgba(184,135,74,.12)" stroke="none"/>
      <path d="${line}" fill="none" stroke="#b8874a" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>${dots}${labels}
    </svg></div>`;
  };

  /* Donut chart. data: [{label, value, color?}] */
  AdminUI.donutChart = (el, data, opts) => {
    opts = opts || {};
    const total = data.reduce((s, d) => s + d.value, 0);
    if (!total) { el.innerHTML = AdminUI.empty('pie-chart-outline', 'No data to display.'); return; }
    const size = opts.size || 180, r = size / 2 - 14, cx = size / 2, cy = size / 2;
    let angle = -90;
    const colors = ['#b8874a', '#5b9bd5', '#3fae6a', '#d9a13a', '#9d7bdf', '#d55858'];
    const segs = data.map((d, i) => {
      const frac = d.value / total;
      const a1 = (angle / 180) * Math.PI, a2 = ((angle + frac * 360) / 180) * Math.PI;
      const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
      const large = frac > 0.5 ? 1 : 0;
      const c = d.color || colors[i % colors.length];
      const path = `<path d="M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z" fill="${c}"><title>${AdminUI.esc(d.label)}: ${Math.round(frac * 100)}%</title></path>`;
      angle += frac * 360;
      return path;
    }).join('');
    const legend = data.map((d, i) => `<span><span class="dot" style="background:${d.color || colors[i % colors.length]}"></span>${AdminUI.esc(d.label)} <b>${Math.round((d.value / total) * 100)}%</b></span>`).join('');
    el.innerHTML = `<div class="chart-wrap" style="display:flex;flex-wrap:wrap;gap:20px;align-items:center">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${segs}
        <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-size="20" font-weight="700" fill="#e8e6e1">${opts.centerLabel || total}</text>
      </svg>
      <div class="chart-legend">${legend}</div></div>`;
  };

  global.AdminUI = AdminUI;

})(typeof window !== 'undefined' ? window : globalThis);
