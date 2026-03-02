import { Order, OrderItem, PAYMENT_METHOD_LABELS } from '@/types';

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatEURFromCents(cents: number): string {
  return new Intl.NumberFormat('de-BE', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

export async function sendTelegramNotification(
  order: Order,
  items: OrderItem[]
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn('Telegram not configured, skipping notification');
    return;
  }

  const address = [
    escapeHTML(order.address_street),
    escapeHTML(order.address_number),
    order.address_unit ? `, ${escapeHTML(order.address_unit)}` : '',
    ` — ${escapeHTML(order.address_postal_code)} ${escapeHTML(order.address_city)}`,
    ', Bélgica',
  ].join('');

  const itemLines = items
    .map((item) => `  • ${escapeHTML(item.flavor_name)} — ${item.quantity} un.`)
    .join('\n');

  const paymentLabel = PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method;

  const shortId = order.id.substring(0, 8).toUpperCase();

  const message = `
🧊 <b>NOVO PEDIDO #${escapeHTML(shortId)}</b>

👤 <b>Cliente:</b> ${escapeHTML(order.customer_name)}
📱 <b>Telefone:</b> <code>${escapeHTML(order.customer_phone_e164)}</code>
📍 <b>Endereço:</b> ${address}
💳 <b>Pagamento:</b> ${escapeHTML(paymentLabel)}

🍭 <b>Itens:</b>
${itemLines}

📦 <b>Total:</b> ${order.total_units} unidades
💰 <b>Valor:</b> ${formatEURFromCents(order.total_price_eur_cents)}${
    order.notes ? `\n\n📝 <b>Obs:</b> ${escapeHTML(order.notes)}` : ''
  }
`.trim();

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Telegram error:', err);
    }
  } catch (error) {
    console.error('Failed to send Telegram notification:', error);
  }
}
