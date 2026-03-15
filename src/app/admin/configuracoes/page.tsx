'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SystemSettings, FlavorConfig, getDefaultSettings } from '@/lib/settings';
import { formatEUR } from '@/lib/flavors';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDisplay(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

function toCents(val: string): number {
  const n = parseFloat(val.replace(',', '.').replace(/[^\d.]/g, ''));
  return isNaN(n) ? 0 : Math.round(n * 100);
}

// ─── Componente de campo monetário ────────────────────────────────────────────

function EuroField({
  cents,
  onChange,
  placeholder = '0,00',
}: {
  cents: number;
  onChange: (c: number) => void;
  placeholder?: string;
}) {
  const [val, setVal] = useState(toDisplay(cents));
  useEffect(() => { setVal(toDisplay(cents)); }, [cents]);

  return (
    <div className="flex items-stretch border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand-400 bg-white w-full">
      <span className="flex items-center px-3 bg-gray-100 border-r border-gray-300 text-gray-600 text-sm font-bold select-none whitespace-nowrap">
        €
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={val}
        placeholder={placeholder}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => {
          const c = toCents(val);
          onChange(c);
          setVal(toDisplay(c));
        }}
        className="flex-1 min-w-0 px-3 py-2 text-sm font-semibold text-gray-900 bg-white focus:outline-none"
      />
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ConfiguracoesPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<SystemSettings>({ ...getDefaultSettings(), flavorConfigs: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Novo sabor
  const [newName, setNewName] = useState('');
  const [newPriceCents, setNewPriceCents] = useState(170);
  const [addError, setAddError] = useState('');

  // Edição inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPriceCents, setEditPriceCents] = useState(170);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => {
        if (r.status === 401) { router.push('/admin/login'); throw new Error('unauth'); }
        return r.json();
      })
      .then((data: SystemSettings) => {
        setSettings({
          freightEurCents: data.freightEurCents ?? 0,
          minOrderEurCents: data.minOrderEurCents ?? 8500,
          flavorConfigs: data.flavorConfigs ?? [],
        });
        setLoading(false);
      })
      .catch((e) => {
        if (e.message !== 'unauth') { setError('Erro ao carregar'); setLoading(false); }
      });
  }, []);

  // ── Adicionar ──
  const addFlavor = () => {
    const name = newName.trim().toUpperCase();
    if (!name) { setAddError('Digite o nome do sabor'); return; }
    if (settings.flavorConfigs.some((fc) => fc.name === name)) { setAddError('Já existe um sabor com esse nome'); return; }
    const id = `custom-${Date.now()}`;
    setSettings((p) => ({
      ...p,
      flavorConfigs: [...p.flavorConfigs, { id, name, active: true, priceEurCents: newPriceCents }],
    }));
    setNewName('');
    setNewPriceCents(170);
    setAddError('');
  };

  // ── Editar ──
  const startEdit = (fc: FlavorConfig) => {
    setEditingId(fc.id);
    setEditName(fc.name);
    setEditPriceCents(fc.priceEurCents);
  };

  const confirmEdit = () => {
    const name = editName.trim().toUpperCase();
    if (!name) return;
    setSettings((p) => ({
      ...p,
      flavorConfigs: p.flavorConfigs.map((fc) =>
        fc.id === editingId ? { ...fc, name, priceEurCents: editPriceCents } : fc
      ),
    }));
    setEditingId(null);
  };

  // ── Toggle / Excluir ──
  const toggle = (id: string) =>
    setSettings((p) => ({
      ...p,
      flavorConfigs: p.flavorConfigs.map((fc) => fc.id === id ? { ...fc, active: !fc.active } : fc),
    }));

  const remove = (id: string) =>
    setSettings((p) => ({ ...p, flavorConfigs: p.flavorConfigs.filter((fc) => fc.id !== id) }));

  // ── Salvar ──
  const handleSave = async () => {
    setSaving(true); setError(''); setSaved(false);
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 5000); }
    else setError('Erro ao salvar. Tente novamente.');
    setSaving(false);
  };

  const activeCount = settings.flavorConfigs.filter((f) => f.active).length;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400 text-lg">⏳ Carregando...</div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-gray-500 hover:text-gray-700 font-medium">← Pedidos</Link>
          <span className="text-gray-300">|</span>
          <h1 className="font-bold text-gray-900">⚙️ Configurações</h1>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? '⏳ Salvando...' : '💾 Salvar'}
        </button>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {saved && (
          <div className="bg-green-50 border border-green-300 text-green-800 rounded-xl p-4 font-semibold">
            ✅ Salvo! As alterações já aparecem no site do cliente.
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">⚠️ {error}</div>
        )}

        {/* ── Configurações gerais ── */}
        <div className="card p-6">
          <h2 className="font-bold text-gray-900 text-lg mb-5">Configurações Gerais</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="label">Frete padrão</label>
              <EuroField
                cents={settings.freightEurCents}
                onChange={(c) => setSettings((p) => ({ ...p, freightEurCents: c }))}
                placeholder="0,00"
              />
              <p className="text-xs text-gray-400 mt-1">0,00 = frete grátis</p>
            </div>
            <div>
              <label className="label">Pedido mínimo</label>
              <EuroField
                cents={settings.minOrderEurCents}
                onChange={(c) => setSettings((p) => ({ ...p, minOrderEurCents: c }))}
                placeholder="85,00"
              />
              <p className="text-xs text-gray-400 mt-1">Valor mínimo do pedido</p>
            </div>
          </div>
        </div>

        {/* ── Cadastrar sabor ── */}
        <div className="card p-6">
          <h2 className="font-bold text-gray-900 text-lg mb-4">➕ Cadastrar Sabor</h2>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[180px]">
              <label className="label">Nome do sabor</label>
              <input
                type="text"
                className="input-field"
                placeholder="Ex: MORANGO"
                value={newName}
                onChange={(e) => { setNewName(e.target.value); setAddError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && addFlavor()}
              />
            </div>
            <div className="w-40">
              <label className="label">Preço</label>
              <EuroField cents={newPriceCents} onChange={setNewPriceCents} placeholder="1,70" />
            </div>
            <button onClick={addFlavor} className="btn-primary py-3 px-6 whitespace-nowrap">
              + Cadastrar
            </button>
          </div>
          {addError && <p className="text-red-500 text-sm mt-2">⚠️ {addError}</p>}
        </div>

        {/* ── Lista de sabores ── */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-gray-900 text-lg">Sabores Cadastrados</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {activeCount} visíveis de {settings.flavorConfigs.length} cadastrados
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSettings((p) => ({ ...p, flavorConfigs: p.flavorConfigs.map((fc) => ({ ...fc, active: true })) }))}
                className="text-sm text-brand-600 border border-brand-200 px-3 py-1.5 rounded-lg hover:bg-brand-50 font-semibold"
              >
                Ativar todos
              </button>
              <button
                onClick={() => setSettings((p) => ({ ...p, flavorConfigs: p.flavorConfigs.map((fc) => ({ ...fc, active: false })) }))}
                className="text-sm text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 font-semibold"
              >
                Desativar todos
              </button>
            </div>
          </div>

          {settings.flavorConfigs.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <p className="text-4xl mb-3">🍭</p>
              <p>Nenhum sabor cadastrado ainda.</p>
              <p className="text-sm mt-1">Use o formulário acima para cadastrar.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Cabeçalho */}
              <div className="grid grid-cols-[24px_1fr_130px_80px] gap-3 px-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <div></div>
                <div>Nome</div>
                <div className="text-right">Preço</div>
                <div className="text-center">Ações</div>
              </div>

              {settings.flavorConfigs.map((fc) => (
                <div key={fc.id}>
                  {editingId === fc.id ? (
                    // ── Modo edição ──
                    <div className="grid grid-cols-[24px_1fr_130px_80px] gap-3 items-center p-3 rounded-xl border-2 border-brand-400 bg-brand-50">
                      <div />
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="input-field py-1.5 text-sm font-bold"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && confirmEdit()}
                      />
                      <EuroField cents={editPriceCents} onChange={setEditPriceCents} />
                      <div className="flex gap-1 justify-center">
                        <button
                          onClick={confirmEdit}
                          className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-2 py-1.5 rounded-lg"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs font-bold px-2 py-1.5 rounded-lg"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    // ── Modo visualização ──
                    <div className={`grid grid-cols-[24px_1fr_130px_80px] gap-3 items-center p-3 rounded-xl border transition-all ${
                      fc.active ? 'border-gray-200 bg-white' : 'border-dashed border-gray-200 bg-gray-50'
                    }`}>
                      {/* Checkbox visibilidade */}
                      <input
                        type="checkbox"
                        checked={fc.active}
                        onChange={() => toggle(fc.id)}
                        className="accent-brand-600 w-4 h-4 cursor-pointer"
                        title={fc.active ? 'Clique para ocultar do site' : 'Clique para mostrar no site'}
                      />

                      {/* Nome */}
                      <span className={`text-sm font-semibold truncate ${fc.active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                        {fc.name}
                        {!fc.active && <span className="ml-2 text-xs font-normal no-underline" style={{ textDecoration: 'none' }}>oculto</span>}
                      </span>

                      {/* Preço */}
                      <div className="text-right">
                        <span className="text-sm font-bold text-gray-800">{formatEUR(fc.priceEurCents)}</span>
                      </div>

                      {/* Ações */}
                      <div className="flex gap-1 justify-center">
                        <button
                          onClick={() => startEdit(fc)}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold px-2 py-1.5 rounded-lg transition-colors"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => remove(fc.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-500 text-xs font-semibold px-2 py-1.5 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pb-10">
          <button onClick={handleSave} disabled={saving} className="btn-primary px-10 py-3 text-base">
            {saving ? '⏳ Salvando...' : '💾 Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}
