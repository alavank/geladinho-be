'use client';

import { useEffect, useState, useId } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FLAVORS } from '@/lib/flavors';
import { SystemSettings, FlavorConfig, getDefaultSettings } from '@/lib/settings';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

function inputToCents(val: string): number {
  const n = parseFloat(val.replace(',', '.').replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : Math.round(n * 100);
}

function MoneyInput({ value, onChange, placeholder }: {
  value: number;
  onChange: (cents: number) => void;
  placeholder?: string;
}) {
  const [display, setDisplay] = useState(centsToInput(value));

  useEffect(() => { setDisplay(centsToInput(value)); }, [value]);

  return (
    <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-brand-400 bg-white">
      <span className="px-3 py-3 bg-gray-50 border-r border-gray-300 text-gray-500 font-semibold text-sm">€</span>
      <input
        type="text"
        inputMode="decimal"
        value={display}
        placeholder={placeholder ?? '0,00'}
        onChange={(e) => setDisplay(e.target.value)}
        onBlur={() => {
          const cents = inputToCents(display);
          onChange(cents);
          setDisplay(centsToInput(cents));
        }}
        className="flex-1 px-3 py-3 text-sm font-semibold text-gray-900 focus:outline-none"
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConfiguracoesPage() {
  const router = useRouter();
  const uid = useId();
  const [settings, setSettings] = useState<SystemSettings>(getDefaultSettings());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // New flavor form
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('1,70');
  const [addError, setAddError] = useState('');

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => {
        if (r.status === 401) { router.push('/admin/login'); throw new Error('unauth'); }
        return r.json();
      })
      .then((data: SystemSettings) => {
        // Merge: ensure all base flavors present, add any custom ones saved
        const baseIds = FLAVORS.map((f) => f.id);
        const merged: FlavorConfig[] = [];

        // First add base flavors in order
        for (const f of FLAVORS) {
          const saved = data.flavorConfigs?.find((fc: FlavorConfig) => fc.id === f.id);
          merged.push(saved ?? { id: f.id, name: f.name, active: true, priceEurCents: f.defaultPriceEurCents });
        }

        // Then add any custom flavors not in base list
        for (const fc of (data.flavorConfigs ?? [])) {
          if (!baseIds.includes(fc.id)) merged.push(fc);
        }

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

  const removeFlavor = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      flavorConfigs: prev.flavorConfigs.filter((fc) => fc.id !== id),
    }));
  };

  const addFlavor = () => {
    const name = newName.trim().toUpperCase();
    if (!name) { setAddError('Digite o nome do sabor'); return; }
    if (settings.flavorConfigs.some((fc) => fc.name.toUpperCase() === name)) {
      setAddError('Já existe um sabor com esse nome'); return;
    }
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const priceCents = inputToCents(newPrice) || 170;
    setSettings((prev) => ({
      ...prev,
      flavorConfigs: [...prev.flavorConfigs, { id, name, active: true, priceEurCents: priceCents }],
    }));
    setNewName('');
    setNewPrice('1,70');
    setAddError('');
  };

  const toggleAll = (active: boolean) => {
    setSettings((prev) => ({
      ...prev,
      flavorConfigs: prev.flavorConfigs.map((fc) => ({ ...fc, active })),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 4000); }
    else setError('Erro ao salvar. Tente novamente.');
    setSaving(false);
  };

  const activeCount = settings.flavorConfigs.filter((f) => f.active).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-gray-500 hover:text-gray-700 font-medium">← Pedidos</Link>
          <span className="text-gray-300">|</span>
          <h1 className="font-bold text-gray-900">⚙️ Configurações</h1>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? '⏳ Salvando...' : '💾 Salvar alterações'}
        </button>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400 text-lg">⏳ Carregando...</div>
      ) : (
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

          {saved && (
            <div className="bg-green-50 border border-green-300 text-green-800 rounded-xl p-4 font-semibold flex items-center gap-2">
              ✅ Configurações salvas! As alterações já aparecem no site do cliente.
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">⚠️ {error}</div>
          )}

          {/* Configurações gerais */}
          <div className="card p-6">
            <h2 className="font-bold text-gray-900 text-lg mb-5">Configurações Gerais</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="label">Frete padrão</label>
                <MoneyInput
                  value={settings.freightEurCents}
                  onChange={(cents) => setSettings((p) => ({ ...p, freightEurCents: cents }))}
                  placeholder="0,00"
                />
                <p className="text-xs text-gray-400 mt-1">Digite 0,00 para frete grátis</p>
              </div>
              <div>
                <label className="label">Pedido mínimo</label>
                <MoneyInput
                  value={settings.minOrderEurCents}
                  onChange={(cents) => setSettings((p) => ({ ...p, minOrderEurCents: cents }))}
                  placeholder="85,00"
                />
                <p className="text-xs text-gray-400 mt-1">Valor mínimo do pedido (sem frete)</p>
              </div>
            </div>
          </div>

          {/* Adicionar novo sabor */}
          <div className="card p-6">
            <h2 className="font-bold text-gray-900 text-lg mb-4">➕ Adicionar Novo Sabor</h2>
            <div className="flex gap-3 flex-wrap items-end">
              <div className="flex-1 min-w-[160px]">
                <label className="label">Nome do sabor</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ex: TAPIOCA"
                  value={newName}
                  onChange={(e) => { setNewName(e.target.value); setAddError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && addFlavor()}
                />
              </div>
              <div className="w-36">
                <label className="label">Preço</label>
                <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-brand-400 bg-white">
                  <span className="px-3 py-3 bg-gray-50 border-r border-gray-300 text-gray-500 font-semibold text-sm">€</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="flex-1 px-3 py-3 text-sm font-semibold focus:outline-none"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder="1,70"
                  />
                </div>
              </div>
              <button
                onClick={addFlavor}
                className="btn-primary whitespace-nowrap"
              >
                + Adicionar
              </button>
            </div>
            {addError && <p className="text-red-500 text-sm mt-2">⚠️ {addError}</p>}
          </div>

          {/* Lista de sabores */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-gray-900 text-lg">Sabores</h2>
                <p className="text-sm text-gray-500 mt-1">{activeCount} de {settings.flavorConfigs.length} ativos</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggleAll(true)} className="text-sm text-brand-600 border border-brand-200 px-3 py-1.5 rounded-lg hover:bg-brand-50 font-semibold">
                  Ativar todos
                </button>
                <button onClick={() => toggleAll(false)} className="text-sm text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 font-semibold">
                  Desativar todos
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {settings.flavorConfigs.map((fc) => {
                const isBase = FLAVORS.some((f) => f.id === fc.id);
                return (
                  <div
                    key={fc.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      fc.active ? 'border-brand-200 bg-white' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    {/* Ativo toggle */}
                    <input
                      type="checkbox"
                      id={`${uid}-${fc.id}`}
                      checked={fc.active}
                      onChange={(e) => updateFlavor(fc.id, { active: e.target.checked })}
                      className="accent-brand-600 w-4 h-4 shrink-0 cursor-pointer"
                    />

                    {/* Nome */}
                    <label
                      htmlFor={`${uid}-${fc.id}`}
                      className={`flex-1 text-sm font-semibold cursor-pointer ${fc.active ? 'text-gray-900' : 'text-gray-400 line-through'}`}
                    >
                      {fc.name}
                      {!isBase && <span className="ml-2 text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded font-normal">personalizado</span>}
                    </label>

                    {/* Preço */}
                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden w-28 shrink-0 bg-white">
                      <span className="px-2 py-2 bg-gray-50 border-r border-gray-200 text-gray-400 text-xs font-semibold">€</span>
                      <FlavorPriceInput
                        value={fc.priceEurCents}
                        onChange={(cents) => updateFlavor(fc.id, { priceEurCents: cents })}
                      />
                    </div>

                    {/* Excluir (só customizados) ou desativar hint */}
                    {!isBase ? (
                      <button
                        onClick={() => removeFlavor(fc.id)}
                        className="text-red-400 hover:text-red-600 text-lg leading-none shrink-0"
                        title="Remover sabor"
                      >
                        ×
                      </button>
                    ) : (
                      <div className="w-5 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pb-10">
            <button onClick={handleSave} disabled={saving} className="btn-primary px-10 py-3 text-base">
              {saving ? '⏳ Salvando...' : '💾 Salvar alterações'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Separate small component to handle per-flavor price input state
function FlavorPriceInput({ value, onChange }: { value: number; onChange: (cents: number) => void }) {
  const [display, setDisplay] = useState(centsToInput(value));
  useEffect(() => { setDisplay(centsToInput(value)); }, [value]);
  return (
    <input
      type="text"
      inputMode="decimal"
      value={display}
      onChange={(e) => setDisplay(e.target.value)}
      onBlur={() => {
        const cents = inputToCents(display);
        onChange(cents);
        setDisplay(centsToInput(cents));
      }}
      className="flex-1 px-2 py-2 text-xs font-semibold text-gray-900 focus:outline-none text-right"
    />
  );
}
