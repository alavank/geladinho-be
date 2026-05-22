import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/auth';
import { getSettings, saveSettings } from '@/lib/settings-server';
import { z } from 'zod';

const FlavorConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  active: z.boolean(),
  priceEurCents: z.number().int().min(0),
});

const SettingsSchema = z.object({
  flavorConfigs: z.array(FlavorConfigSchema),
  freightEurCents: z.number().int().min(0),
  minOrderEurCents: z.number().int().min(0),
  b2bFlavorConfigs: z.array(FlavorConfigSchema),
  b2bFreightEurCents: z.number().int().min(0),
  b2bMinTotalUnits: z.number().int().positive(),
  b2bMinPerFlavor: z.number().int().positive(),
});

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) return unauthorizedResponse();
  const settings = await getSettings();
  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  if (!isAdminAuthenticated(request)) return unauthorizedResponse();
  const body = await request.json();
  const parsed = SettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 });
  }
  await saveSettings(parsed.data);
  return NextResponse.json({ ok: true });
}
