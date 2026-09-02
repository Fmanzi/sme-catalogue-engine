const { Router } = require('express');

const router = Router();

/*
 * Order notify — the storefront posts a new order here so the shop owner is
 * alerted. This mirrors the Cloudflare Pages Function (functions/api/
 * order-notify.js) and the Worker route, so local dev behaves like production.
 *
 * The Telegram bot token is read server-side from api/.env — it is NEVER
 * shipped to the browser. If the token isn't configured, the endpoint is a
 * no-op that still reports ok (we don't want to block a customer checkout
 * because notifications aren't set up yet).
 */

function telegramSettings() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  const enabled = Boolean(token && chat);
  return { token, chat, enabled };
}

function buildMessage(order) {
  const currency = order.currency || 'KES';
  const lines = [
    `🛍️ NEW ORDER — ${order.orderNumber || order.id || 'unknown'}`,
    `Store: ${order.clientId || '—'}`,
    `Name: ${order.customerName || order.name || '—'}`,
    `Phone: ${order.phone || '—'}`,
    `Delivery: ${order.deliveryAddress || order.shippingAddress || order.address || '—'}`,
    '--- items ---'
  ];
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

/* Lightweight money formatting for the notification (no UI dependency here). */
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

router.post('/', async (req, res) => {
  const order = req.body || {};
  const { token, chat, enabled } = telegramSettings();

  if (!enabled) {
    console.log('[order-notify] Telegram not configured — notification skipped.');
    return res.json({ ok: true, delivered: false, reason: 'not-configured' });
  }

  try {
    const text = buildMessage(order);
    const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true })
    });
    if (!tg.ok) {
      const body = await tg.text().catch(() => '');
      console.error('[order-notify] Telegram send failed:', tg.status, body);
      return res.status(502).json({ ok: false, delivered: false, error: 'telegram-send-failed' });
    }
    return res.json({ ok: true, delivered: true });
  } catch (err) {
    console.error('[order-notify] Error:', err.message);
    return res.status(500).json({ ok: false, delivered: false, error: err.message });
  }
});

module.exports = router;
