/**
 * functions/api/order-notify.js — Cloudflare Pages Function.
 *
 * Same-origin endpoint (/api/order-notify) that the storefront checkout posts
 * a new order to. It forwards the order to a Telegram chat so the shop owner
 * is alerted. The Telegram bot token is read from the environment (set in the
 * Cloudflare Pages dashboard → Settings → Environment Variables) and is NEVER
 * shipped to the browser.
 *
 * Local dev equivalent: api/routes/order-notify.js
 *
 * To deploy on the Pages free tier, this function runs automatically when the
 * site is deployed to Cloudflare Pages — no extra hosting cost.
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  let order = {};
  try {
    order = await request.json();
  } catch (e) {
    return json({ ok: false, delivered: false, error: 'invalid-json' }, 400);
  }

  const token = env.TELEGRAM_BOT_TOKEN;
  const chat = env.TELEGRAM_CHAT_ID;
  if (!token || !chat) {
    /* Don't block checkout if notifications aren't configured yet. */
    return json({ ok: true, delivered: false, reason: 'not-configured' });
  }

  try {
    const text = buildMessage(order);
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true })
    });
    if (!res.ok) return json({ ok: false, delivered: false, error: 'telegram-send-failed' }, 502);
    return json({ ok: true, delivered: true });
  } catch (err) {
    return json({ ok: false, delivered: false, error: err.message }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function buildMessage(order) {
  const currency = order.currency || 'KES';

  /* Generate a fallback order number if none provided */
  if (!order.orderNumber) {
    const d = new Date();
    const ds = String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    order.orderNumber = 'ORD-' + ds + '-' + rand;
  }
  const lines = [
    `🛍️ NEW ORDER — ${order.orderNumber || order.id || 'unknown'}`,
    `Store: ${order.clientId || '—'}`,
    `Name: ${order.customerName || order.name || '—'}`,
    `Phone: ${order.phone || '—'}`,
    `Delivery: ${order.deliveryAddress || order.shippingAddress || order.address || '—'}`,
  ];
  if (order.shipping) lines.push(`Shipping: ${order.shipping}`);
  lines.push('--- items ---');
  (order.items || []).forEach(it => {
    const price = it.price != null ? it.price : (it.product && (it.product.salePrice || it.product.price));
    const name = it.name || (it.product && it.product.name) || 'item';
    const qty = it.quantity != null ? it.quantity : 1;
    const lineTotal = price != null ? price * qty : 0;
    lines.push(`• ${name} × ${qty} = ${formatMoney(lineTotal, currency)}`);
  });
  if (order.note) lines.push(`Note: ${order.note}`);
  const total = order.total != null ? order.total : (order.subtotal != null ? order.subtotal : 0);
  lines.push(`TOTAL: ${formatMoney(total, currency)}`);
  return lines.join('\n');
}

function formatMoney(n, currency) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'KES',
      maximumFractionDigits: 0
    }).format(Number(n) || 0);
  } catch (e) {
    return (Number(n) || 0).toLocaleString() + ' ' + currency;
  }
}
