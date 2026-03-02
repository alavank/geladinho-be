'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Order, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, PAYMENT_METHOD_LABELS } from '@/types';
import { formatEUR } from '@/lib/flavors';

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'Europe/Brussels',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  const fetchOrders = async () => {
    const res = await fetch('/api/admin/orders');
    if (res.status === 401) {
      router.push('/admin/login');
      return;
    }
    if (!res.ok) {
      setError('Erro ao carregar pedidos');
      return;
    }
    const data = await res.json();
    setOrders(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/admin/login', { method: 'DELETE' });
    router.push('/admin/login');
  };

  const statusCounts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🧊</span>
          <div>
            <h1 className="font-bold text-gray-900">Painel Admin</h1>
            <p className="text-xs text-gray-500">Geladinho BE</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchOrders}
            className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50"
          >
            🔄 Atualizar
          </button>
          <button
            onClick={handleLogout}
            className="text-sm text-red-600 hover:text-red-700 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
          {(Object.keys(ORDER_STATUS_LABELS) as Array<keyof typeof ORDER_STATUS_LABELS>).map((status) => (
            <div key={status} className="card p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{statusCounts[status] || 0}</p>
              <p className="text-xs text-gray-500 mt-1">{ORDER_STATUS_LABELS[status]}</p>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Todos os Pedidos ({orders.length})
        </h2>

        {loading ? (
          <div className="text-center py-12 text-gray-400">⏳ Carregando...</div>
        ) : error ? (
          <div className="text-red-600 bg-red-50 p-4 rounded-xl">{error}</div>
        ) : orders.length === 0 ? (
          <div className="card p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">📭</p>
            <p>Nenhum pedido ainda.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Data/Hora', 'Nome', 'Telefone', 'Cidade', 'Pagamento', 'Unid.', 'Total €', 'Status', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600 text-xs">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                        {order.customer_name}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap font-mono text-xs">
                        {order.customer_phone_e164}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {order.address_city}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                        {PAYMENT_METHOD_LABELS[order.payment_method]}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-900">
                        {order.total_units}
                      </td>
                      <td className="px-4 py-3 font-bold text-brand-600 whitespace-nowrap">
                        {formatEUR(order.total_price_eur_cents)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${ORDER_STATUS_COLORS[order.status]}`}>
                          {ORDER_STATUS_LABELS[order.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/pedidos/${order.id}`}
                          className="text-brand-600 hover:text-brand-800 font-semibold text-xs whitespace-nowrap"
                        >
                          Ver →
                        </Link>
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
