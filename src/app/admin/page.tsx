'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Order, OrderChannel, OrderStatusConfig } from '@/types';
import { formatEUR } from '@/lib/flavors';
import { DEFAULT_ORDER_STATUS_CONFIGS, getStatusBadgeStyle, getStatusConfig } from '@/lib/orders';

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

type ChannelFilter = 'all' | 'b2c' | 'b2b';

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusConfigs, setStatusConfigs] = useState<OrderStatusConfig[]>(DEFAULT_ORDER_STATUS_CONFIGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const router = useRouter();

  const fetchOrders = async () => {
    const [ordersResponse, statusesResponse] = await Promise.all([
      fetch('/api/admin/orders'),
      fetch('/api/admin/order-statuses'),
    ]);

    if (ordersResponse.status === 401 || statusesResponse.status === 401) {
      router.push('/admin/login');
      return;
    }

    if (!ordersResponse.ok) {
      setError('Erro ao carregar pedidos');
      setLoading(false);
      return;
    }

    const nextOrders = await ordersResponse.json();
    setOrders(nextOrders);

    if (statusesResponse.ok) {
      const nextConfigs = await statusesResponse.json();
      if (Array.isArray(nextConfigs) && nextConfigs.length > 0) {
        setStatusConfigs(nextConfigs);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    void fetchOrders();
    const interval = setInterval(() => { void fetchOrders(); }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/admin/login', { method: 'DELETE' });
    router.push('/admin/login');
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir o pedido de ${name}? Esta ação não pode ser desfeita.`)) return;
    setDeletingId(id);
    const response = await fetch(`/api/admin/orders/${id}`, { method: 'DELETE' });
    if (response.ok) {
      setOrders((prev) => prev.filter((order) => order.id !== id));
    } else {
      alert('Erro ao excluir pedido. Tente novamente.');
    }
    setDeletingId(null);
  };

  const filteredOrders = orders.filter((order) => channelFilter === 'all' || order.channel === channelFilter);
  const shownStatuses = statusConfigs
    .filter((config) => config.active)
    .sort((a, b) => a.sort_order - b.sort_order);

  const statusCounts = filteredOrders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const b2cCount = orders.filter((order) => order.channel === 'b2c').length;
  const b2bCount = orders.filter((order) => order.channel === 'b2b').length;

  const adminShortcuts = [
    {
      href: '/admin/clientes',
      title: 'Clientes',
      description: 'Cadastre clientes finais e revendas para reutilizar nos pedidos.',
      accent: 'border-brand-200 bg-brand-50 text-brand-700',
    },
    {
      href: '/admin/gastos/fornecedores',
      title: 'Fornecedores',
      description: 'Centralize os fornecedores e os endereços completos usados nas compras.',
      accent: 'border-blue-200 bg-blue-50 text-blue-700',
    },
    {
      href: '/admin/parametros',
      title: 'Parâmetros',
      description: 'Ajuste tipos de gasto e a apresentação dos status dos pedidos.',
      accent: 'border-amber-200 bg-amber-50 text-amber-700',
    },
    {
      href: '/admin/gastos',
      title: 'Compras e Gastos',
      description: 'Acesse o financeiro com notas, compras completas e leitura automática.',
      accent: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 shadow-sm">
        <Image src="/logo.png" alt="Madame Simone" width={140} height={50} className="h-10 w-auto object-contain" />
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link href="/admin/clientes" className="rounded-lg border border-brand-200 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50 hover:text-brand-900">
            Clientes
          </Link>
          <Link href="/admin/gastos/fornecedores" className="rounded-lg border border-blue-200 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 hover:text-blue-900">
            Fornecedores
          </Link>
          <Link href="/admin/parametros" className="rounded-lg border border-amber-200 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-50 hover:text-amber-900">
            Parâmetros
          </Link>
          <Link href="/admin/gastos" className="rounded-lg border border-orange-200 px-3 py-1.5 text-sm font-medium text-orange-700 hover:bg-orange-50 hover:text-orange-900">
            Gastos
          </Link>
          <Link href="/admin/relatorios" className="rounded-lg border border-purple-200 px-3 py-1.5 text-sm font-medium text-purple-700 hover:bg-purple-50 hover:text-purple-900">
            Relatórios
          </Link>
          <Link href="/admin/configuracoes" className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900">
            Configurações
          </Link>
          <button onClick={() => void fetchOrders()} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700">
            Atualizar
          </button>
          <button onClick={handleLogout} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 hover:text-red-700">
            Sair
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900">Cadastros Gerais</h2>
            <p className="text-sm text-gray-500">Atalhos rápidos para os cadastros principais e parâmetros do sistema.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {adminShortcuts.map((shortcut) => (
              <Link
                key={shortcut.href}
                href={shortcut.href}
                className="card block border border-gray-200 p-5 transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
              >
                <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${shortcut.accent}`}>
                  {shortcut.title}
                </div>
                <p className="mt-4 text-base font-bold text-gray-900">{shortcut.title}</p>
                <p className="mt-2 text-sm leading-6 text-gray-500">{shortcut.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <div className="mb-6 flex flex-wrap gap-2">
          {([
            { key: 'all', label: `Todos (${orders.length})` },
            { key: 'b2c', label: `B2C - Cliente Final (${b2cCount})` },
            { key: 'b2b', label: `B2B - Revenda (${b2bCount})` },
          ] as { key: ChannelFilter; label: string }[]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setChannelFilter(tab.key)}
              className={`rounded-xl border-2 px-4 py-2 text-sm font-semibold transition-all ${
                channelFilter === tab.key
                  ? tab.key === 'b2b'
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-brand-600 bg-brand-600 text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={`mb-6 grid gap-3 ${shownStatuses.length >= 4 ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
          {shownStatuses.map((status) => (
            <div key={status.key} className="card p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{statusCounts[status.key] || 0}</p>
              <p className="mt-1 text-xs font-semibold" style={{ color: status.color }}>{status.label}</p>
            </div>
          ))}
        </div>

        <h2 className="mb-4 text-xl font-bold text-gray-900">Pedidos ({filteredOrders.length})</h2>

        {loading ? (
          <div className="py-12 text-center text-gray-400">Carregando...</div>
        ) : error ? (
          <div className="rounded-xl bg-red-50 p-4 text-red-600">{error}</div>
        ) : filteredOrders.length === 0 ? (
          <div className="card p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">Pedidos</p>
            <p>Nenhum pedido encontrado.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    {['Canal', 'Data/Hora', 'Cliente / Estabelecimento', 'Telefone', 'Comuna', 'Unid.', 'Total EUR', 'Status', 'Ações'].map((header) => (
                      <th key={header} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="transition-colors hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${
                          order.channel === 'b2b' ? 'bg-blue-100 text-blue-800' : 'bg-red-50 text-red-700'
                        }`}>
                          {order.channel === 'b2b' ? 'B2B' : 'B2C'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-600">{formatDate(order.created_at)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {order.establishment_name ? (
                          <div>
                            <p className="font-bold">{order.establishment_name}</p>
                            <p className="text-xs text-gray-500">{order.customer_name}</p>
                          </div>
                        ) : (
                          order.customer_name
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <a
                          href={`https://wa.me/${order.customer_phone_e164.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-green-600 underline hover:text-green-800"
                        >
                          {order.customer_phone_e164}
                        </a>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">{order.address_city}</td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-900">{order.total_units}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-bold text-brand-600">
                        {formatEUR(order.total_price_eur_cents + (order.freight_eur_cents || 0))}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex rounded-full px-2 py-1 text-xs font-semibold"
                          style={getStatusBadgeStyle(order.status, statusConfigs)}
                        >
                          {getStatusConfig(order.status, statusConfigs).label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link href={`/admin/pedidos/${order.id}`} className="whitespace-nowrap text-xs font-semibold text-brand-600 hover:text-brand-800">
                            Ver →
                          </Link>
                          <button
                            onClick={() => void handleDelete(order.id, order.establishment_name || order.customer_name)}
                            disabled={deletingId === order.id}
                            className="rounded-lg p-1 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                            title="Excluir"
                          >
                            {deletingId === order.id ? '...' : 'Excluir'}
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
