'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { hasStructuredAddress } from '@/lib/address';
import {
  getCustomerDisplayName,
  getCustomerFullAddress,
  getCustomerLinkDraft,
} from '@/lib/customers';
import { formatEUR } from '@/lib/flavors';
import {
  DEFAULT_ORDER_STATUS_CONFIGS,
  formatOrderAddress,
  getStatusBadgeStyle,
  getStatusConfig,
} from '@/lib/orders';
import { Customer, Order, OrderStatus, OrderStatusConfig } from '@/types';

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'Europe/Brussels',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(dateStr));
}

function makeWhatsAppLink(phoneE164: string): string {
  return `https://wa.me/${phoneE164.replace(/\D/g, '')}`;
}

type EditableOrderForm = {
  customer_id: string;
  customer_name: string;
  establishment_name: string;
  customer_phone: string;
  customer_email: string;
  address_full: string;
  address_street: string;
  address_number: string;
  address_postal_code: string;
  address_city: string;
  notes: string;
};

function createFormFromOrder(order: Order): EditableOrderForm {
  return {
    customer_id: order.customer_id || '',
    customer_name: order.customer_name || '',
    establishment_name: order.establishment_name || '',
    customer_phone: order.customer_phone_e164 || '',
    customer_email: order.customer_email || '',
    address_full: formatOrderAddress(order),
    address_street: order.address_street || '',
    address_number: order.address_number || '',
    address_postal_code: order.address_postal_code || '',
    address_city: order.address_city || '',
    notes: order.notes || '',
  };
}

export default function OrderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [statusConfigs, setStatusConfigs] = useState<OrderStatusConfig[]>(DEFAULT_ORDER_STATUS_CONFIGS);
  const [form, setForm] = useState<EditableOrderForm | null>(null);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [customerError, setCustomerError] = useState('');
  const [customerSuccess, setCustomerSuccess] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showFreightInput, setShowFreightInput] = useState(false);
  const [freightValue, setFreightValue] = useState('');
  const [savingFreight, setSavingFreight] = useState(false);
  const [freightSuccess, setFreightSuccess] = useState('');

  const fetchPageData = async () => {
    const [orderResponse, customersResponse, statusesResponse] = await Promise.all([
      fetch(`/api/admin/orders/${id}`),
      fetch('/api/admin/customers'),
      fetch('/api/admin/order-statuses'),
    ]);

    if (
      orderResponse.status === 401 ||
      customersResponse.status === 401 ||
      statusesResponse.status === 401
    ) {
      router.push('/admin/login');
      return;
    }

    if (!orderResponse.ok) {
      setPageError('Pedido nao encontrado');
      setLoading(false);
      return;
    }

    const nextOrder = await orderResponse.json();
    setOrder(nextOrder);
    setForm(createFormFromOrder(nextOrder));

    if (customersResponse.ok) {
      setCustomers(await customersResponse.json());
    }

    if (statusesResponse.ok) {
      const nextConfigs = await statusesResponse.json();
      if (Array.isArray(nextConfigs) && nextConfigs.length > 0) {
        setStatusConfigs(nextConfigs);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    void fetchPageData();
  }, [id]);

  const handleStartEditCustomer = () => {
    if (!order) return;
    setForm(createFormFromOrder(order));
    setCustomerError('');
    setCustomerSuccess('');
    setIsEditingCustomer(true);
  };

  const handleCancelCustomerEdit = () => {
    if (!order) return;
    setForm(createFormFromOrder(order));
    setCustomerError('');
    setIsEditingCustomer(false);
  };

  const updateStatus = async (newStatus: OrderStatus) => {
    if (!order) return;
    setUpdatingStatus(true);
    setPageError('');

    const response = await fetch(`/api/admin/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });

    if (response.ok) {
      const updatedOrder = await response.json();
      setOrder((prev) => (prev ? { ...prev, ...updatedOrder, order_items: prev.order_items } : prev));
    } else {
      const data = await response.json().catch(() => ({}));
      setPageError(data.error || 'Erro ao atualizar status');
    }

    setUpdatingStatus(false);
  };

  const handleSaveCustomerData = async () => {
    if (!order || !form) return;

    setCustomerError('');
    setCustomerSuccess('');

    if (!form.customer_name.trim()) {
      setCustomerError(order.channel === 'b2b' ? 'O contato responsavel e obrigatorio' : 'O nome do cliente e obrigatorio');
      return;
    }

    if (!form.customer_phone.trim()) {
      setCustomerError('O telefone e obrigatorio');
      return;
    }

    if (!form.address_street || !form.address_number || !form.address_postal_code || !form.address_city) {
      setCustomerError('Selecione um endereco completo na lista para salvar o pedido');
      return;
    }

    setSavingCustomer(true);

    const response = await fetch(`/api/admin/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: form.customer_id || null,
        customer_name: form.customer_name,
        establishment_name: order.channel === 'b2b' ? form.establishment_name : null,
        customer_phone: form.customer_phone,
        customer_email: form.customer_email,
        address_street: form.address_street,
        address_number: form.address_number,
        address_postal_code: form.address_postal_code,
        address_city: form.address_city,
        address_country: 'Belgium',
        notes: form.notes,
      }),
    });

    if (response.ok) {
      const updatedOrder = await response.json();
      setOrder((prev) => (prev ? { ...prev, ...updatedOrder, order_items: prev.order_items } : prev));
      const nextMergedOrder = { ...order, ...updatedOrder } as Order;
      setForm(createFormFromOrder(nextMergedOrder));
      setCustomerSuccess('Dados do pedido atualizados com sucesso.');
      setIsEditingCustomer(false);
      setTimeout(() => setCustomerSuccess(''), 4000);
    } else {
      const data = await response.json().catch(() => ({}));
      setCustomerError(data.error || 'Erro ao salvar dados do pedido');
    }

    setSavingCustomer(false);
  };

  const handleDelete = async () => {
    if (!order) return;
    if (!confirm(`Excluir o pedido de ${order.customer_name}? Esta acao nao pode ser desfeita.`)) return;

    setDeleting(true);

    const response = await fetch(`/api/admin/orders/${id}`, { method: 'DELETE' });
    if (response.ok) {
      router.push('/admin');
    } else {
      const data = await response.json().catch(() => ({}));
      setPageError(data.error || 'Erro ao excluir pedido');
      setDeleting(false);
    }
  };

  const saveFreight = async () => {
    if (!order) return;
    const cents = Math.round(parseFloat(freightValue.replace(',', '.')) * 100);

    if (isNaN(cents) || cents <= 0) {
      setPageError('Insira um valor valido para o frete');
      return;
    }

    setSavingFreight(true);
    setPageError('');

    const response = await fetch(`/api/admin/orders/${id}/freight`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ freightEurCents: cents }),
    });

    if (response.ok) {
      setOrder((prev) => (prev ? { ...prev, freight_eur_cents: cents } : prev));
      setShowFreightInput(false);
      setFreightSuccess('Frete salvo com sucesso. Mensagem atualizada enviada.');
      setTimeout(() => setFreightSuccess(''), 4000);
    } else {
      setPageError('Erro ao salvar frete');
    }

    setSavingFreight(false);
  };

  const removeFreight = async () => {
    if (!order) return;
    setSavingFreight(true);
    setPageError('');

    const response = await fetch(`/api/admin/orders/${id}/freight`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ freightEurCents: 0 }),
    });

    if (response.ok) {
      setOrder((prev) => (prev ? { ...prev, freight_eur_cents: 0 } : prev));
      setShowFreightInput(false);
      setFreightValue('');
      setFreightSuccess('Frete removido com sucesso.');
      setTimeout(() => setFreightSuccess(''), 4000);
    } else {
      setPageError('Erro ao remover frete');
    }

    setSavingFreight(false);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Carregando...</div>;
  }

  if (pageError && !order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-red-600">{pageError}</p>
          <Link href="/admin" className="btn-secondary">← Voltar</Link>
        </div>
      </div>
    );
  }

  if (!order || !form) return null;

  const shortId = order.id.substring(0, 8).toUpperCase();
  const freightCents = order.freight_eur_cents || 0;
  const grandTotal = order.total_price_eur_cents + freightCents;
  const isB2B = order.channel === 'b2b';
  const changeInHand = order.change_amount_eur_cents || 0;
  const changeToBring = Math.max(0, changeInHand - grandTotal);
  const currentStatus = getStatusConfig(order.status, statusConfigs);
  const availableStatuses = statusConfigs
    .filter((config) => config.active)
    .sort((a, b) => a.sort_order - b.sort_order);
  const matchingCustomers = customers.filter(
    (customer) => customer.type === order.channel && (customer.active || customer.id === form.customer_id)
  );
  const linkedCustomer = customers.find((customer) => customer.id === order.customer_id) || null;
  const linkedCustomerLabel = linkedCustomer ? getCustomerDisplayName(linkedCustomer) : 'Nao vinculado';
  const formCustomerPreview = matchingCustomers.find((customer) => customer.id === form.customer_id) || null;
  const canBindSelectedCustomer =
    !!formCustomerPreview &&
    hasStructuredAddress({
      street: formCustomerPreview.address_street || '',
      number: formCustomerPreview.address_number || '',
      postalCode: formCustomerPreview.address_postal_code || '',
      city: formCustomerPreview.address_city || '',
    });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
        <Link href="/admin" className="text-gray-500 hover:text-gray-700">← Pedidos</Link>
        <span className="text-gray-300">|</span>
        <h1 className="font-bold text-gray-900">Pedido #{shortId}</h1>
        {isB2B && (
          <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-800">
            B2B
          </span>
        )}
        <span
          className="ml-auto inline-flex rounded-full px-3 py-1 text-sm font-semibold"
          style={getStatusBadgeStyle(order.status, statusConfigs)}
        >
          {currentStatus.label}
        </span>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap gap-3">
          <a
            href={makeWhatsAppLink(order.customer_phone_e164)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl bg-green-500 px-5 py-2.5 font-semibold text-white shadow-sm transition-all hover:bg-green-600"
          >
            WhatsApp do cliente
          </a>
          {!isB2B && (
            <button
              onClick={() => window.open(`/admin/pedidos/${id}/bon`, '_blank')}
              className="flex items-center gap-2 rounded-xl bg-gray-800 px-5 py-2.5 font-semibold text-white shadow-sm transition-all hover:bg-gray-900"
            >
              Bon de Commande (PDF)
            </button>
          )}
          {isB2B && (
            <button
              onClick={() => window.open(`/admin/pedidos/${id}/bon-revenda`, '_blank')}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 font-semibold text-white shadow-sm transition-all"
              style={{ background: 'linear-gradient(135deg, #0EA5E9, #0369A1)' }}
            >
              Bon de Commande B2B (PDF)
            </button>
          )}
        </div>

        {pageError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {pageError}
          </div>
        )}

        <div className="card p-5">
          <h2 className="mb-4 font-bold text-gray-800">Alterar Status</h2>
          <div className="flex flex-wrap gap-2">
            {availableStatuses.map((status) => {
              const selected = order.status === status.key;
              return (
                <button
                  key={status.key}
                  onClick={() => void updateStatus(status.key)}
                  disabled={updatingStatus || selected}
                  className={`rounded-xl border-2 px-4 py-2 text-sm font-semibold transition-all ${
                    selected
                      ? 'cursor-default border-transparent'
                      : 'border-gray-200 text-gray-600 hover:border-gray-400 disabled:opacity-50'
                  }`}
                  style={selected ? getStatusBadgeStyle(status.key, statusConfigs) : undefined}
                >
                  {status.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-gray-800">
                {isB2B ? 'Dados do Estabelecimento' : 'Dados do Cliente'}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {order.customer_id ? `Vinculado a: ${linkedCustomerLabel}` : 'Pedido ainda nao vinculado a um cliente estruturado.'}
              </p>
            </div>

            {!isEditingCustomer ? (
              <button
                type="button"
                onClick={handleStartEditCustomer}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Editar
              </button>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCancelCustomerEdit}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => setForm(createFormFromOrder(order))}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Reverter
                </button>
              </div>
            )}
          </div>

          {!isEditingCustomer ? (
            <div className="space-y-4">
              {customerSuccess && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {customerSuccess}
                </div>
              )}

              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                {isB2B && order.establishment_name && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-gray-500">Estabelecimento</dt>
                    <dd className="mt-1 font-semibold text-gray-900">{order.establishment_name}</dd>
                  </div>
                )}

                <div>
                  <dt className="text-xs uppercase tracking-wide text-gray-500">
                    {isB2B ? 'Contato responsavel' : 'Nome do cliente'}
                  </dt>
                  <dd className="mt-1 font-semibold text-gray-900">{order.customer_name}</dd>
                </div>

                <div>
                  <dt className="text-xs uppercase tracking-wide text-gray-500">Telefone</dt>
                  <dd className="mt-1 font-semibold text-gray-900">{order.customer_phone_e164}</dd>
                </div>

                {order.customer_email && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-gray-500">Email</dt>
                    <dd className="mt-1 font-semibold text-gray-900">{order.customer_email}</dd>
                  </div>
                )}

                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-gray-500">Endereco completo</dt>
                  <dd className="mt-1 font-semibold text-gray-900">{formatOrderAddress(order)}</dd>
                </div>

                <div>
                  <dt className="text-xs uppercase tracking-wide text-gray-500">Vinculo estruturado</dt>
                  <dd className="mt-1 font-semibold text-gray-900">{linkedCustomerLabel}</dd>
                </div>

                <div>
                  <dt className="text-xs uppercase tracking-wide text-gray-500">Pedido feito em</dt>
                  <dd className="mt-1 font-semibold text-gray-900">{formatDate(order.created_at)}</dd>
                </div>

                {order.notes && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs uppercase tracking-wide text-gray-500">Observacoes</dt>
                    <dd className="mt-1 text-gray-700">{order.notes}</dd>
                  </div>
                )}
              </dl>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="label">Vincular cliente?</label>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={form.customer_id}
                    onChange={(event) => {
                      const nextCustomerId = event.target.value;
                      const selectedCustomer = matchingCustomers.find((customer) => customer.id === nextCustomerId);

                      if (!selectedCustomer) {
                        setForm((prev) => (prev ? { ...prev, customer_id: '' } : prev));
                        return;
                      }

                      const draft = getCustomerLinkDraft(selectedCustomer);
                      setForm((prev) => (prev ? { ...prev, ...draft } : prev));
                      setCustomerError('');
                    }}
                    className="input-field max-w-xl"
                  >
                    <option value="">Nao vincular agora / manter preenchimento manual</option>
                    {matchingCustomers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {getCustomerDisplayName(customer)}
                      </option>
                    ))}
                  </select>

                  {form.customer_id && (
                    <button
                      type="button"
                      onClick={() => setForm((prev) => (prev ? { ...prev, customer_id: '' } : prev))}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      Limpar vinculo
                    </button>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  Use isto quando o pedido chegou digitado manualmente e voce quer substituir pelos dados estruturados do cadastro.
                </p>
              </div>

              {formCustomerPreview && (
                <div className="rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm text-brand-900">
                  <p className="font-semibold">{getCustomerDisplayName(formCustomerPreview)}</p>
                  <p className="mt-1">{formCustomerPreview.phone_e164}</p>
                  {formCustomerPreview.email && <p className="mt-1">{formCustomerPreview.email}</p>}
                  <p className="mt-1">{getCustomerFullAddress(formCustomerPreview) || 'Endereco nao estruturado'}</p>
                  {!canBindSelectedCustomer && (
                    <p className="mt-2 text-xs text-red-600">
                      Este cliente ainda nao tem endereco estruturado completo. Complete o endereco abaixo antes de salvar.
                    </p>
                  )}
                </div>
              )}

              {isB2B && (
                <div>
                  <label className="label">Estabelecimento</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ex: Supermercado Bom Preco"
                    value={form.establishment_name}
                    onChange={(event) => setForm((prev) => (prev ? { ...prev, establishment_name: event.target.value } : prev))}
                  />
                </div>
              )}

              <div>
                <label className="label">{isB2B ? 'Contato responsavel *' : 'Nome do cliente *'}</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder={isB2B ? 'Ex: Joao Silva' : 'Ex: Maria Silva'}
                  value={form.customer_name}
                  onChange={(event) => setForm((prev) => (prev ? { ...prev, customer_name: event.target.value } : prev))}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label">Telefone *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="+32 470 12 34 56"
                    value={form.customer_phone}
                    onChange={(event) => setForm((prev) => (prev ? { ...prev, customer_phone: event.target.value } : prev))}
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    className="input-field"
                    placeholder="contato@cliente.be"
                    value={form.customer_email}
                    onChange={(event) => setForm((prev) => (prev ? { ...prev, customer_email: event.target.value } : prev))}
                  />
                </div>
              </div>

              <div>
                <label className="label">Endereco completo *</label>
                <AddressAutocomplete
                  className="w-full"
                  placeholder="Ex: Rue de la Loi, 16 - 1000 - Bruxelles"
                  value={form.address_full}
                  onChange={(nextValue, meta) => {
                    setForm((prev) => prev ? ({
                      ...prev,
                      address_full: nextValue,
                      ...(meta?.selected ? {} : {
                        address_street: '',
                        address_number: '',
                        address_postal_code: '',
                        address_city: '',
                      }),
                    }) : prev);
                  }}
                  onAddressSelected={(address) => {
                    setForm((prev) => prev ? ({
                      ...prev,
                      address_full: address.fullAddress,
                      address_street: address.street,
                      address_number: address.number,
                      address_postal_code: address.postalCode,
                      address_city: address.city,
                    }) : prev);
                    setCustomerError('');
                  }}
                />
                <p className="mt-1 text-xs text-gray-400">
                  Selecione uma sugestao para atualizar rua, numero, codigo postal e comuna.
                </p>
              </div>

              <div>
                <label className="label">Observacoes</label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="Notas internas sobre este pedido..."
                  value={form.notes}
                  onChange={(event) => setForm((prev) => (prev ? { ...prev, notes: event.target.value } : prev))}
                />
              </div>

              <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
                <p><span className="font-semibold text-gray-800">Endereco atual:</span> {formatOrderAddress(order)}</p>
                <p className="mt-1"><span className="font-semibold text-gray-800">Pedido feito em:</span> {formatDate(order.created_at)}</p>
              </div>

              {customerError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {customerError}
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handleSaveCustomerData()}
                  disabled={savingCustomer}
                  className="btn-primary px-6 py-2.5 disabled:opacity-50"
                >
                  {savingCustomer ? 'Salvando...' : 'Salvar dados do pedido'}
                </button>
                <a
                  href={makeWhatsAppLink(form.customer_phone || order.customer_phone_e164)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary px-6 py-2.5"
                >
                  Testar WhatsApp
                </a>
              </div>
            </div>
          )}
        </div>

        {isB2B && (
          <div className="card p-5">
            <h2 className="mb-4 font-bold text-gray-800">Frete</h2>

            {freightSuccess && (
              <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
                {freightSuccess}
              </div>
            )}

            {freightCents > 0 && !showFreightInput && (
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-700">
                  Frete atual: <span className="font-bold text-blue-700">{formatEUR(freightCents)}</span>
                </p>
                <button
                  onClick={() => {
                    setShowFreightInput(true);
                    setFreightValue((freightCents / 100).toFixed(2).replace('.', ','));
                  }}
                  className="text-sm text-blue-600 underline hover:text-blue-800"
                >
                  Alterar
                </button>
                <button
                  onClick={() => void removeFreight()}
                  disabled={savingFreight}
                  className="text-sm text-red-500 underline hover:text-red-700 disabled:opacity-50"
                >
                  Remover frete
                </button>
              </div>
            )}

            {freightCents === 0 && !showFreightInput && (
              <button
                onClick={() => setShowFreightInput(true)}
                className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-800"
              >
                + Adicionar frete
              </button>
            )}

            {showFreightInput && (
              <div className="mt-2 flex items-end gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Valor do frete (EUR)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex: 15,00"
                    value={freightValue}
                    onChange={(event) => setFreightValue(event.target.value)}
                    className="w-36 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <button
                  onClick={() => void saveFreight()}
                  disabled={savingFreight}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingFreight ? 'Salvando...' : 'Salvar Frete'}
                </button>
                <button
                  onClick={() => {
                    setShowFreightInput(false);
                    setFreightValue('');
                  }}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-500 transition-all hover:text-gray-700"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}

        <div className="card p-5">
          <h2 className="mb-4 font-bold text-gray-800">Itens do Pedido</h2>
          <table className="mb-4 w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="pb-2 text-left font-medium text-gray-500">Sabor</th>
                <th className="pb-2 text-center font-medium text-gray-500">Qtd</th>
                <th className="pb-2 text-right font-medium text-gray-500">Subtotal</th>
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

          <div className="space-y-2 border-t-2 border-gray-200 pt-4">
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
            <div className="flex justify-between border-t border-gray-200 pt-2 text-xl font-bold">
              <span>TOTAL</span>
              <span className="text-brand-600">{formatEUR(grandTotal)}</span>
            </div>
          </div>
        </div>

        {order.needs_change && (
          <div className="card p-5">
            <h2 className="mb-3 font-bold text-gray-800">Troco</h2>
            <p className="text-sm text-gray-700">
              Cliente tem <span className="font-semibold">{formatEUR(changeInHand)}</span> em maos e voce deve levar{' '}
              <span className="font-semibold text-brand-700">{formatEUR(changeToBring)}</span> de troco.
            </p>
          </div>
        )}

        <div className="card bg-gray-50 p-4">
          <p className="text-xs text-gray-400">ID: <span className="font-mono">{order.id}</span></p>
        </div>

        <div className="border-t border-gray-200 pb-10 pt-6">
          <button
            onClick={() => void handleDelete()}
            disabled={deleting}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-6 py-3 font-semibold text-red-600 transition-all hover:bg-red-100 disabled:opacity-50"
          >
            {deleting ? 'Excluindo...' : 'Excluir este pedido permanentemente'}
          </button>
          <p className="mt-2 text-center text-xs text-gray-400">Esta acao nao pode ser desfeita.</p>
        </div>
      </div>
    </div>
  );
}
