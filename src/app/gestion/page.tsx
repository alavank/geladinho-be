'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminHeader from '@/components/AdminHeader';
import { useIsAdminModuleActive } from '@/components/gestion/AdminShellContext';
import { hasStructuredAddress } from '@/lib/address';
import {
  getCustomerDisplayName,
  getCustomerFullAddress,
  getCustomerLinkDraft,
} from '@/lib/customers';
import { formatEUR } from '@/lib/flavors';
import { DEFAULT_ORDER_STATUS_CONFIGS, getStatusBadgeStyle, getStatusConfig } from '@/lib/orders';
import { Customer, Order, OrderStatusConfig } from '@/types';

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

function getOrderDisplayName(order: Order) {
  if (order.establishment_name) {
    return `${order.establishment_name} (${order.customer_name})`;
  }
  return order.customer_name;
}

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [statusConfigs, setStatusConfigs] = useState<OrderStatusConfig[]>(DEFAULT_ORDER_STATUS_CONFIGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [linkingOrder, setLinkingOrder] = useState<Order | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [bindingOrderId, setBindingOrderId] = useState<string | null>(null);
  const [bindingError, setBindingError] = useState('');
  const router = useRouter();
  const isActiveModule = useIsAdminModuleActive('/gestion');
  const lastFetchedAtRef = useRef(0);

  const fetchOrders = useCallback(async (force = false) => {
    if (!force && lastFetchedAtRef.current > 0 && Date.now() - lastFetchedAtRef.current < 15000) {
      return;
    }

    const [ordersResponse, statusesResponse, customersResponse] = await Promise.all([
      fetch('/api/gestion/orders'),
      fetch('/api/gestion/order-statuses'),
      fetch('/api/gestion/customers'),
    ]);

    if (
      ordersResponse.status === 401 ||
      statusesResponse.status === 401 ||
      customersResponse.status === 401
    ) {
      router.push('/gestion/login');
      return;
    }

    if (!ordersResponse.ok) {
      setError('Erro ao carregar pedidos');
      setLoading(false);
      return;
    }

    setOrders(await ordersResponse.json());

    if (statusesResponse.ok) {
      const nextConfigs = await statusesResponse.json();
      if (Array.isArray(nextConfigs) && nextConfigs.length > 0) {
        setStatusConfigs(nextConfigs);
      }
    }

    if (customersResponse.ok) {
      setCustomers(await customersResponse.json());
    }

    lastFetchedAtRef.current = Date.now();
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (!isActiveModule) return;

    void fetchOrders();
    const interval = setInterval(() => { void fetchOrders(true); }, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders, isActiveModule]);

  const handleLogout = async () => {
    await fetch('/api/gestion/login', { method: 'DELETE' });
    router.push('/gestion/login');
  };


  const handleOpenBindingModal = (order: Order) => {
    setLinkingOrder(order);
    setSelectedCustomerId(order.customer_id || '');
    setBindingError('');
    setBindingOrderId(null);
  };

  const handleCloseBindingModal = () => {
    setLinkingOrder(null);
    setSelectedCustomerId('');
    setBindingError('');
    setBindingOrderId(null);
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

  const modalCustomers = useMemo(() => {
    if (!linkingOrder) return [];
    return customers.filter((customer) => customer.type === linkingOrder.channel && customer.active);
  }, [customers, linkingOrder]);

  const selectedCustomer = modalCustomers.find((customer) => customer.id === selectedCustomerId) || null;
  const selectedCustomerHasStructuredAddress =
    !!selectedCustomer &&
    hasStructuredAddress({
      street: selectedCustomer.address_street || '',
      number: selectedCustomer.address_number || '',
      postalCode: selectedCustomer.address_postal_code || '',
      city: selectedCustomer.address_city || '',
    });

  const handleConfirmBinding = async () => {
    if (!linkingOrder || !selectedCustomer) return;
    if (!selectedCustomerHasStructuredAddress) {
      setBindingError('Este cliente ainda nao tem endereco estruturado completo.');
      return;
    }

    const confirmMessage = `Tem certeza que deseja substituir o cliente "${getOrderDisplayName(linkingOrder)}" por "${getCustomerDisplayName(selectedCustomer)}"?`;
    if (!confirm(confirmMessage)) return;

    const draft = getCustomerLinkDraft(selectedCustomer);
    setBindingOrderId(linkingOrder.id);
    setBindingError('');

    const response = await fetch(`/api/gestion/orders/${linkingOrder.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: draft.customer_id,
        customer_name: draft.customer_name,
        establishment_name: linkingOrder.channel === 'b2b' ? draft.establishment_name : null,
        customer_phone: draft.customer_phone,
        customer_email: draft.customer_email,
        address_street: draft.address_street,
        address_number: draft.address_number,
        address_postal_code: draft.address_postal_code,
        address_city: draft.address_city,
        address_country: 'Belgium',
        notes: draft.notes,
      }),
    });

    if (response.ok) {
      const updatedOrder = await response.json();
      setOrders((prev) => prev.map((order) => (
        order.id === linkingOrder.id ? { ...order, ...updatedOrder } : order
      )));
      handleCloseBindingModal();
      return;
    }

    const data = await response.json().catch(() => ({}));
    setBindingError(data.error || 'Erro ao vincular cliente');
    setBindingOrderId(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader
        breadcrumbs={[{ label: 'Pedidos' }]}
        actions={
          <>
            <button onClick={() => void fetchOrders(true)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700">
              Atualizar
            </button>
            <button onClick={handleLogout} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 hover:text-red-700">
              Sair
            </button>
          </>
        }
      />

      <div className="mx-auto max-w-7xl px-4 py-8">
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
            <p className="mb-3 text-4xl">Pedidos</p>
            <p>Nenhum pedido encontrado.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    {['Canal', 'Data/Hora', 'Cliente / Estabelecimento', 'Telefone', 'Comuna', 'Unid.', 'Total EUR', 'Status', 'Acoes'].map((header) => (
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
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenBindingModal(order)}
                            className="rounded-lg border border-blue-200 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                          >
                            Vincular
                          </button>
                          <Link href={`/gestion/pedidos/${order.id}`} scroll={false} className="whitespace-nowrap text-xs font-semibold text-brand-600 hover:text-brand-800">
                            Ver →
                          </Link>
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

      {linkingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Vincular cliente</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Substituir o cliente atual <span className="font-semibold text-gray-700">{getOrderDisplayName(linkingOrder)}</span> por um cadastro estruturado.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseBindingModal}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              >
                Fechar
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
                <p><span className="font-semibold text-gray-800">Cliente atual:</span> {getOrderDisplayName(linkingOrder)}</p>
                <p className="mt-1"><span className="font-semibold text-gray-800">Endereco atual:</span> {linkingOrder.address_street} {linkingOrder.address_number}, {linkingOrder.address_postal_code} {linkingOrder.address_city}</p>
              </div>

              <div>
                <label className="label">Substituir por:</label>
                <select
                  value={selectedCustomerId}
                  onChange={(event) => {
                    setSelectedCustomerId(event.target.value);
                    setBindingError('');
                  }}
                  className="input-field"
                >
                  <option value="">Selecione um cliente cadastrado</option>
                  {modalCustomers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {getCustomerDisplayName(customer)}
                    </option>
                  ))}
                </select>
              </div>

              {modalCustomers.length === 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Nenhum cliente cadastrado para este tipo de pedido. Cadastre primeiro em <Link href="/gestion/clientes" scroll={false} className="font-semibold underline">Clientes</Link>.
                </div>
              )}

              {selectedCustomer && (
                <div className="rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm text-brand-900">
                  <p className="font-semibold">{getCustomerDisplayName(selectedCustomer)}</p>
                  <p className="mt-1">{selectedCustomer.phone_e164}</p>
                  {selectedCustomer.email && <p className="mt-1">{selectedCustomer.email}</p>}
                  <p className="mt-1">{getCustomerFullAddress(selectedCustomer) || 'Endereco nao estruturado'}</p>
                  {!selectedCustomerHasStructuredAddress && (
                    <p className="mt-2 text-xs text-red-600">
                      Este cliente ainda nao tem endereco estruturado completo. Edite o cadastro dele antes de confirmar.
                    </p>
                  )}
                </div>
              )}

              {bindingError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {bindingError}
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseBindingModal}
                  className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirmBinding()}
                  disabled={!selectedCustomer || !selectedCustomerHasStructuredAddress || bindingOrderId === linkingOrder.id}
                  className="btn-primary px-5 py-2.5 text-sm disabled:opacity-50"
                >
                  {bindingOrderId === linkingOrder.id ? 'Vinculando...' : 'Confirmar substituicao'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
