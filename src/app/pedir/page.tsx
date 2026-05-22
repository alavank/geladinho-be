'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { formatEUR } from '@/lib/flavors';
import { SystemSettings, FlavorConfig } from '@/lib/settings';
import { CartItem } from '@/types';
import FlavorCard from '@/components/FlavorCard';
import OrderForm from '@/components/OrderForm';
import ConfirmModal from '@/components/ConfirmModal';
import SuccessScreen from '@/components/SuccessScreen';
import StickyCart from '@/components/StickyCart';
import DesktopSidebar from '@/components/DesktopSidebar';

type Step = 'catalog' | 'form' | 'confirm' | 'success';

export interface FormData {
  customerName: string;
  customerPhone: string;
  phoneCountry: string;
  addressFull: string;
  addressStreet: string;
  addressNumber: string;
  addressPostalCode: string;
  addressCommune: string;
  needsChange: boolean;
  changeAmount: string;
  notes: string;
}

export interface ActiveFlavor {
  id: string;
  name: string;
  priceEurCents: number;
  index: number;
}

const EMPTY_FORM: FormData = {
  customerName: '', customerPhone: '', phoneCountry: 'BE',
  addressFull: '',
  addressStreet: '', addressNumber: '',
  addressPostalCode: '', addressCommune: '',
  needsChange: false, changeAmount: '', notes: '',
};

export default function HomePage() {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [step, setStep] = useState<Step>('catalog');
  const [orderId, setOrderId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    fetch('/api/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((s: SystemSettings) => { setSettings(s); setLoadingSettings(false); })
      .catch(() => setLoadingSettings(false));
  }, []);

  const activeFlavors: ActiveFlavor[] = useMemo(() => {
    if (!settings) return [];
    let idx = 0;
    return settings.flavorConfigs
      .filter((fc: FlavorConfig) => fc.active)
      .map((fc: FlavorConfig) => ({ id: fc.id, name: fc.name, priceEurCents: fc.priceEurCents, index: idx++ }));
  }, [settings]);

  const freightCents = settings?.freightEurCents ?? 0;
  const minOrderCents = settings?.minOrderEurCents ?? 8500;

  const cartItems: CartItem[] = useMemo(
    () => activeFlavors.filter((f) => (quantities[f.id] || 0) > 0)
      .map((f) => ({ flavorId: f.id, flavorName: f.name, quantity: quantities[f.id] || 0 })),
    [quantities, activeFlavors]
  );

  const subtotalCents = useMemo(() => {
    let total = 0;
    for (const item of cartItems) {
      const f = activeFlavors.find((af) => af.id === item.flavorId);
      total += (f?.priceEurCents ?? 0) * item.quantity;
    }
    return total;
  }, [cartItems, activeFlavors]);

  const totalUnits = useMemo(() => cartItems.reduce((s, i) => s + i.quantity, 0), [cartItems]);
  const grandTotalCents = subtotalCents + freightCents;
  const canProceed = subtotalCents >= minOrderCents;

  const updateQuantity = useCallback((flavorId: string, value: number) => {
    setQuantities((prev) => ({ ...prev, [flavorId]: Math.max(0, value) }));
  }, []);

  const handleProceed = () => { if (!canProceed) return; setStep('form'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const handleFormSubmit = (data: FormData) => { setFormData(data); setStep('confirm'); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const handleConfirm = async () => {
    setSubmitting(true); setSubmitError('');
    try {
      const changeAmountCents = formData.needsChange && formData.changeAmount
        ? Math.round(parseFloat(formData.changeAmount.replace(',', '.')) * 100) : undefined;
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: formData.customerName, customerPhone: formData.customerPhone, phoneCountry: formData.phoneCountry,
          addressStreet: formData.addressStreet, addressNumber: formData.addressNumber,
          addressPostalCode: formData.addressPostalCode, addressCommune: formData.addressCommune,
          needsChange: formData.needsChange, changeAmountEurCents: changeAmountCents,
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

  if (step === 'success') return <SuccessScreen orderId={orderId} />;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAFAFA' }}>
      {/* Header */}
      <header style={{ background: 'linear-gradient(135deg, #C41230 0%, #4A1E00 100%)' }} className="sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Image src="/logo.png" alt="Madame Simone" width={160} height={56} className="h-12 w-auto object-contain" />
          {step !== 'catalog' && (
            <button onClick={() => setStep(step === 'form' ? 'catalog' : 'form')} className="ml-auto text-white/90 hover:text-white text-sm underline">
              ← Voltar
            </button>
          )}
        </div>
      </header>

      {/* Steps */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-0 flex gap-0">
          {[{ key: 'catalog', label: '1. Sabores' }, { key: 'form', label: '2. Dados' }, { key: 'confirm', label: '3. Confirmar' }].map((s) => (
            <span key={s.key} className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all ${step === s.key ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-400'}`}>
              {s.label}
            </span>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 lg:flex lg:gap-8 pb-32 lg:pb-6">
        <div className="flex-1">
          {step === 'catalog' && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Escolha seus sabores</h2>
                {!loadingSettings && settings && (
                  <p className="text-gray-500 mt-1">
                    Pedido mínimo: <span className="font-semibold text-brand-600">{formatEUR(minOrderCents)}</span>
                    {freightCents > 0 && <> · Frete: <span className="font-semibold text-brand-600">{formatEUR(freightCents)}</span></>}
                  </p>
                )}
              </div>
              {loadingSettings ? (
                <div className="flex items-center justify-center py-20 text-gray-400">⏳ Carregando cardápio...</div>
              ) : activeFlavors.length === 0 ? (
                <div className="flex items-center justify-center py-20 text-gray-400 text-center">
                  <div><p className="text-4xl mb-3">🧊</p><p className="font-semibold">Cardápio não disponível no momento.</p></div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {activeFlavors.map((flavor) => (
                    <FlavorCard
                      key={flavor.id}
                      flavorId={flavor.id}
                      flavorName={flavor.name}
                      colorIndex={flavor.index}
                      quantity={quantities[flavor.id] || 0}
                      unitPriceCents={flavor.priceEurCents}
                      onQuantityChange={(val) => updateQuantity(flavor.id, val)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
          {step === 'form' && (
            <OrderForm initialData={formData} onSubmit={handleFormSubmit} cartItems={cartItems}
              activeFlavors={activeFlavors} totalUnits={totalUnits} subtotalCents={subtotalCents}
              freightCents={freightCents} grandTotalCents={grandTotalCents} />
          )}
          {step === 'confirm' && (
            <ConfirmModal formData={formData} cartItems={cartItems} activeFlavors={activeFlavors}
              totalUnits={totalUnits} subtotalCents={subtotalCents} freightCents={freightCents}
              grandTotalCents={grandTotalCents} onConfirm={handleConfirm} onBack={() => setStep('form')}
              submitting={submitting} error={submitError} />
          )}
        </div>
        {step === 'catalog' && (
          <DesktopSidebar cartItems={cartItems} activeFlavors={activeFlavors} totalUnits={totalUnits}
            subtotalCents={subtotalCents} freightCents={freightCents} grandTotalCents={grandTotalCents}
            minOrderCents={minOrderCents} onProceed={handleProceed} />
        )}
      </div>

      {step === 'catalog' && (
        <StickyCart totalUnits={totalUnits} subtotalCents={subtotalCents} freightCents={freightCents}
          grandTotalCents={grandTotalCents} minOrderCents={minOrderCents} onProceed={handleProceed} />
      )}
    </div>
  );
}
