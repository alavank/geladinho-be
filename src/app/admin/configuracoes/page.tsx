'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FLAVORS } from '@/lib/flavors';
import { SystemSettings } from '@/lib/settings';

const DEFAULT: SystemSettings = {
  activeFlavorIds: FLAVORS.map((f) => f.id),
  unitPriceEurCents: 170,
  freightEurCents: 0,
  minOrderEurCents: 8500,
};

export default function ConfiguracoesPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => { if (r.status === 401) { router.push('/admin/login'); throw new Error('unauth'); } return r.json(); })
      .then((data) => { setSettings(data); setLoading(false); })
      .catch((e) => { if (e.message !== 'unauth') setError('Erro ao carregar configurações'); });
  }, []);

  const toggleFlavor = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      activeFlavorIds: prev.activeFlavorIds.includes(id)
        ? prev.activeFlavorIds.filter((f) => f !== id)
        : [...prev.activeFlavorIds, id],
    }));
  };

  const selectAll = () => setSettings((prev) => ({ ...prev, activeFlavorIds: FLAVORS.map((f) => f.id) }));
  const selectNone = () => setSettings((prev) => ({ ...prev, activeFlavorIds: [] }));

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    else setError('Erro ao salvar configurações');
    setSaving(false);
  };

  const centsToEur = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');
  const eurToCents = (val: string) => Math.round(parseFloat(val.replace(',', '.') || '0') * 100);

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-gray-500 hover:text-gray-700">← Pedidos</Link>
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-2">
            <span className="text-xl">⚙️</span>
            <h1 className="font-bold text-gray-900">Configurações do Sistema</h1>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? '⏳ Salvando...' : '💾 Salvar alterações'}
        </button>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">⏳ Carregando...</div>
      ) : (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

          {saved && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 font-medium">
              ✅ Configurações salvas com sucesso!
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
              ⚠️ {error}
            </div>
          )}

          {/* Preços */}
          <div className="card p-6">
            <h2 className="font-bold text-gray-900 text-lg mb-5">💰 Preços e Pedido Mínimo</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className="label">Preço por geladinho (€)</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">€</span>
                  <input
                    type="number" min="0" step="0.01"
                    value={centsToEur(settings.unitPriceEurCents)}
                    onChange={(e) => setSettings((p) => ({ ...p, unitPriceEurCents: eurToCents(e.target.value) }))}
                    className="input-field"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Atualmente: € {centsToEur(settings.unitPriceEurCents)}</p>
              </div>
              <div>
                <label className="label">Frete padrão (€)</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">€</span>
                  <input
                    type="number" min="0" step="0.01"
                    value={centsToEur(settings.freightEurCents)}
                    onChange={(e) => setSettings((p) => ({ ...p, freightEurCents: eurToCents(e.target.value) }))}
                    className="input-field"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">0 = frete grátis</p>
              </div>
              <div>
                <label className="label">Pedido mínimo (€)</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">€</span>
                  <input
                    type="number" min="0" step="0.01"
                    value={centsToEur(settings.minOrderEurCents)}
                    onChange={(e) => setSettings((p) => ({ ...p, minOrderEurCents: eurToCents(e.target.value) }))}
                    className="input-field"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Valor mínimo do pedido (sem frete)</p>
              </div>
            </div>
          </div>

          {/* Sabores */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-gray-900 text-lg">🍭 Sabores Disponíveis</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {settings.activeFlavorIds.length} de {FLAVORS.length} sabores ativos
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-sm text-brand-600 hover:text-brand-800 font-semibold border border-brand-200 px-3 py-1.5 rounded-lg hover:bg-brand-50">
                  Todos
                </button>
                <button onClick={selectNone} className="text-sm text-gray-500 hover:text-gray-700 font-semibold border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50">
                  Nenhum
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {FLAVORS.map((flavor) => {
                const active = settings.activeFlavorIds.includes(flavor.id);
                return (
                  <label
                    key={flavor.id}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      active ? 'border-brand-400 bg-brand-50' : 'border-gray-200 bg-gray-50 opacity-60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleFlavor(flavor.id)}
                      className="accent-brand-600 w-4 h-4"
                    />
                    <span className={`text-sm font-semibold ${active ? 'text-gray-900' : 'text-gray-400'}`}>
                      {flavor.name}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Save bottom */}
          <div className="flex justify-end pb-8">
            <button onClick={handleSave} disabled={saving} className="btn-primary px-10 py-3 text-base">
              {saving ? '⏳ Salvando...' : '💾 Salvar alterações'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
