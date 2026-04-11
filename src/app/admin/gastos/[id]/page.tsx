'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminHeader from '@/components/AdminHeader';
import { Expense } from '@/types';
import { formatEUR } from '@/lib/flavors';

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'Europe/Brussels',
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(dateStr + 'T12:00:00'));
}

export default function VisualizarGastoPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/expenses/${id}`)
      .then((r) => {
        if (r.status === 401) { router.push('/admin/login'); throw new Error('unauth'); }
        if (!r.ok) throw new Error('not-found');
        return r.json();
      })
      .then(setExpense)
      .catch((e: Error) => {
        if (e.message === 'not-found') router.push('/admin/gastos');
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  const handleDelete = async () => {
    if (!confirm('Excluir este gasto?')) return;
    setDeletingId(id);
    const res = await fetch(`/api/admin/expenses/${id}`, { method: 'DELETE' });
    if (res.ok) router.push('/admin/gastos');
    else alert('Erro ao excluir');
    setDeletingId(null);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">⏳ Carregando...</div>;
  if (!expense) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader
        breadcrumbs={[
          { label: 'Pedidos', href: '/admin' },
          { label: 'Gastos', href: '/admin/gastos' },
          { label: 'Detalhe da Compra' },
        ]}
        actions={
          <>
            <Link href={`/admin/gastos/${id}/editar`} className="btn-primary py-1.5 px-4 text-sm">Editar</Link>
            <button onClick={handleDelete} disabled={deletingId === id}
              className="px-4 py-1.5 text-sm font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40">
              {deletingId === id ? 'Excluindo...' : 'Excluir'}
            </button>
          </>
        }
      />

      <div className="mx-auto max-w-3xl px-4 py-6 space-y-5">
        {/* Header info */}
        <div className="card p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{expense.description}</h2>
              <p className="text-sm text-gray-500 mt-1">{formatDate(expense.date)}</p>
            </div>
            <p className="text-2xl font-black text-orange-600">{formatEUR(expense.amount_eur_cents)}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Categoria</p>
              {expense.category ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold"
                  style={{ backgroundColor: expense.category.color + '20', color: expense.category.color }}>
                  {expense.category.icon} {expense.category.name}
                </span>
              ) : <span className="text-gray-400">—</span>}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Fornecedor</p>
              <p className="font-medium text-gray-800">{expense.supplier?.name || '—'}</p>
            </div>
            {expense.invoice_number && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Nº Nota/Recibo</p>
                <p className="font-medium text-gray-800">{expense.invoice_number}</p>
              </div>
            )}
            {expense.location_address && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Local da Compra</p>
                <p className="font-medium text-gray-800">{expense.location_address}</p>
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        {expense.items && expense.items.length > 0 && (
          <div className="card p-6">
            <h3 className="font-bold text-gray-800 mb-4 text-lg">🛒 Itens da Compra</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Item</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Qtd</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Preço Un.</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {expense.items.map((item, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 font-medium text-gray-900">{item.name || '—'}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{item.quantity}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{formatEUR(item.unit_price_eur_cents)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-900">{formatEUR(item.line_total_eur_cents)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-gray-200">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-right font-bold text-gray-700">Total</td>
                    <td className="px-3 py-2 text-right font-black text-orange-600">{formatEUR(expense.amount_eur_cents)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Notes */}
        {expense.notes && (
          <div className="card p-6">
            <h3 className="font-bold text-gray-800 mb-2 text-lg">📝 Observações</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{expense.notes}</p>
          </div>
        )}

        {/* Receipt image */}
        {expense.receipt_image_url && (
          <div className="card p-6">
            <h3 className="font-bold text-gray-800 mb-3 text-lg">🧾 Comprovante</h3>
            <img src={expense.receipt_image_url} alt="Comprovante" className="max-w-full rounded-lg border border-gray-200" />
          </div>
        )}

        {/* Confirm button */}
        <div className="pt-2 pb-8">
          <Link href="/admin/gastos"
            className="btn-primary w-full py-3 text-center block text-lg font-bold rounded-xl">
            ✅ Confirmar e voltar para Gastos
          </Link>
        </div>
      </div>
    </div>
  );
}
