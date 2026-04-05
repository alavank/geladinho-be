'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Supplier } from '@/types';
import AddressAutocomplete from '@/components/AddressAutocomplete';

export default function FornecedoresPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', address: '', phone: '', notes: '' });
  const [error, setError] = useState('');

  const fetchSuppliers = async () => {
    const res = await fetch('/api/admin/suppliers');
    if (res.status === 401) { router.push('/admin/login'); return; }
    setSuppliers(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchSuppliers(); }, []);

  const resetForm = () => { setForm({ name: '', address: '', phone: '', notes: '' }); setShowForm(false); setEditingId(null); setError(''); };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Nome é obrigatório'); return; }
    setError('');

    const url = editingId ? `/api/admin/suppliers/${editingId}` : '/api/admin/suppliers';
    const method = editingId ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (res.ok) { resetForm(); fetchSuppliers(); }
    else { const data = await res.json(); setError(data.error || 'Erro ao salvar'); }
  };

  const startEdit = (s: Supplier) => {
    setEditingId(s.id);
    setForm({ name: s.name, address: s.address || '', phone: s.phone || '', notes: s.notes || '' });
    setShowForm(true);
  };

  const handleToggle = async (s: Supplier) => {
    await fetch(`/api/admin/suppliers/${s.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !s.active }),
    });
    fetchSuppliers();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir o fornecedor "${name}"?`)) return;
    const res = await fetch(`/api/admin/suppliers/${id}`, { method: 'DELETE' });
    if (res.ok) fetchSuppliers();
    else { const data = await res.json(); alert(data.error || 'Erro ao excluir'); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">⏳ Carregando...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/admin/gastos" className="text-gray-500 hover:text-gray-700 font-medium">← Gastos</Link>
          <span className="text-gray-300">|</span>
          <h1 className="font-bold text-gray-900">🏬 Fornecedores</h1>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary py-2 px-4 text-sm">+ Novo</button>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Form */}
        {showForm && (
          <div className="card p-6">
            <h2 className="font-bold text-gray-900 text-lg mb-4">{editingId ? '✏️ Editar Fornecedor' : '➕ Novo Fornecedor'}</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Nome *</label>
                <input type="text" className="input-field" placeholder="Ex: Carrefour, Colruyt..."
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Endereço</label>
                <AddressAutocomplete
                  className="input-field"
                  placeholder="Rua, número, cidade"
                  value={form.address}
                  onChange={(v) => setForm({ ...form, address: v })}
                  onAddressSelected={(addr) => {
                    const full = [addr.street, addr.number, addr.postalCode, addr.city].filter(Boolean).join(', ');
                    setForm({ ...form, address: full });
                  }}
                />
              </div>
              <div>
                <label className="label">Telefone</label>
                <input type="text" className="input-field" placeholder="+32..."
                  value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="label">Observações</label>
                <textarea className="input-field" rows={2} placeholder="Notas sobre este fornecedor..."
                  value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              {error && <p className="text-red-500 text-sm">⚠️ {error}</p>}
              <div className="flex gap-3">
                <button onClick={handleSave} className="btn-primary py-2.5 px-6">{editingId ? 'Salvar' : 'Cadastrar'}</button>
                <button onClick={resetForm} className="btn-secondary py-2.5 px-6">Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {/* List */}
        <div className="card p-6">
          <h2 className="font-bold text-gray-900 text-lg mb-4">Fornecedores ({suppliers.length})</h2>
          {suppliers.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-4xl mb-3">🏬</p>
              <p>Nenhum fornecedor cadastrado.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {suppliers.map((s) => (
                <div key={s.id} className={`p-4 rounded-xl border transition-all ${s.active ? 'border-gray-200 bg-white' : 'border-dashed border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={s.active} onChange={() => handleToggle(s)} className="accent-brand-600 w-4 h-4 cursor-pointer" />
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm ${s.active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{s.name}</p>
                      {s.address && <p className="text-xs text-gray-500 truncate">{s.address}</p>}
                      {s.phone && <p className="text-xs text-gray-500">{s.phone}</p>}
                    </div>
                    <button onClick={() => startEdit(s)} className="bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold px-2 py-1.5 rounded-lg">✏️</button>
                    <button onClick={() => handleDelete(s.id, s.name)} className="bg-red-50 hover:bg-red-100 text-red-500 text-xs font-semibold px-2 py-1.5 rounded-lg">🗑️</button>
                  </div>
                  {s.notes && <p className="text-xs text-gray-400 mt-2 ml-7">{s.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
