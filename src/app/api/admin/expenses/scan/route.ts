import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/auth';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const RECEIPT_SCHEMA = {
  type: 'object',
  properties: {
    total_amount: {
      type: ['number', 'null'],
      description: 'Final total amount of the receipt in euros.',
    },
    date: {
      type: ['string', 'null'],
      format: 'date',
      description: 'Receipt date in YYYY-MM-DD format.',
    },
    supplier_name: {
      type: ['string', 'null'],
      description: 'Store or supplier name.',
    },
    supplier_address: {
      type: ['string', 'null'],
      description: 'Full supplier or store address when visible on the receipt.',
    },
    invoice_number: {
      type: ['string', 'null'],
      description: 'Invoice, ticket or receipt number when visible.',
    },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Product or service name.',
          },
          quantity: {
            type: ['number', 'null'],
            description: 'Quantity purchased. Use 1 when a quantity is not explicit.',
          },
          unit_price: {
            type: ['number', 'null'],
            description: 'Unit price in euros when visible.',
          },
          line_total: {
            type: ['number', 'null'],
            description: 'Final line total in euros for that item when visible.',
          },
        },
        required: ['name', 'quantity', 'unit_price', 'line_total'],
      },
    },
    raw_text: {
      type: ['string', 'null'],
      description: 'Concatenated OCR text from the receipt.',
    },
  },
  required: [
    'total_amount',
    'date',
    'supplier_name',
    'supplier_address',
    'invoice_number',
    'items',
    'raw_text',
  ],
  additionalProperties: false,
};

function extractGeminiErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const source = payload as {
    error?: {
      message?: string;
      status?: string;
    };
  };
  return source.error?.message || null;
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) return unauthorizedResponse();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY não configurada no ambiente do servidor' },
      { status: 500 }
    );
  }

  const formData = await request.formData();
  const file = formData.get('receipt') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'Nenhuma imagem enviada' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString('base64');
  const mimeType = file.type || 'image/jpeg';

  const geminiResponse = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: mimeType,
                data: base64,
              },
            },
            {
              text: [
                'Extract structured data from this purchase receipt or invoice.',
                'Return the final result strictly as JSON following the provided schema.',
                'Use euros for all monetary values.',
                'When line totals are missing, infer them only if the receipt clearly supports it.',
                'Do not include subtotal, VAT, discount or payment summary rows inside items.',
                'If a field cannot be read confidently, return null.',
              ].join(' '),
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseJsonSchema: RECEIPT_SCHEMA,
      },
    }),
  });

  if (!geminiResponse.ok) {
    const rawError = await geminiResponse.text();
    let parsedError: unknown = null;

    try {
      parsedError = JSON.parse(rawError);
    } catch {
      parsedError = rawError;
    }

    const upstreamMessage = extractGeminiErrorMessage(parsedError) || rawError;
    console.error('Gemini API error:', geminiResponse.status, upstreamMessage);

    if (geminiResponse.status === 429) {
      return NextResponse.json(
        {
          error:
            'A chave do Gemini atingiu limite de uso ou cota. Verifique billing/quota no projeto do Google AI e tente novamente em alguns instantes.',
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        error: 'Erro ao processar imagem com Gemini',
        details: upstreamMessage,
      },
      { status: 502 }
    );
  }

  const geminiData = await geminiResponse.json();
  const responseText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  let ocrResult;
  try {
    const cleaned = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    ocrResult = JSON.parse(cleaned);
  } catch {
    console.error('Failed to parse Gemini response:', responseText);
    return NextResponse.json(
      {
        error: 'Não foi possível interpretar a nota fiscal',
        raw_text: responseText,
      },
      { status: 422 }
    );
  }

  const totalCents =
    typeof ocrResult.total_amount === 'number'
      ? Math.round(ocrResult.total_amount * 100)
      : null;

  return NextResponse.json({
    total_amount_cents: totalCents,
    date: ocrResult.date || null,
    supplier_name: ocrResult.supplier_name || null,
    supplier_address: ocrResult.supplier_address || null,
    invoice_number: ocrResult.invoice_number || null,
    items: Array.isArray(ocrResult.items) ? ocrResult.items : [],
    raw_text: ocrResult.raw_text || null,
    ocr_raw_data: ocrResult,
  });
}
