'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FLAVORS } from '@/lib/flavors';
import { SystemSettings, FlavorConfig, getDefaultSettings } from '@/lib/settings';

export default function ConfiguracoesPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<SystemSettings>(getDefaultSettings());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => {
        if (r.status === 401) { router.push('/admin/login'); throw new Error('unauth'); }
        return r.json();
      })
      .then((data: SystemSettings) => {
        // Merge: ensure all flavors are present
        const merged = FLAVORS.map((f) => {
          const existing = data.flavorConfigs?.find((fc: FlavorConfig) => fc.id === f.id);
          return existing ?? { id: f.id, active: true, priceEurCents: f.defaultPriceEurCents };
        });
        setSettings({ ...data, flavorConfigs: merged });
        setLoading(false);
      })
      .catch((e) => { if (e.message !== 'unauth') { setError('Erro ao carregar'); setLoading(false); } });
  }, []);

  const updateFlavor = (id: string, patch: Partial<FlavorConfig>) => {
    setSettings((prev) => ({
      ...prev,
      flavorConfigs: prev.flavorConfigs.map((fc) => fc.id === id ? { ...fc, ...patch } : fc),
    }));
  };

  const selectAll = () => setSettings((prev) => ({ ...prev, flavorConfigs: prev.flavorConfigs.map((fc) => ({ ...fc, active: true })) }));
  const selectNone = () => setSettings((prev) => ({ ...prev, flavorConfigs: prev.flavorConfigs.map((fc) => ({ ...fc, active: false })) }));

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

  // Helpers for euro input
  const toEur = (cents: number) => String(Math.round(cents) / 100);
  const toCents = (val: string) => Math.round(parseFloat(val || '0') * 100) || 0;

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-gray-500 hover:text-gray-700">← Pedidos</Link>
          <span className="text-gray-300">|</span>
          <h1 className="font-bold text-gray-900">⚙️ Configurações</h1>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? '⏳ Salvando...' : '💾 Salvar'}
        </button>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">⏳ Carregando...</div>
      ) : (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          {saved && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 font-medium">✅ Configurações salvas!</div>}
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">⚠️ {error}</div>}

          {/* Frete e mínimo */}
          <div className="card p-6">
            <h2 className="font-bold text-gray-900 text-lg mb-5">Configurações Gerais</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="label">Frete padrão (€)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={toEur(settings.freightEurCents)}
                  onChange={(e) => setSettings((p) => ({ ...p, freightEurCents: toCents(e.target.value) }))}
                  className="input-field"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-400 mt-1">0 = frete grátis</p>
              </div>
              <div>
                <label className="label">Pedido mínimo (€)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={toEur(settings.minOrderEurCents)}
                  onChange={(e) => setSettings((p) => ({ ...p, minOrderEurCents: toCents(e.target.value) }))}
                  className="input-field"
                  placeholder="85.00"
                />
                <p className="text-xs text-gray-400 mt-1">Valor mínimo do pedido (sem frete)</p>
              </div>
            </div>
          </div>

          {/* Sabores */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-gray-900 text-lg">Sabores e Preços</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {settings.flavorConfigs.filter((f) => f.active).length} de {FLAVORS.length} ativos
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-sm text-brand-600 border border-brand-200 px-3 py-1.5 rounded-lg hover:bg-brand-50 font-semibold">Todos</button>
                <button onClick={selectNone} className="text-sm text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 font-semibold">Nenhum</button>
              </div>
            </div>

            <div className="space-y-2">
              {settings.flavorConfigs.map((fc) => {
                const flavor = FLAVORS.find((f) => f.id === fc.id);
                if (!flavor) return null;
                return (
                  <div key={fc.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${fc.active ? 'border-brand-200 bg-brand-50' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
                    <input
                      type="checkbox"
                      checked={fc.active}
                      onChange={(e) => updateFlavor(fc.id, { active: e.target.checked })}
                      className="accent-brand-600 w-4 h-4 shrink-0"
                    />
                    <span className={`flex-1 text-sm font-semibold ${fc.active ? 'text-gray-900' : 'text-gray-400'}`}>
                      {flavor.name}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-gray-400 text-sm">€</span>
                      <input
                        type="number" min="0" step="0.01"
                        value={toEur(fc.priceEurCents)}
                        onChange={(e) => updateFlavor(fc.id, { priceEurCents: toCents(e.target.value) })}
                        className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-brand-400"
                        placeholder="1.70"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

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
