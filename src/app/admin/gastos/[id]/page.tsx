'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Expense, ExpenseCategory, Supplier } from '@/types';

function toDisplay(cents: number): string { return (cents / 100).toFixed(2).replace('.', ','); }
function toCents(val: string): number {
  const n = parseFloat(val.replace(',', '.').replace(/[^\d.]/g, ''));
  return isNaN(n) ? 0 : Math.round(n * 100);
}

export default function EditarGastoPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    date: '',
    category_id: '',
    supplier_id: '',
    description: '',
    amount_display: '',
    amount_cents: 0,
    notes: '',
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/expenses/${id}`).then((r) => { if (r.status === 401) { router.push('/admin/login'); throw new Error('unauth'); } if (!r.ok) throw new Error('not found'); return r.json(); }),
      fetch('/api/admin/expense-categories').then((r) => r.json()),
      fetch('/api/admin/suppliers').then((r) => r.json()),
    ]).then(([expense, cats, supps]: [Expense, ExpenseCategory[], Supplier[]]) => {
      setForm({
        date: expense.date,
        category_id: expense.category_id,
        supplier_id: expense.supplier_id || '',
        description: expense.description,
        amount_display: toDisplay(expense.amount_eur_cents),
        amount_cents: expense.amount_eur_cents,
        notes: expense.notes || '',
      });
      setCategories(cats);
      setSuppliers(supps.filter((s) => s.active));
      setLoading(false);
    }).catch((e) => {
      if (e.message === 'not found') { router.push('/admin/gastos'); }
      if (e.message !== 'unauth') setLoading(false);
    });
  }, [id]);

  const handleSubmit = async () => {
    if (!form.category_id) { setError('Selecione uma categoria'); return; }
    if (!form.description.trim()) { setError('Descrição é obrigatória'); return; }
    if (form.amount_cents <= 0) { setError('Valor deve ser maior que zero'); return; }

    setSaving(true);
    setError('');

    const res = await fetch(`/api/admin/expenses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: form.date,
        category_id: form.category_id,
        supplier_id: form.supplier_id || null,
        description: form.description.trim(),
        amount_eur_cents: form.amount_cents,
        notes: form.notes.trim() || null,
      }),
    });

    if (res.ok) {
      router.push('/admin/gastos');
    } else {
      const data = await res.json();
      setError(data.error || 'Erro ao salvar');
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">⏳ Carregando...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/admin/gastos" className="text-gray-500 hover:text-gray-700 font-medium">← Gastos</Link>
          <span className="text-gray-300">|</span>
          <h1 className="font-bold text-gray-900">✏️ Editar Gasto</h1>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-6">
        <div className="card p-6 space-y-4">
          <div>
            <label className="label">Data *</label>
            <input type="date" className="input-field" value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>

          <div>
            <label className="label">Categoria *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.filter((c) => c.active || c.id === form.category_id).map((cat) => (
                <button key={cat.id} onClick={() => setForm({ ...form, category_id: cat.id })}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all text-sm font-semibold ${
                    form.category_id === cat.id
                      ? 'border-current shadow-sm'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={form.category_id === cat.id ? { color: cat.color, borderColor: cat.color, backgroundColor: cat.color + '10' } : {}}>
                  <span className="text-xl">{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Valor (EUR) *</label>
            <div className="flex items-stretch border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-brand-400 bg-white">
              <span className="flex items-center px-4 bg-gray-100 border-r border-gray-300 text-gray-600 text-lg font-bold select-none">€</span>
              <input type="text" inputMode="decimal" placeholder="0,00"
                value={form.amount_display}
                onChange={(e) => setForm({ ...form, amount_display: e.target.value })}
                onBlur={() => {
                  const cents = toCents(form.amount_display);
                  setForm({ ...form, amount_cents: cents, amount_display: cents > 0 ? toDisplay(cents) : '' });
                }}
                className="flex-1 min-w-0 px-4 py-3 text-lg font-bold text-gray-900 bg-white focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="label">Descrição *</label>
            <input type="text" className="input-field" placeholder="Ex: Compra de ingredientes"
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div>
            <label className="label">Fornecedor</label>
            <select className="input-field" value={form.supplier_id}
              onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}>
              <option value="">— Nenhum —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Observações</label>
            <textarea className="input-field" rows={2} placeholder="Detalhes adicionais..."
              value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          {error && <p className="text-red-500 text-sm font-semibold">⚠️ {error}</p>}

          <div className="flex gap-3 pt-2">
            <button onClick={handleSubmit} disabled={saving} className="flex-1 btn-primary py-3 text-base">
              {saving ? '⏳ Salvando...' : '💾 Salvar Alterações'}
            </button>
            <Link href="/admin/gastos" className="btn-secondary py-3 px-6 text-center">Cancelar</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
