import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthenticated(request)) return unauthorizedResponse();

  const { error } = await supabaseAdmin
    .from('production_batches')
    .delete()
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
