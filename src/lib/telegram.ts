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

  const address = `${escapeHTML(order.address_street)}, ${escapeHTML(order.address_number)} — ${escapeHTML(order.address_postal_code)} ${escapeHTML(order.address_city)}`;
  const itemLines = items.map((i) => `  • ${escapeHTML(i.flavor_name)} — ${i.quantity} un.`).join('\n');
  const shortId = order.id.substring(0, 8).toUpperCase();

  const trocoLine = order.needs_change
    ? `\n💵 <b>Troco:</b> Sim — tem ${formatEURFromCents(order.change_amount_eur_cents || 0)} em mãos`
    : '\n💵 <b>Troco:</b> Não precisa';

  const message = `
🧊 <b>NOVO PEDIDO #${escapeHTML(shortId)}</b>

👤 <b>Cliente:</b> ${escapeHTML(order.customer_name)}
📱 <b>Telefone:</b> <code>${escapeHTML(order.customer_phone_e164)}</code>
📍 <b>Endereço:</b> ${address}${trocoLine}

🍭 <b>Itens:</b>
${itemLines}

📦 <b>Total:</b> ${order.total_units} unidades
💰 <b>Valor:</b> ${formatEURFromCents(order.total_price_eur_cents)}${order.notes ? `\n\n📝 <b>Obs:</b> ${escapeHTML(order.notes)}` : ''}
`.trim();

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
    });
    if (!res.ok) console.error('Telegram error:', await res.text());
  } catch (error) {
    console.error('Failed to send Telegram notification:', error);
  }
}
