'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SystemSettings, FlavorConfig, getDefaultSettings } from '@/lib/settings';
import { formatEUR } from '@/lib/flavors';

function toDisplay(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}
function toCents(val: string): number {
  const n = parseFloat(val.replace(',', '.').replace(/[^\d.]/g, ''));
  return isNaN(n) ? 0 : Math.round(n * 100);
}

function EuroField({ cents, onChange, placeholder = '0,00' }: { cents: number; onChange: (c: number) => void; placeholder?: string }) {
  const [val, setVal] = useState(toDisplay(cents));
  useEffect(() => { setVal(toDisplay(cents)); }, [cents]);
  return (
    <div className="flex items-stretch border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-400 bg-white w-full">
      <span className="flex items-center px-3 bg-gray-100 border-r border-gray-300 text-gray-600 text-sm font-bold select-none">€</span>
      <input type="text" inputMode="decimal" value={val} placeholder={placeholder}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => { const c = toCents(val); onChange(c); setVal(toDisplay(c)); }}
        className="flex-1 min-w-0 px-3 py-3 text-sm font-semibold text-gray-900 bg-white focus:outline-none" />
    </div>
  );
}

function PriceCell({ cents, onChange }: { cents: number; onChange: (c: number) => void }) {
  const [val, setVal] = useState(toDisplay(cents));
  useEffect(() => { setVal(toDisplay(cents)); }, [cents]);
  return (
    <input type="text" inputMode="decimal" value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => { const c = toCents(val); onChange(c); setVal(toDisplay(c)); }}
      className="flex-1 min-w-0 px-2 py-2 text-sm font-semibold text-gray-900 bg-white focus:outline-none text-right" />
  );
}

export default function ConfigB2BPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<SystemSettings>({ ...getDefaultSettings(), b2bFlavorConfigs: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [newPriceCents, setNewPriceCents] = useState(0);
  const [newPriceDisplay, setNewPriceDisplay] = useState('');
  const [addError, setAddError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPriceCents, setEditPriceCents] = useState(0);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => { if (r.status === 401) { router.push('/admin/login'); throw new Error('unauth'); } return r.json(); })
      .then((data: SystemSettings) => {
        setSettings({ ...data, b2bFlavorConfigs: data.b2bFlavorConfigs ?? [] });
        setLoading(false);
      })
      .catch((e) => { if (e.message !== 'unauth') { setError('Erro ao carregar'); setLoading(false); } });
  }, []);

  const update = (id: string, patch: Partial<FlavorConfig>) =>
    setSettings((p) => ({ ...p, b2bFlavorConfigs: p.b2bFlavorConfigs.map((fc) => fc.id === id ? { ...fc, ...patch } : fc) }));

  const remove = (id: string) =>
    setSettings((p) => ({ ...p, b2bFlavorConfigs: p.b2bFlavorConfigs.filter((fc) => fc.id !== id) }));

  const addFlavor = () => {
    const name = newName.trim().toUpperCase();
    if (!name) { setAddError('Digite o nome do sabor'); return; }
    if (newPriceCents <= 0) { setAddError('Digite o preço do sabor'); return; }
    if (settings.b2bFlavorConfigs.some((fc) => fc.name === name)) { setAddError('Já existe um sabor com esse nome'); return; }
    const id = `b2b-${Date.now()}`;
    setSettings((p) => ({ ...p, b2bFlavorConfigs: [...p.b2bFlavorConfigs, { id, name, active: true, priceEurCents: newPriceCents }] }));
    setNewName(''); setNewPriceCents(0); setNewPriceDisplay(''); setAddError('');
  };

  const startEdit = (fc: FlavorConfig) => { setEditingId(fc.id); setEditName(fc.name); setEditPriceCents(fc.priceEurCents); };
  const confirmEdit = () => {
    const name = editName.trim().toUpperCase();
    if (!name || editPriceCents <= 0) return;
    setSettings((p) => ({ ...p, b2bFlavorConfigs: p.b2bFlavorConfigs.map((fc) => fc.id === editingId ? { ...fc, name, priceEurCents: editPriceCents } : fc) }));
    setEditingId(null);
  };

  const handleSave = async () => {
    setSaving(true); setError(''); setSaved(false);
    const res = await fetch('/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 5000); }
    else setError('Erro ao salvar. Tente novamente.');
    setSaving(false);
  };

  const activeCount = settings.b2bFlavorConfigs.filter((f) => f.active).length;

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400 text-lg">⏳ Carregando...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/admin/configuracoes" className="text-gray-500 hover:text-gray-700">← Configurações B2C</Link>
          <span className="text-gray-300">|</span>
          <h1 className="font-bold text-gray-900">🏪 Configurações B2B — Revenda</h1>
        </div>
        <button onClick={handleSave} disabled={saving} className="text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-md disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #0EA5E9, #0369A1)' }}>
          {saving ? '⏳ Salvando...' : '💾 Salvar'}
        </button>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {saved && <div className="bg-green-50 border border-green-300 text-green-800 rounded-xl p-4 font-semibold">✅ Salvo! As alterações já aparecem no portal de revenda.</div>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">⚠️ {error}</div>}

        {/* Regras de pedido B2B */}
        <div className="card p-6">
          <h2 className="font-bold text-gray-900 text-lg mb-5">📦 Regras de Pedido B2B</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="label">Mínimo de unidades por pedido</label>
              <input type="number" min="1"
                value={settings.b2bMinTotalUnits}
                onChange={(e) => setSettings((p) => ({ ...p, b2bMinTotalUnits: parseInt(e.target.value) || 100 }))}
                className="input-field" />
              <p className="text-xs text-gray-400 mt-1">Quantidade mínima total do pedido</p>
            </div>
            <div>
              <label className="label">Mínimo por sabor (unidades)</label>
              <input type="number" min="1"
                value={settings.b2bMinPerFlavor}
                onChange={(e) => setSettings((p) => ({ ...p, b2bMinPerFlavor: parseInt(e.target.value) || 5 }))}
                className="input-field" />
              <p className="text-xs text-gray-400 mt-1">Cada sabor deve ter pelo menos X unidades</p>
            </div>
            <div>
              <label className="label">Frete padrão B2B</label>
              <EuroField cents={settings.b2bFreightEurCents} onChange={(c) => setSettings((p) => ({ ...p, b2bFreightEurCents: c }))} placeholder="0,00" />
              <p className="text-xs text-gray-400 mt-1">0,00 = frete grátis</p>
            </div>
          </div>
        </div>

        {/* Adicionar sabor */}
        <div className="card p-6">
          <h2 className="font-bold text-gray-900 text-lg mb-4">➕ Cadastrar Sabor B2B</h2>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[180px]">
              <label className="label">Nome do sabor</label>
              <input type="text" className="input-field" placeholder="Ex: MORANGO"
                value={newName}
                onChange={(e) => { setNewName(e.target.value); setAddError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && addFlavor()} />
            </div>
            <div className="w-40">
              <label className="label">Preço B2B</label>
              <div className="flex items-stretch border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-400 bg-white">
                <span className="flex items-center px-3 bg-gray-100 border-r border-gray-300 text-gray-600 text-sm font-bold select-none">€</span>
                <input type="text" inputMode="decimal" value={newPriceDisplay} placeholder=""
                  onChange={(e) => { setNewPriceDisplay(e.target.value); setAddError(''); }}
                  onBlur={() => { const c = toCents(newPriceDisplay); setNewPriceCents(c); if (c > 0) setNewPriceDisplay(toDisplay(c)); }}
                  className="flex-1 min-w-0 px-3 py-3 text-sm font-semibold bg-white focus:outline-none" />
              </div>
            </div>
            <button onClick={addFlavor} className="text-white font-semibold py-3 px-6 rounded-xl whitespace-nowrap"
              style={{ background: 'linear-gradient(135deg, #0EA5E9, #0369A1)' }}>+ Cadastrar</button>
          </div>
          {addError && <p className="text-red-500 text-sm mt-2">⚠️ {addError}</p>}
        </div>

        {/* Lista sabores B2B */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-gray-900 text-lg">Sabores B2B Cadastrados</h2>
              <p className="text-sm text-gray-500">{activeCount} visíveis de {settings.b2bFlavorConfigs.length} cadastrados</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setSettings((p) => ({ ...p, b2bFlavorConfigs: p.b2bFlavorConfigs.map((fc) => ({ ...fc, active: true })) }))}
                className="text-sm text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 font-semibold">Ativar todos</button>
              <button onClick={() => setSettings((p) => ({ ...p, b2bFlavorConfigs: p.b2bFlavorConfigs.map((fc) => ({ ...fc, active: false })) }))}
                className="text-sm text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 font-semibold">Desativar todos</button>
            </div>
          </div>

          {settings.b2bFlavorConfigs.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <p className="text-4xl mb-3">🏪</p>
              <p>Nenhum sabor B2B cadastrado ainda.</p>
              <p className="text-sm mt-1">Use o formulário acima para cadastrar.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-[28px_1fr_110px_90px] gap-3 px-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <div /><div>Nome</div><div className="text-right">Preço B2B</div><div className="text-center">Ações</div>
              </div>
              {settings.b2bFlavorConfigs.map((fc) => (
                <div key={fc.id}>
                  {editingId === fc.id ? (
                    <div className="grid grid-cols-[28px_1fr_110px_90px] gap-3 items-center p-3 rounded-xl border-2 border-blue-400 bg-blue-50">
                      <div />
                      <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                        className="input-field py-1.5 text-sm font-bold" autoFocus onKeyDown={(e) => e.key === 'Enter' && confirmEdit()} />
                      <EuroField cents={editPriceCents} onChange={setEditPriceCents} />
                      <div className="flex gap-1 justify-center">
                        <button onClick={confirmEdit} className="text-white text-xs font-bold px-2 py-1.5 rounded-lg" style={{ backgroundColor: '#0369A1' }}>✓</button>
                        <button onClick={() => setEditingId(null)} className="bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs font-bold px-2 py-1.5 rounded-lg">✕</button>
                      </div>
                    </div>
                  ) : (
                    <div className={`grid grid-cols-[28px_1fr_110px_90px] gap-3 items-center p-3 rounded-xl border transition-all ${fc.active ? 'border-gray-200 bg-white' : 'border-dashed border-gray-200 bg-gray-50'}`}>
                      <input type="checkbox" checked={fc.active} onChange={() => update(fc.id, { active: !fc.active })}
                        className="accent-blue-600 w-4 h-4 cursor-pointer" />
                      <span className={`text-sm font-semibold truncate ${fc.active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{fc.name}</span>
                      <div className="text-right"><span className="text-sm font-bold text-gray-800">{formatEUR(fc.priceEurCents)}</span></div>
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => startEdit(fc)} className="bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold px-2 py-1.5 rounded-lg">✏️</button>
                        <button onClick={() => remove(fc.id)} className="bg-red-50 hover:bg-red-100 text-red-500 text-xs font-semibold px-2 py-1.5 rounded-lg">🗑️</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pb-10">
          <button onClick={handleSave} disabled={saving} className="text-white font-semibold px-10 py-3 rounded-xl text-base shadow-md disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #0EA5E9, #0369A1)' }}>
            {saving ? '⏳ Salvando...' : '💾 Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}
