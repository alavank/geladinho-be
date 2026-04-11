'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from '@/components/AdminHeader';
import { FLAVORS } from '@/lib/flavors';
import {
  ProductionBatch,
  StockAdjustment,
  StockLevel,
  StockAdjustmentReason,
  STOCK_ADJUSTMENT_LABELS,
} from '@/types';

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'Europe/Brussels',
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(dateStr + 'T12:00:00'));
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

type Tab = 'estoque' | 'producao' | 'ajustes';

export default function EstoquePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('estoque');
  const [stock, setStock] = useState<StockLevel[]>([]);
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [loading, setLoading] = useState(true);

  // Production form
  const [prodFlavorId, setProdFlavorId] = useState('');
  const [prodQuantity, setProdQuantity] = useState('');
  const [prodDate, setProdDate] = useState(todayStr());
  const [prodNotes, setProdNotes] = useState('');
  const [prodSaving, setProdSaving] = useState(false);

  // Adjustment form
  const [adjFlavorId, setAdjFlavorId] = useState('');
  const [adjQuantity, setAdjQuantity] = useState('');
  const [adjReason, setAdjReason] = useState<StockAdjustmentReason>('perda');
  const [adjDate, setAdjDate] = useState(todayStr());
  const [adjNotes, setAdjNotes] = useState('');
  const [adjSaving, setAdjSaving] = useState(false);

  const fetchAll = async () => {
    const [sRes, pRes, aRes] = await Promise.all([
      fetch('/api/admin/stock'),
      fetch('/api/admin/production'),
      fetch('/api/admin/stock-adjustments'),
    ]);
    if (sRes.status === 401) { router.push('/admin/login'); return; }
    setStock(await sRes.json());
    setBatches(await pRes.json());
    setAdjustments(await aRes.json());
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const totalProduced = useMemo(() => stock.reduce((s, l) => s + l.produced, 0), [stock]);
  const totalSold = useMemo(() => stock.reduce((s, l) => s + l.sold, 0), [stock]);
  const totalCurrent = useMemo(() => stock.reduce((s, l) => s + l.current, 0), [stock]);

  const handleAddProduction = async () => {
    if (!prodFlavorId || !prodQuantity) return;
    const flavor = FLAVORS.find((f) => f.id === prodFlavorId);
    if (!flavor) return;

    setProdSaving(true);
    const res = await fetch('/api/admin/production', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: prodDate,
        flavor_id: prodFlavorId,
        flavor_name: flavor.name,
        quantity: parseInt(prodQuantity, 10),
        notes: prodNotes || null,
      }),
    });

    if (res.ok) {
      setProdFlavorId('');
      setProdQuantity('');
      setProdNotes('');
      await fetchAll();
    } else {
      const data = await res.json();
      alert(data.error || 'Erro ao salvar');
    }
    setProdSaving(false);
  };

  const handleAddAdjustment = async () => {
    if (!adjFlavorId || !adjQuantity) return;
    const flavor = FLAVORS.find((f) => f.id === adjFlavorId);
    if (!flavor) return;

    setAdjSaving(true);
    const qty = parseInt(adjQuantity, 10);
    // For 'perda' and 'doacao', quantity should be negative (reducing stock)
    const finalQty = (adjReason === 'perda' || adjReason === 'doacao') ? -Math.abs(qty) : qty;

    const res = await fetch('/api/admin/stock-adjustments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: adjDate,
        flavor_id: adjFlavorId,
        flavor_name: flavor.name,
        quantity: finalQty,
        reason: adjReason,
        notes: adjNotes || null,
      }),
    });

    if (res.ok) {
      setAdjFlavorId('');
      setAdjQuantity('');
      setAdjNotes('');
      await fetchAll();
    } else {
      const data = await res.json();
      alert(data.error || 'Erro ao salvar');
    }
    setAdjSaving(false);
  };

  const handleDeleteBatch = async (id: string) => {
    if (!confirm('Excluir este registro de produção?')) return;
    const res = await fetch(`/api/admin/production/${id}`, { method: 'DELETE' });
    if (res.ok) await fetchAll();
    else alert('Erro ao excluir');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">⏳ Carregando...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader
        breadcrumbs={[
          { label: 'Pedidos', href: '/admin' },
          { label: 'Estoque & Produção' },
        ]}
      />

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Tabs */}
        <div className="flex gap-2">
          {([
            { key: 'estoque' as Tab, label: '📦 Estoque' },
            { key: 'producao' as Tab, label: '🏭 Produção' },
            { key: 'ajustes' as Tab, label: '🔧 Ajustes' },
          ]).map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t.key ? 'bg-orange-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Produzido</p>
            <p className="text-2xl font-black text-blue-600">{totalProduced}</p>
            <p className="text-xs text-gray-400 mt-1">unidades total</p>
          </div>
          <div className="card p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Vendido</p>
            <p className="text-2xl font-black text-green-600">{totalSold}</p>
            <p className="text-xs text-gray-400 mt-1">unidades despachadas</p>
          </div>
          <div className="card p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Em Estoque</p>
            <p className={`text-2xl font-black ${totalCurrent >= 0 ? 'text-orange-600' : 'text-red-600'}`}>{totalCurrent}</p>
            <p className="text-xs text-gray-400 mt-1">unidades disponíveis</p>
          </div>
        </div>

        {/* TAB: Estoque */}
        {tab === 'estoque' && (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Sabor', 'Produzido', 'Vendido', 'Ajustes', 'Em Estoque'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stock.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nenhum registro de produção ainda.</td></tr>
                  ) : stock.map((s) => (
                    <tr key={s.flavorId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{s.flavorName}</td>
                      <td className="px-4 py-3 text-blue-600 font-semibold">{s.produced}</td>
                      <td className="px-4 py-3 text-green-600 font-semibold">{s.sold}</td>
                      <td className="px-4 py-3 text-gray-600">{s.adjusted > 0 ? `+${s.adjusted}` : s.adjusted}</td>
                      <td className={`px-4 py-3 font-bold ${s.current < 0 ? 'text-red-600' : s.current === 0 ? 'text-gray-400' : 'text-orange-600'}`}>
                        {s.current}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: Produção */}
        {tab === 'producao' && (
          <div className="space-y-6">
            {/* Add production form */}
            <div className="card p-6">
              <h2 className="font-bold text-gray-900 mb-4 text-lg">🏭 Registrar Produção</h2>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="label">Data</label>
                  <input type="date" className="input-field" value={prodDate}
                    onChange={(e) => setProdDate(e.target.value)} />
                </div>
                <div>
                  <label className="label">Sabor *</label>
                  <select className="input-field" value={prodFlavorId}
                    onChange={(e) => setProdFlavorId(e.target.value)}>
                    <option value="">Selecione...</option>
                    {FLAVORS.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Quantidade *</label>
                  <input type="number" className="input-field" placeholder="Ex: 50"
                    value={prodQuantity} onChange={(e) => setProdQuantity(e.target.value)}
                    min="1" inputMode="numeric" />
                </div>
                <button onClick={handleAddProduction} disabled={prodSaving || !prodFlavorId || !prodQuantity}
                  className="btn-primary py-2.5 disabled:opacity-40">
                  {prodSaving ? '⏳' : '+ Adicionar'}
                </button>
              </div>
              <div className="mt-3">
                <input className="input-field" placeholder="Observações (opcional)"
                  value={prodNotes} onChange={(e) => setProdNotes(e.target.value)} />
              </div>
            </div>

            {/* Production history */}
            <div className="card overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
                <h3 className="font-semibold text-gray-700 text-sm">Histórico de Produção ({batches.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Data', 'Sabor', 'Quantidade', 'Obs', ''].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {batches.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nenhum registro.</td></tr>
                    ) : batches.map((b) => (
                      <tr key={b.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600 text-xs">{formatDate(b.date)}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{b.flavor_name}</td>
                        <td className="px-4 py-3 font-bold text-blue-600">{b.quantity}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate">{b.notes || '—'}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => handleDeleteBatch(b.id)}
                            className="text-red-400 hover:text-red-600 p-1 rounded-lg transition-colors" title="Excluir">
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Ajustes */}
        {tab === 'ajustes' && (
          <div className="space-y-6">
            {/* Add adjustment form */}
            <div className="card p-6">
              <h2 className="font-bold text-gray-900 mb-4 text-lg">🔧 Registrar Ajuste de Estoque</h2>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="label">Data</label>
                  <input type="date" className="input-field" value={adjDate}
                    onChange={(e) => setAdjDate(e.target.value)} />
                </div>
                <div>
                  <label className="label">Sabor *</label>
                  <select className="input-field" value={adjFlavorId}
                    onChange={(e) => setAdjFlavorId(e.target.value)}>
                    <option value="">Selecione...</option>
                    {FLAVORS.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Quantidade *</label>
                  <input type="number" className="input-field" placeholder="Ex: 5"
                    value={adjQuantity} onChange={(e) => setAdjQuantity(e.target.value)}
                    min="1" inputMode="numeric" />
                </div>
                <div>
                  <label className="label">Motivo *</label>
                  <select className="input-field" value={adjReason}
                    onChange={(e) => setAdjReason(e.target.value as StockAdjustmentReason)}>
                    {(Object.entries(STOCK_ADJUSTMENT_LABELS) as [StockAdjustmentReason, string][]).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-3 flex gap-3 items-end">
                <div className="flex-1">
                  <input className="input-field" placeholder="Observações (opcional)"
                    value={adjNotes} onChange={(e) => setAdjNotes(e.target.value)} />
                </div>
                <button onClick={handleAddAdjustment} disabled={adjSaving || !adjFlavorId || !adjQuantity}
                  className="btn-primary py-2.5 disabled:opacity-40">
                  {adjSaving ? '⏳' : '+ Registrar'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">Para perdas e doações, a quantidade será automaticamente subtraída do estoque.</p>
            </div>

            {/* Adjustments history */}
            <div className="card overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
                <h3 className="font-semibold text-gray-700 text-sm">Histórico de Ajustes ({adjustments.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Data', 'Sabor', 'Qtd', 'Motivo', 'Obs'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {adjustments.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nenhum ajuste registrado.</td></tr>
                    ) : adjustments.map((a) => (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600 text-xs">{formatDate(a.date)}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{a.flavor_name}</td>
                        <td className={`px-4 py-3 font-bold ${a.quantity < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {a.quantity > 0 ? `+${a.quantity}` : a.quantity}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {STOCK_ADJUSTMENT_LABELS[a.reason as StockAdjustmentReason] || a.reason}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate">{a.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
