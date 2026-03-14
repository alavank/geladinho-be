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

export default function OrderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  // Freight state
  const [freightInput, setFreightInput] = useState('');
  const [freightDirty, setFreightDirty] = useState(false);
  const [savingFreight, setSavingFreight] = useState(false);
  const [freightSaved, setFreightSaved] = useState(false);

  useEffect(() => { fetchOrder(); }, [id]);

  const fetchOrder = async () => {
    const res = await fetch(`/api/admin/orders/${id}`);
    if (res.status === 401) { router.push('/admin/login'); return; }
    if (!res.ok) { setError('Pedido não encontrado'); setLoading(false); return; }
    const data = await res.json();
    setOrder(data);
    setFreightInput(data.freight_eur_cents > 0 ? (data.freight_eur_cents / 100).toFixed(2) : '');
    setLoading(false);
  };

  const updateStatus = async (newStatus: OrderStatus) => {
    if (!order) return;
    setUpdating(true);
    const res = await fetch(`/api/admin/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) setOrder((prev) => prev ? { ...prev, status: newStatus } : prev);
    else setError('Erro ao atualizar status');
    setUpdating(false);
  };

  const saveFreight = async () => {
    if (!order) return;
    setSavingFreight(true);
    const cents = Math.round(parseFloat(freightInput.replace(',', '.') || '0') * 100);
    const res = await fetch(`/api/admin/orders/${id}/freight`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ freightEurCents: isNaN(cents) ? 0 : cents }),
    });
    if (res.ok) {
      setOrder((prev) => prev ? { ...prev, freight_eur_cents: isNaN(cents) ? 0 : cents } : prev);
      setFreightDirty(false);
      setFreightSaved(true);
      setTimeout(() => setFreightSaved(false), 3000);
    } else {
      setError('Erro ao salvar frete');
    }
    setSavingFreight(false);
  };

  const openBonDeCommande = () => {
    window.open(`/admin/pedidos/${id}/bon`, '_blank');
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

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-30 shadow-sm">
        <Link href="/admin" className="text-gray-500 hover:text-gray-700">← Pedidos</Link>
        <span className="text-gray-300">|</span>
        <h1 className="font-bold text-gray-900">Pedido #{shortId}</h1>
        <span className={`ml-auto inline-flex px-3 py-1 rounded-full text-sm font-semibold ${ORDER_STATUS_COLORS[order.status]}`}>
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={openBonDeCommande}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md"
          >
            🖨️ Gerar Bon de Commande (PDF)
          </button>
        </div>

        {/* Status */}
        <div className="card p-5">
          <h2 className="font-bold text-gray-800 mb-4">Alterar Status</h2>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => updateStatus(status)}
                disabled={updating || order.status === status}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border-2 ${
                  order.status === status
                    ? ORDER_STATUS_COLORS[status] + ' border-transparent cursor-default'
                    : 'border-gray-200 text-gray-600 hover:border-gray-400 disabled:opacity-50'
                }`}
              >
                {ORDER_STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </div>

        {/* Customer */}
        <div className="card p-5">
          <h2 className="font-bold text-gray-800 mb-4">👤 Dados do Cliente</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500 text-xs uppercase tracking-wide">Nome</dt>
              <dd className="font-semibold text-gray-900 mt-1">{order.customer_name}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs uppercase tracking-wide">Telefone (WhatsApp)</dt>
              <dd className="font-semibold text-gray-900 mt-1 font-mono">{order.customer_phone_e164}</dd>
            </div>
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
                  ? `Sim — tem ${formatEUR(order.change_amount_eur_cents || 0)} em mãos`
                  : 'Não precisa'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs uppercase tracking-wide">Data/Hora (Bruxelas)</dt>
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

        {/* Items + Freight */}
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

          {/* Totals section */}
          <div className="border-t-2 border-gray-200 pt-4 space-y-3">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal ({order.total_units} unidades)</span>
              <span className="font-bold">{formatEUR(order.total_price_eur_cents)}</span>
            </div>

            {/* Freight row */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 shrink-0">Valor do frete</span>
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-gray-400 text-sm">€</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  value={freightInput}
                  onChange={(e) => { setFreightInput(e.target.value); setFreightDirty(true); setFreightSaved(false); }}
                  className="w-24 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
                <button
                  onClick={saveFreight}
                  disabled={savingFreight || !freightDirty}
                  className="bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all whitespace-nowrap"
                >
                  {savingFreight ? '...' : 'Adicionar Frete'}
                </button>
              </div>
            </div>

            {freightSaved && (
              <p className="text-green-600 text-xs text-right">✅ Frete salvo com sucesso!</p>
            )}

            {/* Grand total */}
            <div className="flex justify-between text-xl font-bold border-t border-gray-200 pt-3">
              <span>TOTAL GERAL</span>
              <span className="text-brand-600">{formatEUR(grandTotal)}</span>
            </div>
          </div>
        </div>

        <div className="card p-4 bg-gray-50">
          <p className="text-xs text-gray-400">ID completo: <span className="font-mono">{order.id}</span></p>
        </div>
      </div>
    </div>
  );
}
