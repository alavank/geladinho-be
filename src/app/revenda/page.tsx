'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { SystemSettings, FlavorConfig } from '@/lib/settings';
import { CartItem } from '@/types';
import { formatEUR } from '@/lib/flavors';
import AddressAutocomplete from '@/components/AddressAutocomplete';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActiveFlavor { id: string; name: string; priceEurCents: number; index: number }

interface B2BFormData {
  establishmentName: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  addressStreet: string;
  addressNumber: string;
  addressPostalCode: string;
  addressCommune: string;
  needsChange: boolean;
  changeAmount: string;
  notes: string;
}

type Step = 'catalog' | 'form' | 'confirm' | 'success';

const EMPTY_FORM: B2BFormData = {
  establishmentName: '', customerName: '', customerPhone: '', customerEmail: '',
  addressStreet: '', addressNumber: '', addressPostalCode: '', addressCommune: '',
  needsChange: false, changeAmount: '', notes: '',
};

// ─── Colors ───────────────────────────────────────────────────────────────────

const ICE_COLORS = [
  'bg-blue-50 text-blue-900 border-blue-200',
  'bg-cyan-50 text-cyan-900 border-cyan-200',
  'bg-sky-50 text-sky-900 border-sky-200',
  'bg-indigo-50 text-indigo-900 border-indigo-200',
  'bg-teal-50 text-teal-900 border-teal-200',
  'bg-blue-100 text-blue-900 border-blue-300',
  'bg-cyan-100 text-cyan-900 border-cyan-300',
  'bg-sky-100 text-sky-900 border-sky-300',
  'bg-indigo-100 text-indigo-900 border-indigo-300',
  'bg-teal-100 text-teal-900 border-teal-300',
];

// ─── Stepper Component ────────────────────────────────────────────────────────

function Stepper({ quantity, onChange, min }: { quantity: number; onChange: (v: number) => void; min: number }) {
  const step = min;
  return (
    <div className="flex items-center gap-1 w-full">
      <button
        onClick={() => onChange(Math.max(0, quantity - step))}
        disabled={quantity === 0}
        className="w-8 h-8 shrink-0 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-30 font-bold text-gray-700 flex items-center justify-center text-lg transition-colors"
      >−</button>
      <input
        type="number"
        min={0}
        step={step}
        value={quantity}
        onChange={(e) => { const v = parseInt(e.target.value, 10); if (isNaN(v) || v <= 0) { onChange(0); } else { onChange(Math.round(v / step) * step); } }}
        className="flex-1 min-w-0 text-center font-bold text-gray-900 border border-gray-200 rounded-lg py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <button
        onClick={() => onChange(quantity + step)}
        className="w-8 h-8 shrink-0 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold flex items-center justify-center text-lg transition-colors"
      >+</button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RevendaPage() {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [formData, setFormData] = useState<B2BFormData>(EMPTY_FORM);
  const [step, setStep] = useState<Step>('catalog');
  const [orderId, setOrderId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [errors, setErrors] = useState<Partial<Record<keyof B2BFormData, string>>>({});

  useEffect(() => {
    fetch('/api/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((s: SystemSettings) => { setSettings(s); setLoadingSettings(false); })
      .catch(() => setLoadingSettings(false));
  }, []);

  const activeFlavors: ActiveFlavor[] = useMemo(() => {
    if (!settings) return [];
    let idx = 0;
    return (settings.b2bFlavorConfigs || [])
      .filter((fc: FlavorConfig) => fc.active)
      .map((fc: FlavorConfig) => ({ id: fc.id, name: fc.name, priceEurCents: fc.priceEurCents, index: idx++ }));
  }, [settings]);

  const minPerFlavor = settings?.b2bMinPerFlavor ?? 5;
  const minTotalUnits = settings?.b2bMinTotalUnits ?? 100;
  const freightCents = settings?.b2bFreightEurCents ?? 0;

  const cartItems: CartItem[] = useMemo(
    () => activeFlavors.filter((f) => (quantities[f.id] || 0) > 0)
      .map((f) => ({ flavorId: f.id, flavorName: f.name, quantity: quantities[f.id] || 0 })),
    [quantities, activeFlavors]
  );

  const subtotalCents = useMemo(() => {
    let total = 0;
    for (const item of cartItems) {
      const f = activeFlavors.find((af) => af.id === item.flavorId);
      total += (f?.priceEurCents ?? 170) * item.quantity;
    }
    return total;
  }, [cartItems, activeFlavors]);

  const totalUnits = useMemo(() => cartItems.reduce((s, i) => s + i.quantity, 0), [cartItems]);
  const grandTotalCents = subtotalCents + freightCents;

  // Check min per flavor violations
  const flavorErrors = useMemo(() => {
    return cartItems.filter((i) => i.quantity > 0 && i.quantity < minPerFlavor);
  }, [cartItems, minPerFlavor]);

  const canProceed = totalUnits >= minTotalUnits && flavorErrors.length === 0;

  const updateQuantity = useCallback((flavorId: string, value: number) => {
    setQuantities((prev) => ({ ...prev, [flavorId]: Math.max(0, value) }));
  }, []);

  const setField = (field: keyof B2BFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validateForm = (): boolean => {
    const e: Partial<Record<keyof B2BFormData, string>> = {};
    if (!formData.establishmentName.trim()) e.establishmentName = 'Nome do estabelecimento obrigatório';
    if (!formData.customerName.trim()) e.customerName = 'Nome do contato obrigatório';
    if (!formData.customerPhone.trim()) e.customerPhone = 'Telefone obrigatório';
    if (!formData.addressStreet.trim()) e.addressStreet = 'Rua obrigatória';
    if (!formData.addressNumber.trim()) e.addressNumber = 'Número obrigatório';
    if (!/^\d{4}$/.test(formData.addressPostalCode)) e.addressPostalCode = 'Código postal deve ter 4 dígitos';
    if (!formData.addressCommune.trim()) e.addressCommune = 'Comuna obrigatória';
    if (formData.needsChange && !formData.changeAmount.trim()) e.changeAmount = 'Informe o valor em mãos';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const changeAmountCents = formData.needsChange && formData.changeAmount
        ? Math.round(parseFloat(formData.changeAmount.replace(',', '.')) * 100) : undefined;

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'b2b',
          establishmentName: formData.establishmentName,
          customerName: formData.customerName,
          customerPhone: formData.customerPhone,
          customerEmail: formData.customerEmail || undefined,
          addressStreet: formData.addressStreet,
          addressNumber: formData.addressNumber,
          addressPostalCode: formData.addressPostalCode,
          addressCommune: formData.addressCommune,
          needsChange: formData.needsChange,
          changeAmountEurCents: changeAmountCents,
          notes: formData.notes || undefined,
          items: cartItems.map((i) => ({ flavorId: i.flavorId, flavorName: i.flavorName, quantity: i.quantity })),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao enviar pedido');
      setOrderId(json.orderId);
      setStep('success');
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Erro inesperado');
    } finally {
      setSubmitting(false);
    }
  };

  const errClass = (field: keyof B2BFormData) => errors[field] ? 'border-red-400 focus:ring-red-400' : '';

  // ── Success ──
  if (step === 'success') {
    const shortId = orderId.substring(0, 8).toUpperCase();
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #E0F2FE 100%)' }}>
        <div className="max-w-md w-full text-center">
          <div className="mb-6">
            <Image src="/logo.png" alt="Madame Simone" width={220} height={80} className="mx-auto h-16 w-auto object-contain" />
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Pedido enviado!</h1>
            <p className="text-gray-600 mb-6">Recebemos seu pedido de revenda e entraremos em contato para confirmar a entrega.</p>
            <div className="rounded-2xl p-4 mb-6 bg-blue-50 border border-blue-200">
              <p className="text-sm font-medium text-blue-700 mb-1">Número do pedido</p>
              <p className="text-3xl font-mono font-bold text-blue-700">#{shortId}</p>
            </div>
            <button onClick={() => window.location.reload()} className="w-full border border-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-xl hover:bg-gray-50 transition-all">
              Fazer novo pedido
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F0F9FF' }}>
      {/* Header */}
      <header style={{ background: 'linear-gradient(135deg, #0EA5E9 0%, #0369A1 50%, #1E3A5F 100%)' }} className="sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Image src="/logo.png" alt="Madame Simone" width={160} height={56} className="h-12 w-auto object-contain" />
          <div className="ml-2 border-l border-white/30 pl-4">
            
            <p className="text-white text-sm font-bold">Formulário de Pedidos de Geladinho - Revenda</p>
          </div>
          {step !== 'catalog' && (
            <button onClick={() => setStep(step === 'form' ? 'catalog' : 'form')} className="ml-auto text-white/90 hover:text-white text-sm underline">
              ← Voltar
            </button>
          )}
        </div>
      </header>

      {/* Steps */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 flex gap-0">
          {[{ key: 'catalog', label: '1. Produtos' }, { key: 'form', label: '2. Dados' }, { key: 'confirm', label: '3. Confirmar' }].map((s) => (
            <span key={s.key} className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all ${step === s.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'}`}>
              {s.label}
            </span>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 lg:flex lg:gap-8 pb-32 lg:pb-6">
        <div className="flex-1">

          {/* ── CATALOG ── */}
          {step === 'catalog' && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Catálogo de Sabores de Geladinho</h2>
                {!loadingSettings && settings && (
                  <div className="mt-2 flex flex-wrap gap-3">
                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1.5 rounded-full">
                      📦 Mínimo: {minTotalUnits} unidades no total
                    </span>
                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1.5 rounded-full">
                      🍭 Mínimo por sabor: {minPerFlavor} unidades
                    </span>
                    {freightCents > 0 && (
                      <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1.5 rounded-full">
                        🚚 Frete: {formatEUR(freightCents)}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {loadingSettings ? (
                <div className="flex items-center justify-center py-20 text-gray-400">⏳ Carregando catálogo...</div>
              ) : activeFlavors.length === 0 ? (
                <div className="flex items-center justify-center py-20 text-gray-400 text-center">
                  <div><p className="text-4xl mb-3">🧊</p><p className="font-semibold">Catálogo não disponível no momento.</p></div>
                </div>
              ) : (
                <>
                  {flavorErrors.length > 0 && (
                    <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <p className="text-sm font-semibold text-amber-800 mb-1">⚠️ Quantidade mínima por sabor não atingida:</p>
                      {flavorErrors.map((e) => (
                        <p key={e.flavorId} className="text-xs text-amber-700">• {e.flavorName}: {e.quantity} un. (mínimo: {minPerFlavor})</p>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {activeFlavors.map((flavor) => {
                      const qty = quantities[flavor.id] || 0;
                      const isSelected = qty > 0;
                      const hasError = qty > 0 && qty < minPerFlavor;
                      const colorClass = ICE_COLORS[flavor.index % ICE_COLORS.length];
                      return (
                        <div key={flavor.id} className={`rounded-2xl border-2 transition-all duration-200 flex flex-col overflow-hidden ${
                          hasError ? 'border-amber-400 shadow-lg shadow-amber-100' :
                          isSelected ? 'border-blue-500 shadow-lg shadow-blue-100' :
                          'border-transparent shadow-sm hover:shadow-md'
                        }`}>
                          <div className={`${colorClass} border flex-1 flex flex-col items-center justify-center px-3 py-5 min-h-[90px]`}>
                            <p className="font-black text-center leading-tight text-sm tracking-wide">{flavor.name}</p>
                            <p className="text-xs font-semibold mt-1 opacity-60">{formatEUR(flavor.priceEurCents)}/un.</p>
                            {hasError && <p className="text-xs font-bold text-amber-600 mt-1">mín. {minPerFlavor}</p>}
                          </div>
                          <div className="bg-white px-2 py-2 flex items-center gap-1 border-t border-gray-100">
                            <Stepper quantity={qty} onChange={(v) => updateQuantity(flavor.id, v)} min={minPerFlavor} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}

          {/* ── FORM ── */}
          {step === 'form' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">📋 Dados do Estabelecimento</h2>
              <form onSubmit={(e) => { e.preventDefault(); if (validateForm()) setStep('confirm'); }} noValidate>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
                  <h3 className="font-bold text-gray-800 mb-4 text-lg">🏪 Estabelecimento</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="label">Nome do Estabelecimento *</label>
                      <input className={`input-field ${errClass('establishmentName')}`} placeholder="Ex: Supermercado Bom Preço"
                        value={formData.establishmentName} onChange={(e) => setField('establishmentName', e.target.value)} />
                      {errors.establishmentName && <p className="text-red-500 text-xs mt-1">{errors.establishmentName}</p>}
                    </div>
                    <div>
                      <label className="label">Nome do Contato Responsável *</label>
                      <input className={`input-field ${errClass('customerName')}`} placeholder="Ex: João Silva"
                        value={formData.customerName} onChange={(e) => setField('customerName', e.target.value)} />
                      {errors.customerName && <p className="text-red-500 text-xs mt-1">{errors.customerName}</p>}
                    </div>
                    <div>
                      <label className="label">Telefone * <span className="text-blue-600 font-normal text-xs">📱 WhatsApp</span></label>
                      <input className={`input-field ${errClass('customerPhone')}`} placeholder="+32 470 12 34 56"
                        value={formData.customerPhone} onChange={(e) => setField('customerPhone', e.target.value)} type="tel" />
                      {errors.customerPhone && <p className="text-red-500 text-xs mt-1">{errors.customerPhone}</p>}
                    </div>
                    <div>
                      <label className="label">Email <span className="text-gray-400 font-normal text-xs">(opcional)</span></label>
                      <input className="input-field" placeholder="contato@estabelecimento.be" type="email"
                        value={formData.customerEmail} onChange={(e) => setField('customerEmail', e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
                  <h3 className="font-bold text-gray-800 mb-4 text-lg">📍 Endereço de Entrega</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="label">Rue, Avenue, Chaussée... *</label>
                      <AddressAutocomplete
                        className={`input-field ${errClass('addressStreet')}`}
                        placeholder="Ex: Rue de la Loi"
                        value={formData.addressStreet}
                        onChange={(v) => setField('addressStreet', v)}
                        onAddressSelected={(addr) => {
                          setFormData((prev) => ({
                            ...prev,
                            addressStreet: addr.street,
                            addressNumber: addr.number || prev.addressNumber,
                            addressPostalCode: addr.postalCode || prev.addressPostalCode,
                            addressCommune: addr.city || prev.addressCommune,
                          }));
                          setErrors({});
                        }}
                      />
                      {errors.addressStreet && <p className="text-red-500 text-xs mt-1">{errors.addressStreet}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Número *</label>
                        <input className={`input-field ${errClass('addressNumber')}`} placeholder="16"
                          value={formData.addressNumber} onChange={(e) => setField('addressNumber', e.target.value)} />
                        {errors.addressNumber && <p className="text-red-500 text-xs mt-1">{errors.addressNumber}</p>}
                      </div>
                      <div>
                        <label className="label">Código Postal *</label>
                        <input className={`input-field ${errClass('addressPostalCode')}`} placeholder="1000"
                          value={formData.addressPostalCode} onChange={(e) => setField('addressPostalCode', e.target.value.replace(/\D/g, ''))}
                          maxLength={4} inputMode="numeric" />
                        {errors.addressPostalCode && <p className="text-red-500 text-xs mt-1">{errors.addressPostalCode}</p>}
                      </div>
                    </div>
                    <div>
                      <label className="label">Comuna *</label>
                      <input className={`input-field ${errClass('addressCommune')}`} placeholder="Ex: Bruxelles, Liège..."
                        value={formData.addressCommune} onChange={(e) => setField('addressCommune', e.target.value)} />
                      {errors.addressCommune && <p className="text-red-500 text-xs mt-1">{errors.addressCommune}</p>}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
                  <h3 className="font-bold text-gray-800 mb-4 text-lg">💶 Pagamento</h3>
                  <p className="text-gray-600 text-sm mb-4">Precisa de troco?</p>
                  <div className="flex gap-3 mb-4">
                    {[{ value: false, label: 'Não', icon: '✅' }, { value: true, label: 'Sim', icon: '💵' }].map((opt) => (
                      <label key={String(opt.value)} className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        formData.needsChange === opt.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}>
                        <input type="radio" name="needsChange" checked={formData.needsChange === opt.value}
                          onChange={() => setField('needsChange', opt.value)} className="accent-blue-600" />
                        <span className="font-semibold text-gray-800">{opt.icon} {opt.label}</span>
                      </label>
                    ))}
                  </div>
                  {formData.needsChange && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <p className="font-bold text-amber-900 mb-1">Troco pra quanto?</p>
                      <label className="label text-amber-800 font-normal text-sm">Qual valor você tem em mãos? (€) *</label>
                      <input className={`input-field mt-1 ${errClass('changeAmount')}`} placeholder="Ex: 200"
                        value={formData.changeAmount} onChange={(e) => setField('changeAmount', e.target.value)} inputMode="decimal" />
                      {errors.changeAmount && <p className="text-red-500 text-xs mt-1">{errors.changeAmount}</p>}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
                  <h3 className="font-bold text-gray-800 mb-3 text-lg">📝 Observações</h3>
                  <textarea className="input-field resize-none" rows={3} placeholder="Instruções de entrega, referências, etc. (opcional)"
                    value={formData.notes} onChange={(e) => setField('notes', e.target.value)} />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
                  <div className="flex justify-between text-sm text-blue-700">
                    <span>{totalUnits} unidades · {cartItems.length} sabor{cartItems.length !== 1 ? 'es' : ''}</span>
                    <span>{formatEUR(subtotalCents)}</span>
                  </div>
                  {freightCents > 0 && (
                    <div className="flex justify-between text-sm text-blue-700 mt-1">
                      <span>Frete</span><span>{formatEUR(freightCents)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg text-blue-800 border-t border-blue-200 pt-2 mt-2">
                    <span>Total</span><span>{formatEUR(grandTotalCents)}</span>
                  </div>
                </div>

                <button type="submit" className="w-full text-white font-semibold py-4 px-6 rounded-xl text-lg shadow-md hover:shadow-lg transition-all"
                  style={{ background: 'linear-gradient(135deg, #0EA5E9, #0369A1)' }}>
                  Revisar pedido →
                </button>
              </form>
            </div>
          )}

          {/* ── CONFIRM ── */}
          {step === 'confirm' && (
            <div className="max-w-lg mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">✅ Confirmar Pedido</h2>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
                <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide mb-3">Dados do Estabelecimento</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex gap-2"><dt className="text-gray-500 w-28 shrink-0">Estabelecimento:</dt><dd className="font-semibold text-gray-900">{formData.establishmentName}</dd></div>
                  <div className="flex gap-2"><dt className="text-gray-500 w-28 shrink-0">Contato:</dt><dd className="font-semibold text-gray-900">{formData.customerName}</dd></div>
                  <div className="flex gap-2"><dt className="text-gray-500 w-28 shrink-0">Telefone:</dt><dd className="font-semibold text-gray-900">{formData.customerPhone}</dd></div>
                  {formData.customerEmail && <div className="flex gap-2"><dt className="text-gray-500 w-28 shrink-0">Email:</dt><dd className="font-semibold text-gray-900">{formData.customerEmail}</dd></div>}
                  <div className="flex gap-2"><dt className="text-gray-500 w-28 shrink-0">Endereço:</dt><dd className="font-semibold text-gray-900">{formData.addressStreet}, {formData.addressNumber} — {formData.addressPostalCode} {formData.addressCommune}</dd></div>
                  <div className="flex gap-2"><dt className="text-gray-500 w-28 shrink-0">Troco:</dt><dd className="font-semibold text-gray-900">{formData.needsChange ? `Sim — tem € ${formData.changeAmount} em mãos` : 'Não precisa'}</dd></div>
                  {formData.notes && <div className="flex gap-2"><dt className="text-gray-500 w-28 shrink-0">Obs.:</dt><dd className="text-gray-700 italic">{formData.notes}</dd></div>}
                </dl>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
                <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide mb-3">Itens do Pedido</h3>
                <ul className="space-y-2">
                  {cartItems.map((item) => {
                    const f = activeFlavors.find((af) => af.id === item.flavorId);
                    const price = f?.priceEurCents ?? 170;
                    return (
                      <li key={item.flavorId} className="flex justify-between text-sm">
                        <span className="text-gray-800">{item.flavorName}</span>
                        <span className="font-semibold text-gray-900">{item.quantity} un. · {formatEUR(price * item.quantity)}</span>
                      </li>
                    );
                  })}
                </ul>
                <div className="border-t border-gray-100 mt-4 pt-4 space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal ({totalUnits} unidades)</span>
                    <span className="font-bold">{formatEUR(subtotalCents)}</span>
                  </div>
                  {freightCents > 0 && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Frete</span><span className="font-bold">{formatEUR(freightCents)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t border-gray-100 pt-2">
                    <span>Total a pagar</span>
                    <span style={{ color: '#0369A1' }}>{formatEUR(grandTotalCents)}</span>
                  </div>
                </div>
              </div>

              {submitError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4 text-sm">⚠️ {submitError}</div>}

              <div className="flex gap-3">
                <button onClick={() => setStep('form')} disabled={submitting}
                  className="flex-1 border border-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50">
                  ← Editar
                </button>
                <button onClick={handleConfirm} disabled={submitting}
                  className="flex-1 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #0EA5E9, #0369A1)' }}>
                  {submitting ? <><span className="animate-spin">⏳</span> Enviando...</> : '📦 Confirmar pedido'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Desktop sidebar */}
        {step === 'catalog' && (
          <div className="hidden lg:block w-80 shrink-0">
            <div className="sticky top-24 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-bold text-lg text-gray-900 mb-4">📦 Resumo do Pedido</h3>
              {cartItems.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">Nenhum produto selecionado.</p>
              ) : (
                <ul className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                  {cartItems.map((item) => {
                    const f = activeFlavors.find((af) => af.id === item.flavorId);
                    const hasErr = item.quantity < minPerFlavor;
                    return (
                      <li key={item.flavorId} className="flex justify-between text-sm">
                        <span className={`flex-1 line-clamp-1 ${hasErr ? 'text-amber-600' : 'text-gray-700'}`}>{item.flavorName}</span>
                        <span className="font-semibold text-gray-900 ml-2 shrink-0">× {item.quantity} = {formatEUR((f?.priceEurCents ?? 170) * item.quantity)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="border-t border-gray-100 pt-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Total unidades</span>
                  <span className={`font-semibold ${totalUnits >= minTotalUnits ? 'text-green-600' : 'text-amber-600'}`}>
                    {totalUnits} / {minTotalUnits}
                  </span>
                </div>
                {freightCents > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Frete</span><span className="font-semibold">{formatEUR(freightCents)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t border-gray-100 pt-2">
                  <span>Total</span>
                  <span style={{ color: '#0369A1' }}>{formatEUR(grandTotalCents)}</span>
                </div>
              </div>

              {!canProceed && totalUnits > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-3 text-xs text-amber-700">
                  {totalUnits < minTotalUnits && <p>• Faltam {minTotalUnits - totalUnits} unidades para o mínimo</p>}
                  {flavorErrors.map((e) => <p key={e.flavorId}>• {e.flavorName}: mín. {minPerFlavor} un.</p>)}
                </div>
              )}

              <button onClick={() => { if (canProceed) { setStep('form'); window.scrollTo({ top: 0, behavior: 'smooth' }); } }}
                disabled={!canProceed}
                className="w-full mt-4 text-white font-semibold py-3 px-6 rounded-xl transition-all disabled:opacity-40"
                style={{ background: canProceed ? 'linear-gradient(135deg, #0EA5E9, #0369A1)' : '#94A3B8' }}>
                Finalizar pedido →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile sticky footer */}
      {step === 'catalog' && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-2xl px-4 py-3">
          {flavorErrors.length > 0 && (
            <p className="text-xs text-amber-600 text-center mb-1 font-medium">⚠️ Verifique as quantidades mínimas por sabor</p>
          )}
          {totalUnits < minTotalUnits && totalUnits > 0 && (
            <p className="text-xs text-amber-600 text-center mb-1 font-medium">
              Faltam {minTotalUnits - totalUnits} unidades para o mínimo de {minTotalUnits}
            </p>
          )}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm text-gray-500"><span className="font-bold text-gray-900">{totalUnits}</span> unidades</p>
              <p className="text-lg font-bold" style={{ color: '#0369A1' }}>{formatEUR(grandTotalCents)}</p>
            </div>
            <button onClick={() => { if (canProceed) { setStep('form'); window.scrollTo({ top: 0, behavior: 'smooth' }); } }}
              disabled={!canProceed}
              className="text-white font-semibold px-5 py-3 rounded-xl whitespace-nowrap disabled:opacity-40 transition-all"
              style={{ background: 'linear-gradient(135deg, #0EA5E9, #0369A1)' }}>
              Finalizar pedido →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
