import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/auth';

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

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

  const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `Analyze this receipt/invoice image and extract the following information in JSON format.
Return ONLY valid JSON, no markdown, no code blocks, no extra text.

{
  "total_amount": <total amount as a number in euros, e.g. 45.90>,
  "date": "<date in YYYY-MM-DD format, or null if not found>",
  "supplier_name": "<name of the store/supplier, or null if not found>",
  "items": [
    {"name": "<item name>", "quantity": <quantity or 1>, "price": <unit price in euros>}
  ],
  "raw_text": "<all readable text from the receipt, as a single string>"
}

Important:
- All prices must be in euros (numbers, not strings)
- If you can't read a value, use null
- Items array can be empty if items are not readable
- Always try to extract the total amount even if individual items are hard to read
- Date format must be YYYY-MM-DD`,
            },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!geminiResponse.ok) {
    const errorText = await geminiResponse.text();
    console.error('Gemini API error:', errorText);
    return NextResponse.json({ error: 'Erro ao processar imagem com Gemini' }, { status: 502 });
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

  const totalCents = ocrResult.total_amount
    ? Math.round(ocrResult.total_amount * 100)
    : null;

  return NextResponse.json({
    total_amount_cents: totalCents,
    date: ocrResult.date || null,
    supplier_name: ocrResult.supplier_name || null,
    items: ocrResult.items || [],
    raw_text: ocrResult.raw_text || null,
    ocr_raw_data: ocrResult,
  });
}
