import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'admin_session';
const SESSION_VALUE = 'authenticated';

export function isAdminAuthenticated(request?: NextRequest): boolean {
  if (request) {
    const cookie = request.cookies.get(COOKIE_NAME);
    return cookie?.value === SESSION_VALUE;
  }

  try {
    const cookieStore = cookies();
    const cookie = cookieStore.get(COOKIE_NAME);
    return cookie?.value === SESSION_VALUE;
  } catch {
    return false;
  }
}

export function createAdminSession(): NextResponse {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, SESSION_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8 hours
    path: '/',
  });
  return response;
}

export function destroyAdminSession(response: NextResponse): NextResponse {
  response.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' });
  return response;
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
}
