'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminHeader from '@/components/AdminHeader';
import { useIsAdminModuleActive } from '@/components/admin/AdminShellContext';
import { Expense, ExpenseCategory, Supplier } from '@/types';
import { formatEUR } from '@/lib/flavors';

type Period = '7d' | '30d' | '90d' | 'all';

const PERIODS: { key: Period; label: string }[] = [
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: '90d', label: '90 dias' },
  { key: 'all', label: 'Tudo' },
];

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'Europe/Brussels',
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(dateStr + 'T12:00:00'));
}

export default function GastosPage() {
  const router = useRouter();
  const isActiveModule = useIsAdminModuleActive('/gestion/gastos');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [linkingExpense, setLinkingExpense] = useState<Expense | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [bindingId, setBindingId] = useState<string | null>(null);
  const lastFetchedAtRef = useRef(0);

  const fetchData = useCallback(async (force = false) => {
    if (!force && lastFetchedAtRef.current > 0 && Date.now() - lastFetchedAtRef.current < 30000) {
      return;
    }

    const [resExp, resCat, resSup] = await Promise.all([
      fetch('/api/gestion/expenses'),
      fetch('/api/gestion/expense-categories'),
      fetch('/api/gestion/suppliers'),
    ]);
    if (resExp.status === 401) { router.push('/gestion/login'); return; }
    setExpenses(await resExp.json());
    setCategories(await resCat.json());
    setSuppliers(await resSup.json());
    lastFetchedAtRef.current = Date.now();
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (!isActiveModule) return;
    void fetchData();
  }, [fetchData, isActiveModule]);

  const filtered = useMemo(() => {
    let result = expenses;

    // Period filter
    if (period !== 'all') {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const cutoff = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
      result = result.filter((e) => e.date >= cutoff);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter((e) => e.category_id === categoryFilter);
    }

    return result;
  }, [expenses, period, categoryFilter]);

  const totalCents = filtered.reduce((sum, e) => sum + e.amount_eur_cents, 0);

  // Group by category for summary
  const byCategory = useMemo(() => {
    const map: Record<string, { category: ExpenseCategory; total: number; count: number }> = {};
    filtered.forEach((e) => {
      if (!e.category) return;
      if (!map[e.category_id]) map[e.category_id] = { category: e.category, total: 0, count: 0 };
      map[e.category_id].total += e.amount_eur_cents;
      map[e.category_id].count++;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filtered]);

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este gasto?')) return;
    setDeletingId(id);
    const res = await fetch(`/api/gestion/expenses/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      lastFetchedAtRef.current = Date.now();
    }
    else alert('Erro ao excluir');
    setDeletingId(null);
  };

  const openLinkSupplier = (expense: Expense) => {
    setLinkingExpense(expense);
    setSelectedSupplierId(expense.supplier_id || '');
  };

  const handleLinkSupplier = async () => {
    if (!linkingExpense || !selectedSupplierId) return;
    const supplier = suppliers.find((s) => s.id === selectedSupplierId);
    if (!supplier) return;
    if (!confirm(`Vincular fornecedor "${supplier.name}" a esta compra?`)) return;

    setBindingId(linkingExpense.id);
    const res = await fetch(`/api/gestion/expenses/${linkingExpense.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supplier_id: selectedSupplierId }),
    });

    if (res.ok) {
      const updated = await res.json();
      setExpenses((prev) => prev.map((e) => e.id === linkingExpense.id ? { ...e, ...updated } : e));
      setLinkingExpense(null);
      lastFetchedAtRef.current = Date.now();
    } else {
      alert('Erro ao vincular fornecedor');
    }
    setBindingId(null);
  };

  const activeSuppliers = useMemo(() => suppliers.filter((s) => s.active), [suppliers]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">⏳ Carregando...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader
        breadcrumbs={[
          { label: 'Pedidos', href: '/gestion' },
          { label: 'Compras e Gastos' },
        ]}
        actions={
          <>
            <Link href="/gestion/gastos/categorias" scroll={false} className="text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 font-medium">
              Categorias
            </Link>
            <Link href="/gestion/gastos/fornecedores" scroll={false} className="text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 font-medium">
              Fornecedores
            </Link>
            <Link href="/gestion/gastos/novo" scroll={false} className="btn-primary py-1.5 px-4 text-sm">+ Nova Compra</Link>
          </>
        }
      />

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-600">Período:</span>
            {PERIODS.map((p) => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${period === p.key ? 'bg-orange-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-600">Categoria:</span>
            <button onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${categoryFilter === 'all' ? 'bg-orange-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              Todas
            </button>
            {categories.filter((c) => c.active).map((cat) => (
              <button key={cat.id} onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${categoryFilter === cat.id ? 'text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                style={categoryFilter === cat.id ? { backgroundColor: cat.color } : {}}>
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Total Gastos</p>
            <p className="text-2xl font-black text-orange-600">{formatEUR(totalCents)}</p>
            <p className="text-xs text-gray-400 mt-1">{filtered.length} registros</p>
          </div>
          {byCategory.slice(0, 3).map((item) => (
            <div key={item.category.id} className="card p-5 border-l-4" style={{ borderLeftColor: item.category.color }}>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{item.category.icon} {item.category.name}</p>
              <p className="text-xl font-black" style={{ color: item.category.color }}>{formatEUR(item.total)}</p>
              <p className="text-xs text-gray-400 mt-1">{item.count} registros</p>
            </div>
          ))}
        </div>

        {/* Expenses list */}
        {filtered.length === 0 ? (
          <div className="card p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">💸</p>
            <p>Nenhuma compra encontrada no período.</p>
            <Link href="/gestion/gastos/novo" scroll={false} className="inline-block mt-4 btn-primary py-2 px-6 text-sm">Registrar primeira compra</Link>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Data', 'Categoria', 'Compra', 'Fornecedor', 'Local', 'Total', 'Ações'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600 text-xs">{formatDate(expense.date)}</td>
                      <td className="px-4 py-3">
                        {expense.category && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: expense.category.color + '20', color: expense.category.color }}>
                            {expense.category.icon} {expense.category.name}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-[260px]">
                        <p className="truncate font-medium text-gray-900">{expense.description}</p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {(expense.items?.length || 0)} item(ns)
                          {expense.invoice_number ? ` · Nota ${expense.invoice_number}` : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {expense.supplier ? (
                          <span className="text-gray-600">{expense.supplier.name}</span>
                        ) : (
                          <button onClick={() => openLinkSupplier(expense)}
                            className="text-amber-600 hover:text-amber-800 font-semibold hover:bg-amber-50 px-1.5 py-0.5 rounded transition-colors">
                            Vincular
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-[220px] text-xs text-gray-600">
                        <span className="block truncate">{expense.location_address || '—'}</span>
                      </td>
                      <td className="px-4 py-3 font-bold text-orange-600 whitespace-nowrap">{formatEUR(expense.amount_eur_cents)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link href={`/gestion/gastos/${expense.id}`} scroll={false} className="text-blue-600 hover:text-blue-800 font-semibold text-xs">Ver</Link>
                          <button onClick={() => handleDelete(expense.id)} disabled={deletingId === expense.id}
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded-lg transition-colors disabled:opacity-40" title="Excluir">
                            {deletingId === expense.id ? '⏳' : '🗑️'}
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

      {/* Supplier linking modal */}
      {linkingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">🏬 Vincular Fornecedor</h3>
              <button onClick={() => setLinkingExpense(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Vincular um fornecedor cadastrado à compra <span className="font-semibold text-gray-800">&ldquo;{linkingExpense.description}&rdquo;</span>.
            </p>

            {linkingExpense.ocr_raw_data?.supplier_name && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <p className="text-xs font-semibold text-amber-700 uppercase mb-1">Detectado pelo OCR</p>
                <p className="text-sm font-medium text-amber-900">{linkingExpense.ocr_raw_data.supplier_name}</p>
                {linkingExpense.ocr_raw_data.supplier_address && (
                  <p className="text-xs text-amber-700 mt-0.5">{linkingExpense.ocr_raw_data.supplier_address}</p>
                )}
              </div>
            )}

            <div className="mb-4">
              <label className="label">Fornecedor *</label>
              <select
                className="input-field"
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
              >
                <option value="">Selecione...</option>
                {activeSuppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setLinkingExpense(null)}
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleLinkSupplier}
                disabled={!selectedSupplierId || bindingId === linkingExpense.id}
                className="flex-1 btn-primary py-2 disabled:opacity-40">
                {bindingId === linkingExpense.id ? 'Vinculando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
