'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Order, OrderStatus, OrderChannel, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/types';
import { formatEUR } from '@/lib/flavors';

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'Europe/Brussels',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr));
}

type ChannelFilter = 'all' | 'b2c' | 'b2b';

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const router = useRouter();

  const fetchOrders = async () => {
    const res = await fetch('/api/admin/orders');
    if (res.status === 401) { router.push('/admin/login'); return; }
    if (!res.ok) { setError('Erro ao carregar pedidos'); return; }
    const data = await res.json();
    setOrders(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/admin/login', { method: 'DELETE' });
    router.push('/admin/login');
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir o pedido de ${name}? Esta ação não pode ser desfeita.`)) return;
    setDeletingId(id);
    const res = await fetch(`/api/admin/orders/${id}`, { method: 'DELETE' });
    if (res.ok) setOrders((prev) => prev.filter((o) => o.id !== id));
    else alert('Erro ao excluir pedido. Tente novamente.');
    setDeletingId(null);
  };

  const filtered = orders.filter((o) => channelFilter === 'all' || o.channel === channelFilter);

  const statusCounts = filtered.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const b2cCount = orders.filter((o) => o.channel === 'b2c').length;
  const b2bCount = orders.filter((o) => o.channel === 'b2b').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <Image src="/logo.png" alt="Madame Simone" width={140} height={50} className="h-10 w-auto object-contain" />
        <div className="flex items-center gap-2">
          <Link href="/admin/relatorios" className="text-sm text-purple-700 hover:text-purple-900 border border-purple-200 rounded-lg px-3 py-1.5 hover:bg-purple-50 font-medium">
            📊 Relatórios
          </Link>
          <Link href="/admin/configuracoes" className="text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 font-medium">
            ⚙️ Configurações
          </Link>
          <button onClick={fetchOrders} className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50">🔄</button>
          <button onClick={handleLogout} className="text-sm text-red-600 hover:text-red-700 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50">Sair</button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Channel tabs */}
        <div className="flex gap-2 mb-6">
          {([
            { key: 'all', label: `Todos (${orders.length})` },
            { key: 'b2c', label: `🛒 B2C — Cliente Final (${b2cCount})` },
            { key: 'b2b', label: `🏪 B2B — Revenda (${b2bCount})` },
          ] as { key: ChannelFilter; label: string }[]).map((tab) => (
            <button key={tab.key} onClick={() => setChannelFilter(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border-2 ${
                channelFilter === tab.key
                  ? tab.key === 'b2b'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Status counters */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {(Object.keys(ORDER_STATUS_LABELS) as Array<keyof typeof ORDER_STATUS_LABELS>).map((status) => (
            <div key={status} className="card p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{statusCounts[status] || 0}</p>
              <p className="text-xs text-gray-500 mt-1">{ORDER_STATUS_LABELS[status]}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">⏳ Carregando...</div>
        ) : error ? (
          <div className="text-red-600 bg-red-50 p-4 rounded-xl">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">📭</p><p>Nenhum pedido encontrado.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Canal', 'Data/Hora', 'Cliente / Estabelecimento', 'Telefone', 'Comuna', 'Unid.', 'Total €', 'Status', 'Ações'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${
                          order.channel === 'b2b' ? 'bg-blue-100 text-blue-800' : 'bg-red-50 text-red-700'
                        }`}>
                          {order.channel === 'b2b' ? '🏪 B2B' : '🛒 B2C'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600 text-xs">{formatDate(order.created_at)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {order.establishment_name ? (
                          <div>
                            <p className="font-bold">{order.establishment_name}</p>
                            <p className="text-xs text-gray-500">{order.customer_name}</p>
                          </div>
                        ) : order.customer_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <a href={`https://wa.me/${order.customer_phone_e164.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-800 font-mono text-xs underline">{order.customer_phone_e164}</a>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{order.address_city}</td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-900">{order.total_units}</td>
                      <td className="px-4 py-3 font-bold text-brand-600 whitespace-nowrap">
                        {formatEUR(order.total_price_eur_cents + (order.freight_eur_cents || 0))}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${ORDER_STATUS_COLORS[order.status as OrderStatus]}`}>
                          {ORDER_STATUS_LABELS[order.status as OrderStatus]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link href={`/admin/pedidos/${order.id}`} className="text-brand-600 hover:text-brand-800 font-semibold text-xs whitespace-nowrap">Ver →</Link>
                          <button onClick={() => handleDelete(order.id, order.establishment_name || order.customer_name)}
                            disabled={deletingId === order.id}
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded-lg transition-colors disabled:opacity-40" title="Excluir">
                            {deletingId === order.id ? '⏳' : '🗑️'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
