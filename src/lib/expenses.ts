import { ExpenseItem } from '@/types';

export function formatMoneyInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

export function parseMoneyInput(value: string): number {
  const normalized = value.replace(',', '.').replace(/[^\d.]/g, '');
  const parsed = Number.parseFloat(normalized);
  return Number.isNaN(parsed) ? 0 : Math.round(parsed * 100);
}

export function parseQuantityInput(value: string): number {
  const normalized = value.replace(',', '.').replace(/[^\d.]/g, '');
  const parsed = Number.parseFloat(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function formatQuantityInput(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '';
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(3).replace(/\.?0+$/, '').replace('.', ',');
}

export function createEmptyExpenseItem(): ExpenseItem {
  return {
    name: '',
    quantity: 1,
    unit_price_eur_cents: 0,
    line_total_eur_cents: 0,
  };
}

export function fallbackExpenseItems(
  description?: string | null,
  amountCents?: number | null
): ExpenseItem[] {
  const name = description?.trim() || 'Item';
  const total = Math.max(0, Math.round(amountCents || 0));
  return [
    {
      name,
      quantity: 1,
      unit_price_eur_cents: total,
      line_total_eur_cents: total,
    },
  ];
}

export function coerceExpenseItems(
  rawItems: unknown,
  fallbackDescription?: string | null,
  fallbackAmountCents?: number | null
): ExpenseItem[] {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return fallbackExpenseItems(fallbackDescription, fallbackAmountCents);
  }

  const normalized = rawItems
    .map((item) => {
      if (!item || typeof item !== 'object') return null;

      const source = item as Record<string, unknown>;
      const name = String(source.name || '').trim();
      const quantity = Number(source.quantity);
      const unitPrice = Number(source.unit_price_eur_cents);
      const lineTotal = Number(source.line_total_eur_cents);

      if (!name) return null;

      const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
      const safeLineTotal = Number.isFinite(lineTotal) && lineTotal >= 0
        ? Math.round(lineTotal)
        : Number.isFinite(unitPrice)
          ? Math.round(unitPrice * safeQuantity)
          : 0;
      const safeUnitPrice = Number.isFinite(unitPrice) && unitPrice >= 0
        ? Math.round(unitPrice)
        : safeQuantity > 0
          ? Math.round(safeLineTotal / safeQuantity)
          : 0;

      return {
        name,
        quantity: safeQuantity,
        unit_price_eur_cents: safeUnitPrice,
        line_total_eur_cents: safeLineTotal,
      } satisfies ExpenseItem;
    })
    .filter((item): item is ExpenseItem => item !== null);

  return normalized.length > 0
    ? normalized
    : fallbackExpenseItems(fallbackDescription, fallbackAmountCents);
}

export function normalizeExpenseItems(items: ExpenseItem[]): ExpenseItem[] {
  return items
    .map((item) => {
      const name = item.name.trim();
      if (!name) return null;

      const quantity = Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 1;
      const unitPrice = Number.isFinite(item.unit_price_eur_cents) && item.unit_price_eur_cents >= 0
        ? Math.round(item.unit_price_eur_cents)
        : 0;
      const lineTotal = Number.isFinite(item.line_total_eur_cents) && item.line_total_eur_cents >= 0
        ? Math.round(item.line_total_eur_cents)
        : Math.round(quantity * unitPrice);

      return {
        name,
        quantity,
        unit_price_eur_cents: unitPrice,
        line_total_eur_cents: lineTotal,
      } satisfies ExpenseItem;
    })
    .filter((item): item is ExpenseItem => item !== null);
}

export function buildExpenseDescription(items: ExpenseItem[]): string {
  const normalized = normalizeExpenseItems(items);
  if (normalized.length === 0) return 'Compra sem itens detalhados';
  if (normalized.length === 1) return normalized[0].name;
  return `${normalized[0].name} + ${normalized.length - 1} item(ns)`;
}

export function sumExpenseItems(items: ExpenseItem[]): number {
  return normalizeExpenseItems(items).reduce(
    (sum, item) => sum + item.line_total_eur_cents,
    0
  );
}
