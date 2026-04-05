'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ExpensePurchaseForm, {
  ExpensePayload,
} from '@/components/ExpensePurchaseForm';
import { Expense, ExpenseCategory, Supplier } from '@/types';

export default function EditarGastoPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [expense, setExpense] = useState<Expense | null>(null);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/expenses/${id}`).then((response) => {
        if (response.status === 401) {
          router.push('/admin/login');
          throw new Error('unauth');
        }
        if (!response.ok) throw new Error('not-found');
        return response.json();
      }),
      fetch('/api/admin/expense-categories').then((response) => response.json()),
      fetch('/api/admin/suppliers').then((response) => response.json()),
    ])
      .then(([fetchedExpense, fetchedCategories, fetchedSuppliers]) => {
        setExpense(fetchedExpense);
        setCategories(fetchedCategories);
        setSuppliers(
          fetchedSuppliers.filter(
            (supplier: Supplier) =>
              supplier.active || supplier.id === fetchedExpense.supplier_id
          )
        );
        setLoading(false);
      })
      .catch((error: Error) => {
        if (error.message === 'not-found') {
          router.push('/admin/gastos');
          return;
        }
        if (error.message !== 'unauth') setLoading(false);
      });
  }, [id, router]);

  const handleSubmit = async (payload: ExpensePayload) => {
    setSaving(true);
    setError('');

    const response = await fetch(`/api/admin/expenses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      router.push('/admin/gastos');
      return;
    }

    const data = await response.json();
    setError(data.error || 'Erro ao salvar');
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        ⏳ Carregando...
      </div>
    );
  }

  if (!expense) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/admin/gastos" className="font-medium text-gray-500 hover:text-gray-700">
            ← Gastos
          </Link>
          <span className="text-gray-300">|</span>
          <h1 className="font-bold text-gray-900">✏️ Editar Compra</h1>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6">
        <ExpensePurchaseForm
          categories={categories}
          suppliers={suppliers}
          initialExpense={expense}
          onSubmit={handleSubmit}
          submitting={saving}
          error={error}
          submitLabel="💾 Salvar Alterações"
        />
      </div>
    </div>
  );
}
