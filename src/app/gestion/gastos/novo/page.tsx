'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from '@/components/AdminHeader';
import ExpensePurchaseForm, {
  ExpensePayload,
} from '@/components/ExpensePurchaseForm';
import { ExpenseCategory, Supplier } from '@/types';

export default function NovoGastoPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/gestion/expense-categories').then((response) => {
        if (response.status === 401) {
          router.push('/gestion/login');
          throw new Error('unauth');
        }
        return response.json();
      }),
      fetch('/api/gestion/suppliers').then((response) => response.json()),
    ])
      .then(([fetchedCategories, fetchedSuppliers]) => {
        setCategories(fetchedCategories.filter((category: ExpenseCategory) => category.active));
        setSuppliers(fetchedSuppliers.filter((supplier: Supplier) => supplier.active));
        setLoading(false);
      })
      .catch((error: Error) => {
        if (error.message !== 'unauth') setLoading(false);
      });
  }, [router]);

  const handleSubmit = async (payload: ExpensePayload) => {
    setSaving(true);
    setError('');

    const response = await fetch('/api/gestion/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const created = await response.json();
      router.push(`/gestion/gastos/${created.id}`, { scroll: false });
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

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader
        breadcrumbs={[
          { label: 'Pedidos', href: '/gestion' },
          { label: 'Gastos', href: '/gestion/gastos' },
          { label: 'Nova Compra' },
        ]}
      />

      <div className="mx-auto max-w-5xl px-4 py-6">
        <ExpensePurchaseForm
          categories={categories}
          suppliers={suppliers}
          onSubmit={handleSubmit}
          submitting={saving}
          error={error}
          submitLabel="💾 Salvar Compra"
        />
      </div>
    </div>
  );
}
