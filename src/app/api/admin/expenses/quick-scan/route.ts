import { NextRequest, NextResponse } from 'next/server';
import { compressImageForOcr, fetchWithTimeout } from '@/lib/image';
import { supabaseAdmin } from '@/lib/supabase';
import {
  normalizeExpenseItems,
  sumExpenseItems,
  buildExpenseDescription,
} from '@/lib/expenses';
import { ExpenseItem } from '@/types';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const RECEIPT_SCHEMA = {
  type: 'object',
  properties: {
    total_amount: { type: ['number', 'null'], description: 'Final total amount in euros.' },
    date: { type: ['string', 'null'], format: 'date', description: 'Receipt date YYYY-MM-DD.' },
    supplier_name: { type: ['string', 'null'], description: 'Store or supplier name.' },
    supplier_address: { type: ['string', 'null'], description: 'Full supplier address.' },
    invoice_number: { type: ['string', 'null'], description: 'Invoice/ticket number.' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Product name.' },
          quantity: { type: ['number', 'null'], description: 'Quantity (default 1).' },
          unit_price: { type: ['number', 'null'], description: 'Unit price in euros.' },
          line_total: { type: ['number', 'null'], description: 'Line total in euros.' },
        },
        required: ['name', 'quantity', 'unit_price', 'line_total'],
      },
    },
    raw_text: { type: ['string', 'null'], description: 'OCR text from receipt.' },
  },
  required: ['total_amount', 'date', 'supplier_name', 'supplier_address', 'invoice_number', 'items', 'raw_text'],
  additionalProperties: false,
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY não configurada' }, { status: 500 });
  }

  const formData = await request.formData();
  const file = formData.get('receipt') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'Nenhuma imagem enviada' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const { base64, mimeType } = await compressImageForOcr(bytes);

  // Step 1: OCR via Gemini
  const geminiResponse = await fetchWithTimeout(GEMINI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inline_data: { mime_type: mimeType, data: base64 } },
          { text: 'Extract structured data from this purchase receipt or invoice. Return JSON following the provided schema. Use euros. When line totals are missing, infer them only if clearly supported. Do not include subtotal/VAT/discount rows in items. Return null for unreadable fields.' },
        ],
      }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema: RECEIPT_SCHEMA,
      },
    }),
  });

  if (!geminiResponse.ok) {
    const rawError = await geminiResponse.text();
    console.error('Gemini error:', geminiResponse.status, rawError);

    if (geminiResponse.status === 429) {
      return NextResponse.json({ error: 'Limite de uso da IA atingido. Tente novamente em alguns instantes.' }, { status: 429 });
    }

    return NextResponse.json({ error: 'Erro ao processar imagem com IA' }, { status: 502 });
  }

  const geminiData = await geminiResponse.json();
  const candidate = geminiData?.candidates?.[0];
  const finishReason = candidate?.finishReason;

  if (!candidate || finishReason === 'SAFETY' || finishReason === 'OTHER') {
    console.error('Gemini blocked or empty response:', finishReason, geminiData);
    return NextResponse.json({ error: 'A IA não conseguiu processar esta imagem. Tente outra foto com melhor iluminação.' }, { status: 422 });
  }

  const responseText = candidate?.content?.parts?.[0]?.text || '';

  let ocrResult: Record<string, unknown>;
  try {
    const cleaned = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    ocrResult = JSON.parse(cleaned);
  } catch {
    console.error('Failed to parse Gemini response:', responseText);
    return NextResponse.json({ error: 'Não foi possível interpretar a nota. Tente uma foto mais nítida.' }, { status: 422 });
  }

  // Step 2: Prepare expense data from OCR
  const rawItems = Array.isArray(ocrResult.items) ? ocrResult.items : [];
  const expenseItems: ExpenseItem[] = rawItems.map((item: Record<string, unknown>) => ({
    name: String(item.name || ''),
    quantity: typeof item.quantity === 'number' ? item.quantity : 1,
    unit_price_eur_cents: typeof item.unit_price === 'number' ? Math.round(item.unit_price * 100) : 0,
    line_total_eur_cents: typeof item.line_total === 'number' ? Math.round(item.line_total * 100) : 0,
  }));

  const items = normalizeExpenseItems(expenseItems);
  const computedTotal = sumExpenseItems(items);
  const ocrTotal = typeof ocrResult.total_amount === 'number' ? Math.round((ocrResult.total_amount as number) * 100) : 0;
  const amountCents = ocrTotal > 0 ? ocrTotal : (computedTotal > 0 ? computedTotal : 0);
  const description = buildExpenseDescription(items) || String(ocrResult.supplier_name || 'Gasto rápido');

  // Step 3: Find a default category (first active one)
  const { data: categories } = await supabaseAdmin
    .from('expense_categories')
    .select('id')
    .eq('active', true)
    .order('created_at', { ascending: true })
    .limit(1);

  const categoryId = categories?.[0]?.id || null;

  // Step 4: Try to match supplier by name
  let supplierId: string | null = null;
  if (ocrResult.supplier_name) {
    const { data: suppliers } = await supabaseAdmin
      .from('suppliers')
      .select('id, name')
      .eq('active', true);

    if (suppliers) {
      const ocrName = String(ocrResult.supplier_name).toLowerCase();
      const match = suppliers.find((s) => ocrName.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(ocrName));
      if (match) supplierId = match.id;
    }
  }

  // Step 5: Save expense (no required fields - save whatever we have)
  const insertData: Record<string, unknown> = {
    date: (ocrResult.date as string) || new Date().toISOString().split('T')[0],
    description,
    amount_eur_cents: amountCents || 0,
    items: items.length > 0 ? items : [],
    ocr_raw_data: ocrResult,
    invoice_number: (ocrResult.invoice_number as string) || null,
    location_address: (ocrResult.supplier_address as string) || null,
    notes: 'Registro rápido via foto - conferir dados',
  };

  if (categoryId) insertData.category_id = categoryId;
  if (supplierId) insertData.supplier_id = supplierId;

  const { data: expense, error } = await supabaseAdmin
    .from('expenses')
    .insert(insertData)
    .select('*, category:expense_categories(*), supplier:suppliers(*)')
    .single();

  if (error) {
    console.error('Error saving quick expense:', error);
    return NextResponse.json({ error: 'Erro ao salvar gasto' }, { status: 500 });
  }

  return NextResponse.json({
    expense,
    ocr: {
      supplier_name: ocrResult.supplier_name,
      total_amount_cents: ocrTotal,
      items_count: items.length,
    },
  }, { status: 201 });
}
