'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Expense, ExpenseCategory } from '@/types';
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
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('30d');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = async () => {
    const [resExp, resCat] = await Promise.all([
      fetch('/api/admin/expenses'),
      fetch('/api/admin/expense-categories'),
    ]);
    if (resExp.status === 401) { router.push('/admin/login'); return; }
    setExpenses(await resExp.json());
    setCategories(await resCat.json());
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

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
    const res = await fetch(`/api/admin/expenses/${id}`, { method: 'DELETE' });
    if (res.ok) setExpenses((prev) => prev.filter((e) => e.id !== id));
    else alert('Erro ao excluir');
    setDeletingId(null);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">⏳ Carregando...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-gray-500 hover:text-gray-700 font-medium">← Pedidos</Link>
          <span className="text-gray-300">|</span>
          <Image src="/logo.png" alt="Madame Simone" width={120} height={44} className="h-8 w-auto object-contain hidden sm:block" />
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/gastos/categorias" className="text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 font-medium">
            🏷️ Categorias
          </Link>
          <Link href="/admin/gastos/fornecedores" className="text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 font-medium">
            🏬 Fornecedores
          </Link>
          <Link href="/admin/gastos/novo" className="btn-primary py-1.5 px-4 text-sm">+ Nova Compra</Link>
        </div>
      </header>

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
            <Link href="/admin/gastos/novo" className="inline-block mt-4 btn-primary py-2 px-6 text-sm">Registrar primeira compra</Link>
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
                      <td className="px-4 py-3 text-gray-600 text-xs">{expense.supplier?.name || '—'}</td>
                      <td className="px-4 py-3 max-w-[220px] text-xs text-gray-600">
                        <span className="block truncate">{expense.location_address || '—'}</span>
                      </td>
                      <td className="px-4 py-3 font-bold text-orange-600 whitespace-nowrap">{formatEUR(expense.amount_eur_cents)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link href={`/admin/gastos/${expense.id}`} className="text-blue-600 hover:text-blue-800 font-semibold text-xs">Editar</Link>
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
    </div>
  );
}
