'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Order, OrderStatus, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/types';
import { formatEUR } from '@/lib/flavors';

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'Europe/Brussels',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(new Date(dateStr));
}

function makeWhatsAppLink(phoneE164: string): string {
  return `https://wa.me/${phoneE164.replace(/\D/g, '')}`;
}

const SHOWN_STATUSES: OrderStatus[] = ['novo', 'entregue', 'cancelado'];

export default function OrderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchOrder(); }, [id]);

  const fetchOrder = async () => {
    const res = await fetch(`/api/admin/orders/${id}`);
    if (res.status === 401) { router.push('/admin/login'); return; }
    if (!res.ok) { setError('Pedido não encontrado'); setLoading(false); return; }
    const data = await res.json();
    setOrder(data);
    setLoading(false);
  };

  const updateStatus = async (newStatus: OrderStatus) => {
    if (!order) return;
    setUpdating(true);
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) setOrder((prev) => prev ? { ...prev, status: newStatus } : prev);
    else setError('Erro ao atualizar status');
    setUpdating(false);
  };

  const handleDelete = async () => {
    if (!order) return;
    if (!confirm(`Excluir o pedido de ${order.customer_name}? Esta ação não pode ser desfeita.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/orders/${id}`, { method: 'DELETE' });
    if (res.ok) router.push('/admin');
    else { setError('Erro ao excluir pedido'); setDeleting(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">⏳ Carregando...</div>;
  if (error || !order) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-600 mb-4">{error || 'Pedido não encontrado'}</p>
        <Link href="/admin" className="btn-secondary">← Voltar</Link>
      </div>
    </div>
  );

  const shortId = order.id.substring(0, 8).toUpperCase();
  const freightCents = order.freight_eur_cents || 0;
  const grandTotal = order.total_price_eur_cents + freightCents;
  const isB2B = order.channel === 'b2b';

  // Troco calculation
  const temMaos = order.change_amount_eur_cents || 0;
  const trocoALevar = Math.max(0, temMaos - grandTotal);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-30 shadow-sm">
        <Link href="/admin" className="text-gray-500 hover:text-gray-700">← Pedidos</Link>
        <span className="text-gray-300">|</span>
        <h1 className="font-bold text-gray-900">Pedido #{shortId}</h1>
        {isB2B && (
          <span className="inline-flex px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">🏪 B2B</span>
        )}
        <span className={`ml-auto inline-flex px-3 py-1 rounded-full text-sm font-semibold ${ORDER_STATUS_COLORS[order.status]}`}>
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <a href={makeWhatsAppLink(order.customer_phone_e164)} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-sm">
            💬 WhatsApp do cliente
          </a>
          {!isB2B && (
            <button onClick={() => window.open(`/admin/pedidos/${id}/bon`, '_blank')}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-sm">
              🖨️ Bon de Commande (PDF)
            </button>
          )}
          {isB2B && (
            <button onClick={() => window.open(`/admin/pedidos/${id}/bon-revenda`, '_blank')}
              className="flex items-center gap-2 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-sm"
              style={{ background: 'linear-gradient(135deg, #0EA5E9, #0369A1)' }}>
              🖨️ Bon de Commande B2B (PDF)
            </button>
          )}
        </div>

        {/* Status */}
        <div className="card p-5">
          <h2 className="font-bold text-gray-800 mb-4">Alterar Status</h2>
          <div className="flex flex-wrap gap-2">
            {SHOWN_STATUSES.map((status) => (
              <button key={status} onClick={() => updateStatus(status)}
                disabled={updating || order.status === status}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border-2 ${
                  order.status === status
                    ? ORDER_STATUS_COLORS[status] + ' border-transparent cursor-default'
                    : 'border-gray-200 text-gray-600 hover:border-gray-400 disabled:opacity-50'
                }`}>
                {ORDER_STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </div>

        {/* Customer */}
        <div className="card p-5">
          <h2 className="font-bold text-gray-800 mb-4">
            {isB2B ? '🏪 Dados do Estabelecimento' : '👤 Dados do Cliente'}
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">

            {/* B2B fields */}
            {isB2B && order.establishment_name && (
              <div>
                <dt className="text-gray-500 text-xs uppercase tracking-wide">Estabelecimento</dt>
                <dd className="font-semibold text-gray-900 mt-1">{order.establishment_name}</dd>
              </div>
            )}
            {isB2B && (
              <div>
                <dt className="text-gray-500 text-xs uppercase tracking-wide">Contato Responsável</dt>
                <dd className="font-semibold text-gray-900 mt-1">{order.customer_name}</dd>
              </div>
            )}

            {/* B2C name — só mostra se NÃO for B2B */}
            {!isB2B && (
              <div>
                <dt className="text-gray-500 text-xs uppercase tracking-wide">Nome</dt>
                <dd className="font-semibold text-gray-900 mt-1">{order.customer_name}</dd>
              </div>
            )}

            <div>
              <dt className="text-gray-500 text-xs uppercase tracking-wide">Telefone</dt>
              <dd className="mt-1 flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-900 font-mono">{order.customer_phone_e164}</span>
                <a href={makeWhatsAppLink(order.customer_phone_e164)} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 bg-green-100 text-green-700 hover:bg-green-200 text-xs font-semibold px-2 py-1 rounded-lg">
                  💬 WhatsApp
                </a>
              </dd>
            </div>

            {order.customer_email && (
              <div>
                <dt className="text-gray-500 text-xs uppercase tracking-wide">Email</dt>
                <dd className="font-semibold text-gray-900 mt-1">{order.customer_email}</dd>
              </div>
            )}

            <div className="sm:col-span-2">
              <dt className="text-gray-500 text-xs uppercase tracking-wide">Endereço</dt>
              <dd className="font-semibold text-gray-900 mt-1">
                {order.address_street}, {order.address_number} — {order.address_postal_code} {order.address_city}, Bélgica
              </dd>
            </div>

            <div>
              <dt className="text-gray-500 text-xs uppercase tracking-wide">Troco</dt>
              <dd className="font-semibold text-gray-900 mt-1">
                {order.needs_change
                  ? `Sim — Cliente tem ${formatEUR(temMaos)} em mãos — Levar ${formatEUR(trocoALevar)} de troco`
                  : 'Não precisa'}
              </dd>
            </div>

            <div>
              <dt className="text-gray-500 text-xs uppercase tracking-wide">Data e hora que foi feito o pedido</dt>
              <dd className="font-semibold text-gray-900 mt-1">{formatDate(order.created_at)}</dd>
            </div>

            {order.notes && (
              <div className="sm:col-span-2">
                <dt className="text-gray-500 text-xs uppercase tracking-wide">Observações</dt>
                <dd className="text-gray-700 mt-1 italic">{order.notes}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Items */}
        <div className="card p-5">
          <h2 className="font-bold text-gray-800 mb-4">🍭 Itens do Pedido</h2>
          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left pb-2 text-gray-500 font-medium">Sabor</th>
                <th className="text-center pb-2 text-gray-500 font-medium">Qtd</th>
                <th className="text-right pb-2 text-gray-500 font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(order.order_items || []).map((item) => (
                <tr key={item.id}>
                  <td className="py-2 text-gray-800">{item.flavor_name}</td>
                  <td className="py-2 text-center font-semibold">{item.quantity}</td>
                  <td className="py-2 text-right text-gray-800">{formatEUR(item.line_total_eur_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t-2 border-gray-200 pt-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal ({order.total_units} unidades)</span>
              <span className="font-bold">{formatEUR(order.total_price_eur_cents)}</span>
            </div>
            {freightCents > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Frete</span>
                <span className="font-bold">{formatEUR(freightCents)}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold border-t border-gray-200 pt-2">
              <span>TOTAL</span>
              <span className="text-brand-600">{formatEUR(grandTotal)}</span>
            </div>
          </div>
        </div>

        <div className="card p-4 bg-gray-50">
          <p className="text-xs text-gray-400">ID: <span className="font-mono">{order.id}</span></p>
        </div>

        {/* Delete */}
        <div className="border-t border-gray-200 pt-6 pb-10">
          <button onClick={handleDelete} disabled={deleting}
            className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-3 px-6 rounded-xl border border-red-200 transition-all disabled:opacity-50">
            {deleting ? '⏳ Excluindo...' : '🗑️ Excluir este pedido permanentemente'}
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">Esta ação não pode ser desfeita.</p>
        </div>
      </div>
    </div>
  );
}
