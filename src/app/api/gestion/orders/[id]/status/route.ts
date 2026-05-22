import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { UpdateStatusSchema } from '@/lib/schemas';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthenticated(request)) return unauthorizedResponse();

  const body = await request.json();
  const parsed = UpdateStatusSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('orders')
    .update({ status: parsed.data.status })
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: 'Erro ao atualizar status' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
