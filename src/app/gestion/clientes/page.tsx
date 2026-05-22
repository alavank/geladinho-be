'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminHeader from '@/components/AdminHeader';
import { useIsAdminModuleActive } from '@/components/admin/AdminShellContext';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import PhoneInput from '@/components/PhoneInput';
import { Customer, CustomerType } from '@/types';
import { getCustomerDisplayName } from '@/lib/customers';
import { detectCountryFromE164, getLocalNumber } from '@/lib/phone';

const EMPTY_FORM = {
  type: 'b2b' as CustomerType,
  name: '',
  establishment_name: '',
  phone: '',
  phone_country: 'BE',
  email: '',
  address_full: '',
  address_street: '',
  address_number: '',
  address_postal_code: '',
  address_city: '',
  notes: '',
};

export default function ClientesPage() {
  const router = useRouter();
  const isActiveModule = useIsAdminModuleActive('/gestion/clientes');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const lastFetchedAtRef = useRef(0);

  const fetchCustomers = useCallback(async (force = false) => {
    if (!force && lastFetchedAtRef.current > 0 && Date.now() - lastFetchedAtRef.current < 30000) {
      return;
    }

    const response = await fetch('/api/gestion/customers');
    if (response.status === 401) {
      router.push('/gestion/login');
      return;
    }
    setCustomers(await response.json());
    lastFetchedAtRef.current = Date.now();
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (!isActiveModule) return;

    void fetchCustomers();
  }, [fetchCustomers, isActiveModule]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setShowForm(false);
    setEditingId(null);
    setError('');
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Nome é obrigatório');
      return;
    }
    if (!form.phone.trim()) {
      setError('Telefone é obrigatório');
      return;
    }

    const url = editingId ? `/api/gestion/customers/${editingId}` : '/api/gestion/customers';
    const method = editingId ? 'PATCH' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, phone_country: form.phone_country }),
    });

    if (response.ok) {
      resetForm();
      void fetchCustomers(true);
      return;
    }

    const data = await response.json();
    setError(data.error || 'Erro ao salvar');
  };

  const startEdit = (customer: Customer) => {
    const detectedCountry = detectCountryFromE164(customer.phone_e164);
    setEditingId(customer.id);
    setForm({
      type: customer.type,
      name: customer.name,
      establishment_name: customer.establishment_name || '',
      phone: getLocalNumber(customer.phone_e164, detectedCountry),
      phone_country: detectedCountry,
      email: customer.email || '',
      address_full: customer.address_full || '',
      address_street: customer.address_street || '',
      address_number: customer.address_number || '',
      address_postal_code: customer.address_postal_code || '',
      address_city: customer.address_city || '',
      notes: customer.notes || '',
    });
    setShowForm(true);
  };

  const handleToggle = async (customer: Customer) => {
    await fetch(`/api/gestion/customers/${customer.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !customer.active }),
    });
    void fetchCustomers(true);
  };

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Excluir o cliente "${getCustomerDisplayName(customer)}"?`)) return;

    const response = await fetch(`/api/gestion/customers/${customer.id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      void fetchCustomers(true);
      return;
    }

    const data = await response.json();
    alert(data.error || 'Erro ao excluir');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">⏳ Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader
        breadcrumbs={[
          { label: 'Pedidos', href: '/gestion' },
          { label: 'Clientes' },
        ]}
        actions={
          <button
            type="button"
            onClick={() => { resetForm(); setShowForm(true); }}
            className="btn-primary py-2 px-4 text-sm"
          >
            + Novo Cliente
          </button>
        }
      />

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        {showForm && (
          <div className="card p-6">
            <h2 className="mb-4 text-lg font-bold text-gray-900">
              {editingId ? '✏️ Editar Cliente' : '➕ Novo Cliente'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="label">Tipo de cliente</label>
                <div className="flex gap-3">
                  {[
                    { key: 'b2b' as CustomerType, label: '🏪 Revenda' },
                    { key: 'b2c' as CustomerType, label: '🛒 Cliente final' },
                  ].map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setForm((prev) => ({
                        ...prev,
                        type: option.key,
                        establishment_name: option.key === 'b2c' ? '' : prev.establishment_name,
                      }))}
                      className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
                        form.type === option.key
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.type === 'b2b' && (
                <div>
                  <label className="label">Estabelecimento</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ex: Supermercado Bom Preço"
                    value={form.establishment_name}
                    onChange={(event) => setForm({ ...form, establishment_name: event.target.value })}
                  />
                </div>
              )}

              <div>
                <label className="label">{form.type === 'b2b' ? 'Contato responsável *' : 'Nome *'}</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder={form.type === 'b2b' ? 'Ex: João Silva' : 'Ex: Maria Silva'}
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label">Telefone *</label>
                  <PhoneInput
                    value={form.phone}
                    countryCode={form.phone_country}
                    onChangePhone={(v) => setForm({ ...form, phone: v })}
                    onChangeCountry={(c) => setForm({ ...form, phone_country: c })}
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    className="input-field"
                    placeholder="contato@cliente.be"
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="label">Endereço completo</label>
                <AddressAutocomplete
                  className="w-full"
                  placeholder="Ex: Rue de la Loi, 16 - 1000 - Bruxelles"
                  value={form.address_full}
                  onChange={(nextValue, meta) => {
                    setForm((prev) => ({
                      ...prev,
                      address_full: nextValue,
                      ...(meta?.selected ? {} : {
                        address_street: '',
                        address_number: '',
                        address_postal_code: '',
                        address_city: '',
                      }),
                    }));
                  }}
                  onAddressSelected={(address) => {
                    setForm((prev) => ({
                      ...prev,
                      address_full: address.fullAddress,
                      address_street: address.street,
                      address_number: address.number,
                      address_postal_code: address.postalCode,
                      address_city: address.city,
                    }));
                  }}
                />
              </div>

              <div>
                <label className="label">Observações</label>
                <textarea
                  className="input-field"
                  rows={2}
                  placeholder="Notas sobre este cliente..."
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                />
              </div>

              {error && <p className="text-sm text-red-500">⚠️ {error}</p>}

              <div className="flex gap-3">
                <button type="button" onClick={handleSave} className="btn-primary py-2.5 px-6">
                  {editingId ? 'Salvar' : 'Cadastrar'}
                </button>
                <button type="button" onClick={resetForm} className="btn-secondary py-2.5 px-6">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="card p-6">
          <h2 className="mb-4 text-lg font-bold text-gray-900">Clientes Cadastrados ({customers.length})</h2>

          {customers.length === 0 ? (
            <div className="py-8 text-center text-gray-400">
              <p className="mb-3 text-4xl">👥</p>
              <p>Nenhum cliente cadastrado.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  className={`rounded-xl border p-4 transition-all ${
                    customer.active ? 'border-gray-200 bg-white' : 'border-dashed border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={customer.active}
                      onChange={() => void handleToggle(customer)}
                      className="mt-1 h-4 w-4 cursor-pointer accent-brand-600"
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold ${customer.active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                        {customer.type === 'b2b' ? '🏪 ' : '🛒 '}
                        {getCustomerDisplayName(customer)}
                      </p>
                      <p className="text-xs text-gray-500">{customer.phone_e164}</p>
                      {customer.address_full && <p className="truncate text-xs text-gray-500">{customer.address_full}</p>}
                    </div>
                    <button type="button" onClick={() => startEdit(customer)} className="rounded-lg bg-blue-50 px-2 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100">✏️</button>
                    <button type="button" onClick={() => void handleDelete(customer)} className="rounded-lg bg-red-50 px-2 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-100">🗑️</button>
                  </div>
                  {customer.notes && <p className="ml-7 mt-2 text-xs text-gray-400">{customer.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
