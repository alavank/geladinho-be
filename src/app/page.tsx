'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { FLAVORS, formatEUR } from '@/lib/flavors';
import { SystemSettings } from '@/lib/settings';
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
  addressStreet: string;
  addressNumber: string;
  addressPostalCode: string;
  addressCommune: string;
  needsChange: boolean;
  changeAmount: string;
  notes: string;
}

const EMPTY_FORM: FormData = {
  customerName: '', customerPhone: '',
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
    fetch('/api/settings')
      .then((r) => r.json())
      .then((s) => { setSettings(s); setLoadingSettings(false); })
      .catch(() => setLoadingSettings(false));
  }, []);

  const activeFlavors = useMemo(() => {
    if (!settings || settings.activeFlavorIds.length === 0) return FLAVORS;
    return FLAVORS.filter((f) => settings.activeFlavorIds.includes(f.id));
  }, [settings]);

  const unitPrice = settings?.unitPriceEurCents ?? 170;
  const freightCents = settings?.freightEurCents ?? 0;
  const minOrderCents = settings?.minOrderEurCents ?? 8500;

  const cartItems: CartItem[] = useMemo(
    () => activeFlavors
      .filter((f) => (quantities[f.id] || 0) > 0)
      .map((f) => ({ flavorId: f.id, flavorName: f.name, quantity: quantities[f.id] || 0 })),
    [quantities, activeFlavors]
  );

  const totalUnits = useMemo(() => cartItems.reduce((s, i) => s + i.quantity, 0), [cartItems]);
  const subtotalCents = totalUnits * unitPrice;
  const grandTotalCents = subtotalCents + freightCents;

  const updateQuantity = useCallback((flavorId: string, value: number) => {
    setQuantities((prev) => ({ ...prev, [flavorId]: Math.max(0, value) }));
  }, []);

  const canProceed = subtotalCents >= minOrderCents;

  const handleProceed = () => {
    if (!canProceed) return;
    setStep('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFormSubmit = (data: FormData) => {
    setFormData(data);
    setStep('confirm');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const changeAmountCents = formData.needsChange && formData.changeAmount
        ? Math.round(parseFloat(formData.changeAmount.replace(',', '.')) * 100)
        : undefined;

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: formData.customerName,
          customerPhone: formData.customerPhone,
          addressStreet: formData.addressStreet,
          addressNumber: formData.addressNumber,
          addressPostalCode: formData.addressPostalCode,
          addressCommune: formData.addressCommune,
          needsChange: formData.needsChange,
          changeAmountEurCents: changeAmountCents,
          notes: formData.notes || undefined,
          items: cartItems.map((i) => ({ flavorName: i.flavorName, quantity: i.quantity })),
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
    <div className="min-h-screen">
      <header className="bg-gradient-to-r from-brand-600 to-ice-500 text-white sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
          <span className="text-3xl">🧊</span>
          <h1 className="text-xl font-bold leading-tight">Geladinho Madamme Simone</h1>
          {step !== 'catalog' && (
            <button
              onClick={() => setStep(step === 'form' ? 'catalog' : 'form')}
              className="ml-auto text-white/90 hover:text-white text-sm underline"
            >
              ← Voltar
            </button>
          )}
        </div>
      </header>

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-2 flex gap-4 text-sm">
          {[
            { key: 'catalog', label: '1. Sabores' },
            { key: 'form', label: '2. Dados' },
            { key: 'confirm', label: '3. Confirmar' },
          ].map((s) => (
            <span
              key={s.key}
              className={`font-semibold ${step === s.key ? 'text-brand-600 border-b-2 border-brand-600 pb-2' : 'text-gray-400'}`}
            >
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
                <h2 className="text-2xl font-bold text-gray-900">🍭 Escolha seus sabores</h2>
                {loadingSettings ? (
                  <p className="text-gray-400 mt-1 text-sm">Carregando...</p>
                ) : (
                  <p className="text-gray-500 mt-1">
                    Pedido mínimo: <span className="font-semibold text-brand-600">{formatEUR(minOrderCents)}</span>
                    {freightCents > 0 && <> · Frete: <span className="font-semibold text-brand-600">{formatEUR(freightCents)}</span></>}
                    {' '}· <span className="font-semibold text-brand-600">{formatEUR(unitPrice)}</span> cada
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {activeFlavors.map((flavor, index) => (
                  <FlavorCard
                    key={flavor.id}
                    flavor={flavor}
                    index={index}
                    quantity={quantities[flavor.id] || 0}
                    onQuantityChange={(val) => updateQuantity(flavor.id, val)}
                    unitPriceCents={unitPrice}
                  />
                ))}
              </div>
            </>
          )}

          {step === 'form' && (
            <OrderForm
              initialData={formData}
              onSubmit={handleFormSubmit}
              cartItems={cartItems}
              totalUnits={totalUnits}
              subtotalCents={subtotalCents}
              freightCents={freightCents}
              grandTotalCents={grandTotalCents}
            />
          )}

          {step === 'confirm' && (
            <ConfirmModal
              formData={formData}
              cartItems={cartItems}
              totalUnits={totalUnits}
              subtotalCents={subtotalCents}
              freightCents={freightCents}
              grandTotalCents={grandTotalCents}
              onConfirm={handleConfirm}
              onBack={() => setStep('form')}
              submitting={submitting}
              error={submitError}
            />
          )}
        </div>

        {step === 'catalog' && (
          <DesktopSidebar
            cartItems={cartItems}
            totalUnits={totalUnits}
            subtotalCents={subtotalCents}
            freightCents={freightCents}
            grandTotalCents={grandTotalCents}
            minOrderCents={minOrderCents}
            onProceed={handleProceed}
          />
        )}
      </div>

      {step === 'catalog' && (
        <StickyCart
          totalUnits={totalUnits}
          subtotalCents={subtotalCents}
          freightCents={freightCents}
          grandTotalCents={grandTotalCents}
          minOrderCents={minOrderCents}
          onProceed={handleProceed}
        />
      )}
    </div>
  );
}
