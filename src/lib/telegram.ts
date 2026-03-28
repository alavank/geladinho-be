import { Order, OrderItem } from '@/types';

function escapeHTML(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatEURFromCents(cents: number): string {
  return new Intl.NumberFormat('de-BE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export async function sendTelegramNotification(order: Order, items: OrderItem[]): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) { console.warn('Telegram not configured'); return; }

  const isB2B = order.channel === 'b2b';
  const address = `${escapeHTML(order.address_street)}, ${escapeHTML(order.address_number)} — ${escapeHTML(order.address_postal_code)} ${escapeHTML(order.address_city)}`;
  const itemLines = items.map((i) => `  • ${escapeHTML(i.flavor_name)} — ${i.quantity} un.`).join('\n');
  const shortId = order.id.substring(0, 8).toUpperCase();
  const freightCents = order.freight_eur_cents || 0;
  const grandTotal = order.total_price_eur_cents + freightCents;

  const trocoLine = order.needs_change
    ? `\n💵 <b>Troco:</b> Sim — tem ${formatEURFromCents(order.change_amount_eur_cents || 0)} em mãos`
    : '\n💵 <b>Troco:</b> Não precisa';

  const header = isB2B
    ? `🏪 <b>NOVO PEDIDO B2B — REVENDA #${escapeHTML(shortId)}</b>`
    : `🧊 <b>NOVO PEDIDO B2C #${escapeHTML(shortId)}</b>`;

  const clienteLine = isB2B
    ? `🏪 <b>Estabelecimento:</b> ${escapeHTML(order.establishment_name || order.customer_name)}\n👤 <b>Contato:</b> ${escapeHTML(order.customer_name)}`
    : `👤 <b>Cliente:</b> ${escapeHTML(order.customer_name)}`;

  const emailLine = order.customer_email ? `\n📧 <b>Email:</b> ${escapeHTML(order.customer_email)}` : '';

  const message = `
${header}

${clienteLine}
📱 <b>Telefone:</b> <code>${escapeHTML(order.customer_phone_e164)}</code>${emailLine}
📍 <b>Endereço:</b> ${address}${trocoLine}

🍭 <b>Itens:</b>
${itemLines}

📦 <b>Total:</b> ${order.total_units} unidades
${freightCents > 0 ? `🚚 <b>Frete:</b> ${formatEURFromCents(freightCents)}\n` : ''}💰 <b>Valor:</b> ${formatEURFromCents(grandTotal)}${order.notes ? `\n\n📝 <b>Obs:</b> ${escapeHTML(order.notes)}` : ''}
`.trim();

  await sendTelegramMessage(message);
}

export async function sendFreightUpdateNotification(order: Order, items: OrderItem[], newFreightCents: number): Promise<void> {
  const isB2B = order.channel === 'b2b';
  if (!isB2B) return;

  const shortId = order.id.substring(0, 8).toUpperCase();
  const address = `${escapeHTML(order.address_street)}, ${escapeHTML(order.address_number)} — ${escapeHTML(order.address_postal_code)} ${escapeHTML(order.address_city)}`;
  const itemLines = items.map((i) => `  • ${escapeHTML(i.flavor_name)} — ${i.quantity} un.`).join('\n');
  const grandTotal = order.total_price_eur_cents + newFreightCents;

  const trocoLine = order.needs_change
    ? `\n💵 <b>Troco:</b> Sim — tem ${formatEURFromCents(order.change_amount_eur_cents || 0)} em mãos`
    : '\n💵 <b>Troco:</b> Não precisa';

  const clienteLine = `🏪 <b>Estabelecimento:</b> ${escapeHTML(order.establishment_name || order.customer_name)}\n👤 <b>Contato:</b> ${escapeHTML(order.customer_name)}`;
  const emailLine = order.customer_email ? `\n📧 <b>Email:</b> ${escapeHTML(order.customer_email)}` : '';

  const message = `
⚠️ <b>ATENÇÃO — DESCONSIDERAR MENSAGEM ANTERIOR DO PEDIDO #${escapeHTML(shortId)}</b>

🚚 <b>Frete adicionado ao pedido. Considere esta mensagem como a versão atualizada.</b>

🏪 <b>PEDIDO B2B — REVENDA #${escapeHTML(shortId)} (ATUALIZADO)</b>

${clienteLine}
📱 <b>Telefone:</b> <code>${escapeHTML(order.customer_phone_e164)}</code>${emailLine}
📍 <b>Endereço:</b> ${address}${trocoLine}

🍭 <b>Itens:</b>
${itemLines}

📦 <b>Total:</b> ${order.total_units} unidades
🚚 <b>Frete:</b> ${formatEURFromCents(newFreightCents)}
💰 <b>Valor:</b> ${formatEURFromCents(grandTotal)}${order.notes ? `\n\n📝 <b>Obs:</b> ${escapeHTML(order.notes)}` : ''}
`.trim();

  await sendTelegramMessage(message);
}

async function sendTelegramMessage(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) { console.warn('Telegram not configured'); return; }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
    if (!res.ok) console.error('Telegram error:', await res.text());
  } catch (error) {
    console.error('Failed to send Telegram notification:', error);
  }
}
