'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import {
  Expense,
  ExpenseCategory,
  ExpenseItem,
  OcrResult,
  Supplier,
} from '@/types';
import {
  coerceExpenseItems,
  createEmptyExpenseItem,
  formatMoneyInput,
  formatQuantityInput,
  normalizeExpenseItems,
  parseMoneyInput,
  parseQuantityInput,
  sumExpenseItems,
} from '@/lib/expenses';

interface ExpenseItemDraft {
  name: string;
  quantityInput: string;
  unitPriceInput: string;
  lineTotalInput: string;
}

export interface ExpensePayload {
  date: string;
  category_id: string;
  supplier_id: string | null;
  invoice_number: string | null;
  location_address: string | null;
  amount_eur_cents: number;
  receipt_image_url: string | null;
  ocr_raw_data: OcrResult | null;
  items: ExpenseItem[];
  notes: string | null;
}

interface Props {
  categories: ExpenseCategory[];
  suppliers: Supplier[];
  initialExpense?: Expense | null;
  onSubmit: (payload: ExpensePayload) => Promise<void>;
  submitting: boolean;
  error: string;
  submitLabel: string;
}

function draftFromItem(item: ExpenseItem): ExpenseItemDraft {
  return {
    name: item.name,
    quantityInput: formatQuantityInput(item.quantity),
    unitPriceInput: formatMoneyInput(item.unit_price_eur_cents),
    lineTotalInput: formatMoneyInput(item.line_total_eur_cents),
  };
}

function draftFromOcrItem(item: NonNullable<OcrResult['items']>[number]): ExpenseItemDraft {
  const quantity =
    typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1;
  const lineTotalCents =
    typeof item.line_total === 'number' && item.line_total > 0
      ? Math.round(item.line_total * 100)
      : 0;
  const unitPriceCents =
    typeof item.unit_price === 'number' && item.unit_price > 0
      ? Math.round(item.unit_price * 100)
      : quantity > 0 && lineTotalCents > 0
        ? Math.round(lineTotalCents / quantity)
        : 0;
  const finalLineTotal =
    lineTotalCents > 0 ? lineTotalCents : Math.round(quantity * unitPriceCents);

  return {
    name: item.name || '',
    quantityInput: formatQuantityInput(quantity),
    unitPriceInput: unitPriceCents > 0 ? formatMoneyInput(unitPriceCents) : '',
    lineTotalInput: finalLineTotal > 0 ? formatMoneyInput(finalLineTotal) : '',
  };
}

function createEmptyDraft(): ExpenseItemDraft {
  return draftFromItem(createEmptyExpenseItem());
}

function itemsFromDrafts(drafts: ExpenseItemDraft[]): ExpenseItem[] {
  return normalizeExpenseItems(
    drafts
      .map((draft) => {
        const name = draft.name.trim();
        const quantity = parseQuantityInput(draft.quantityInput);
        const unitPrice = parseMoneyInput(draft.unitPriceInput);
        const lineTotal = parseMoneyInput(draft.lineTotalInput);

        if (!name && quantity <= 0 && unitPrice <= 0 && lineTotal <= 0) {
          return null;
        }

        const safeQuantity = quantity > 0 ? quantity : 1;
        const computedLineTotal =
          lineTotal > 0 ? lineTotal : Math.round(safeQuantity * unitPrice);
        const computedUnitPrice =
          unitPrice > 0
            ? unitPrice
            : safeQuantity > 0 && computedLineTotal > 0
              ? Math.round(computedLineTotal / safeQuantity)
              : 0;

        return {
          name,
          quantity: safeQuantity,
          unit_price_eur_cents: computedUnitPrice,
          line_total_eur_cents: computedLineTotal,
        } satisfies ExpenseItem;
      })
      .filter((item): item is ExpenseItem => item !== null)
  );
}

function buildInitialDrafts(initialExpense?: Expense | null): ExpenseItemDraft[] {
  const items = coerceExpenseItems(
    initialExpense?.items,
    initialExpense?.description,
    initialExpense?.amount_eur_cents
  );
  return items.length > 0 ? items.map(draftFromItem) : [createEmptyDraft()];
}

export default function ExpensePurchaseForm({
  categories,
  suppliers,
  initialExpense,
  onSubmit,
  submitting,
  error,
  submitLabel,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [date, setDate] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptImageUrl] = useState<string | null>(null);
  const [ocrRawData, setOcrRawData] = useState<OcrResult | null>(null);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [scanError, setScanError] = useState('');
  const [scanSuccess, setScanSuccess] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [itemsDrafts, setItemsDrafts] = useState<ExpenseItemDraft[]>([createEmptyDraft()]);
  const [totalDisplay, setTotalDisplay] = useState('');
  const [manualTotalOverride, setManualTotalOverride] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const drafts = buildInitialDrafts(initialExpense);
    const draftItems = itemsFromDrafts(drafts);
    const computedTotal = sumExpenseItems(draftItems);
    const initialTotal = initialExpense?.amount_eur_cents ?? computedTotal;

    setDate(initialExpense?.date || new Date().toISOString().split('T')[0]);
    setCategoryId(initialExpense?.category_id || '');
    setSupplierId(initialExpense?.supplier_id || '');
    setLocationAddress(initialExpense?.location_address || '');
    setInvoiceNumber(initialExpense?.invoice_number || '');
    setNotes(initialExpense?.notes || '');
    setOcrRawData(initialExpense?.ocr_raw_data || null);
    setScanPreview(null);
    setScanError('');
    setScanSuccess(false);
    setItemsDrafts(drafts);
    setTotalDisplay(initialTotal > 0 ? formatMoneyInput(initialTotal) : '');
    setManualTotalOverride(initialTotal > 0 && initialTotal !== computedTotal);
    setFormError('');
  }, [initialExpense]);

  const normalizedItems = useMemo(
    () => itemsFromDrafts(itemsDrafts),
    [itemsDrafts]
  );
  const itemsTotalCents = useMemo(
    () => sumExpenseItems(normalizedItems),
    [normalizedItems]
  );

  useEffect(() => {
    if (!manualTotalOverride) {
      setTotalDisplay(itemsTotalCents > 0 ? formatMoneyInput(itemsTotalCents) : '');
    }
  }, [itemsTotalCents, manualTotalOverride]);

  const updateDraft = (
    index: number,
    updater: (draft: ExpenseItemDraft) => ExpenseItemDraft
  ) => {
    setItemsDrafts((previous) =>
      previous.map((draft, currentIndex) =>
        currentIndex === index ? updater(draft) : draft
      )
    );
  };

  const addLine = () => {
    setItemsDrafts((previous) => [...previous, createEmptyDraft()]);
  };

  const removeLine = (index: number) => {
    setItemsDrafts((previous) => {
      if (previous.length === 1) return [createEmptyDraft()];
      return previous.filter((_, currentIndex) => currentIndex !== index);
    });
  };

  const syncLineFromQuantityOrUnit = (index: number) => {
    updateDraft(index, (draft) => {
      const quantity = parseQuantityInput(draft.quantityInput);
      const unitPrice = parseMoneyInput(draft.unitPriceInput);
      const nextLineTotal =
        quantity > 0 && unitPrice > 0 ? Math.round(quantity * unitPrice) : 0;

      return {
        ...draft,
        quantityInput: quantity > 0 ? formatQuantityInput(quantity) : draft.quantityInput.trim(),
        unitPriceInput: unitPrice > 0 ? formatMoneyInput(unitPrice) : draft.unitPriceInput.trim(),
        lineTotalInput: nextLineTotal > 0 ? formatMoneyInput(nextLineTotal) : draft.lineTotalInput.trim(),
      };
    });
  };

  const syncLineFromTotal = (index: number) => {
    updateDraft(index, (draft) => {
      const quantity = parseQuantityInput(draft.quantityInput);
      const lineTotal = parseMoneyInput(draft.lineTotalInput);
      const safeQuantity = quantity > 0 ? quantity : 1;
      const nextUnitPrice =
        safeQuantity > 0 && lineTotal > 0 ? Math.round(lineTotal / safeQuantity) : 0;

      return {
        ...draft,
        quantityInput: safeQuantity > 0 ? formatQuantityInput(safeQuantity) : '',
        unitPriceInput: nextUnitPrice > 0 ? formatMoneyInput(nextUnitPrice) : draft.unitPriceInput.trim(),
        lineTotalInput: lineTotal > 0 ? formatMoneyInput(lineTotal) : draft.lineTotalInput.trim(),
      };
    });
  };

  const applyOcrData = (ocr: OcrResult) => {
    const drafts =
      Array.isArray(ocr.items) && ocr.items.length > 0
        ? ocr.items.map(draftFromOcrItem)
        : [createEmptyDraft()];
    const scannedItems = itemsFromDrafts(drafts);
    const scannedItemsTotal = sumExpenseItems(scannedItems);
    const scannedTotal =
      typeof ocr.total_amount === 'number' && ocr.total_amount > 0
        ? Math.round(ocr.total_amount * 100)
        : scannedItemsTotal;

    setItemsDrafts(drafts);
    setDate((previous) => ocr.date || previous);
    setLocationAddress((previous) => ocr.supplier_address || previous);
    setInvoiceNumber((previous) => ocr.invoice_number || previous);
    setOcrRawData(ocr);
    setTotalDisplay(scannedTotal > 0 ? formatMoneyInput(scannedTotal) : '');
    setManualTotalOverride(false);

    if (ocr.supplier_name) {
      const normalizedName = ocr.supplier_name.toLowerCase();
      const match = suppliers.find((supplier) =>
        supplier.name.toLowerCase().includes(normalizedName) ||
        normalizedName.includes(supplier.name.toLowerCase())
      );
      if (match) {
        setSupplierId(match.id);
        setLocationAddress((previous) => previous || match.address || '');
      }
    }
  };

  const handleScan = async (file: File) => {
    setScanning(true);
    setScanError('');
    setScanSuccess(false);
    setFormError('');

    const reader = new FileReader();
    reader.onload = (event) => setScanPreview(event.target?.result as string);
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append('receipt', file);

    try {
      const response = await fetch('/api/admin/expenses/scan', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        setScanError(
          data.details ? `${data.error || 'Erro ao processar imagem'}: ${data.details}` : (data.error || 'Erro ao processar imagem')
        );
        setScanning(false);
        return;
      }

      applyOcrData(data.ocr_raw_data || data);
      setScanSuccess(true);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setScanError('Tempo esgotado ao processar imagem. Tente uma foto menor ou com melhor iluminação.');
      } else {
        setScanError('Erro de conexão ao processar imagem');
      }
    }

    setScanning(false);
  };

  const handleSubmit = async () => {
    setFormError('');

    const payloadItems = normalizedItems;
    const amountCents = parseMoneyInput(totalDisplay) || itemsTotalCents;

    if (!categoryId) {
      setFormError('Selecione uma categoria');
      return;
    }
    if (payloadItems.length === 0) {
      setFormError('Adicione pelo menos um item');
      return;
    }
    if (payloadItems.some((item) => !item.name.trim())) {
      setFormError('Preencha o nome de todos os itens');
      return;
    }
    if (payloadItems.some((item) => item.line_total_eur_cents <= 0)) {
      setFormError('Cada item precisa ter um total maior que zero');
      return;
    }
    if (amountCents <= 0) {
      setFormError('Informe o total geral da nota');
      return;
    }

    await onSubmit({
      date,
      category_id: categoryId,
      supplier_id: supplierId || null,
      invoice_number: invoiceNumber.trim() || null,
      location_address: locationAddress.trim() || null,
      amount_eur_cents: amountCents,
      receipt_image_url: receiptImageUrl,
      ocr_raw_data: ocrRawData,
      items: payloadItems,
      notes: notes.trim() || null,
    });
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="mb-2 text-lg font-bold text-gray-900">📸 Escanear Nota Fiscal</h2>
        <p className="mb-4 text-sm text-gray-500">
          Tire uma foto ou selecione uma imagem da nota. Os dados serão pré-preenchidos automaticamente.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleScan(file);
          }}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={scanning}
          className="btn-primary w-full py-3 text-base disabled:opacity-60"
        >
          {scanning ? '⏳ Processando...' : '📷 Tirar Foto / Selecionar'}
        </button>

        {scanning && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">
            <div className="animate-pulse font-semibold text-blue-600">
              Analisando nota fiscal com IA...
            </div>
            <p className="mt-1 text-xs text-blue-500">Isso pode levar alguns segundos</p>
          </div>
        )}

        {scanError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="font-semibold text-red-700">⚠️ {scanError}</p>
          </div>
        )}

        {scanSuccess && (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="font-semibold text-green-700">✅ Nota analisada com sucesso!</p>
            <p className="mt-1 text-xs text-green-600">
              Confira os dados abaixo e ajuste o que for necessário.
            </p>
          </div>
        )}

        {scanPreview && (
          <div className="mt-4">
            <img
              src={scanPreview}
              alt="Preview da nota"
              className="mx-auto max-h-48 rounded-xl border border-gray-200"
            />
          </div>
        )}
      </div>

      <div className="card p-6 space-y-5">
        <h2 className="text-lg font-bold text-gray-900">Dados da Compra</h2>

        <div>
          <label className="label">Data *</label>
          <input
            type="date"
            className="input-field"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>

        <div>
          <label className="label">Categoria *</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {categories
              .filter((category) => category.active || category.id === categoryId)
              .map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setCategoryId(category.id)}
                  className={`flex items-center gap-2 rounded-xl border-2 p-3 text-left text-sm font-semibold transition-all ${
                    categoryId === category.id
                      ? 'border-current shadow-sm'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={
                    categoryId === category.id
                      ? {
                          color: category.color,
                          borderColor: category.color,
                          backgroundColor: `${category.color}10`,
                        }
                      : {}
                  }
                >
                  <span className="text-xl">{category.icon}</span>
                  <span>{category.name}</span>
                </button>
              ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Fornecedor</label>
            <select
              className="input-field"
              value={supplierId}
              onChange={(event) => setSupplierId(event.target.value)}
            >
              <option value="">— Nenhum —</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Número da nota</label>
            <input
              type="text"
              className="input-field"
              placeholder="Ex: 2026-004587"
              value={invoiceNumber}
              onChange={(event) => setInvoiceNumber(event.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label">Local da compra</label>
          <AddressAutocomplete
            className="w-full"
            placeholder="Ex: Rue de la Loi, 16 - 1000 - Bruxelles"
            value={locationAddress}
            onChange={(nextValue) => setLocationAddress(nextValue)}
            onAddressSelected={(address) => setLocationAddress(address.fullAddress)}
          />
        </div>

        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-gray-900">Itens da Compra</h3>
              <p className="text-xs text-gray-500">
                Adicione uma linha para cada produto da nota.
              </p>
            </div>
            <button
              type="button"
              onClick={addLine}
              className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              + Linha
            </button>
          </div>

          <div className="hidden grid-cols-[minmax(0,1.8fr)_110px_130px_130px_44px] gap-3 px-2 pb-2 text-[11px] font-bold uppercase tracking-wide text-gray-500 md:grid">
            <span>Item</span>
            <span>Qtd.</span>
            <span>Preço unit.</span>
            <span>Total item</span>
            <span />
          </div>

          <div className="space-y-3">
            {itemsDrafts.map((draft, index) => (
              <div
                key={`expense-line-${index}`}
                className="grid gap-3 rounded-xl border border-gray-200 bg-white p-3 md:grid-cols-[minmax(0,1.8fr)_110px_130px_130px_44px] md:items-start"
              >
                <div>
                  <label className="label md:hidden">Item</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ex: Leite condensado"
                    value={draft.name}
                    onChange={(event) =>
                      updateDraft(index, (current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="label md:hidden">Qtd.</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="input-field"
                    placeholder="1"
                    value={draft.quantityInput}
                    onChange={(event) =>
                      updateDraft(index, (current) => ({
                        ...current,
                        quantityInput: event.target.value,
                      }))
                    }
                    onBlur={() => syncLineFromQuantityOrUnit(index)}
                  />
                </div>

                <div>
                  <label className="label md:hidden">Preço unit.</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="input-field"
                    placeholder="0,00"
                    value={draft.unitPriceInput}
                    onChange={(event) =>
                      updateDraft(index, (current) => ({
                        ...current,
                        unitPriceInput: event.target.value,
                      }))
                    }
                    onBlur={() => syncLineFromQuantityOrUnit(index)}
                  />
                </div>

                <div>
                  <label className="label md:hidden">Total item</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="input-field"
                    placeholder="0,00"
                    value={draft.lineTotalInput}
                    onChange={(event) =>
                      updateDraft(index, (current) => ({
                        ...current,
                        lineTotalInput: event.target.value,
                      }))
                    }
                    onBlur={() => syncLineFromTotal(index)}
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    className="w-full rounded-lg border border-red-200 px-3 py-3 text-sm font-semibold text-red-500 transition-colors hover:bg-red-50 md:w-11"
                    title="Remover linha"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
          <div>
            <label className="label">Observações</label>
            <textarea
              className="input-field resize-none"
              rows={3}
              placeholder="Detalhes adicionais sobre a compra..."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-orange-900">Total geral da nota</p>
              <button
                type="button"
                onClick={() => {
                  setManualTotalOverride(false);
                  setTotalDisplay(itemsTotalCents > 0 ? formatMoneyInput(itemsTotalCents) : '');
                }}
                className="text-xs font-semibold text-orange-700 underline"
              >
                Usar soma dos itens
              </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-orange-200 bg-white">
              <div className="flex items-stretch">
                <span className="flex items-center border-r border-orange-200 bg-orange-100 px-4 text-lg font-bold text-orange-700">
                  €
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="min-w-0 flex-1 px-4 py-3 text-lg font-bold text-gray-900 focus:outline-none"
                  placeholder="0,00"
                  value={totalDisplay}
                  onChange={(event) => {
                    setManualTotalOverride(true);
                    setTotalDisplay(event.target.value);
                  }}
                  onBlur={() => {
                    const nextValue = parseMoneyInput(totalDisplay);
                    setTotalDisplay(nextValue > 0 ? formatMoneyInput(nextValue) : '');
                  }}
                />
              </div>
            </div>

            <p className="mt-3 text-xs text-orange-700">
              Soma atual das linhas: <span className="font-bold">€ {formatMoneyInput(itemsTotalCents || 0)}</span>
            </p>
          </div>
        </div>

        {(formError || error) && (
          <p className="text-sm font-semibold text-red-500">
            ⚠️ {formError || error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="flex-1 btn-primary py-3 text-base"
          >
            {submitting ? '⏳ Salvando...' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
