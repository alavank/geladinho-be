import { NextRequest, NextResponse } from 'next/server';

// Hosts por persona (matcheia por prefixo pra ser robusto a mudança de IP)
function isPedirHost(host: string) {
  return host.startsWith('pedir-geladinho-');
}
function isMagasinHost(host: string) {
  return host.startsWith('geladinho-magasin-');
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host') || '';

  // Rewrite por host na raiz: cada persona vê sua página própria em "/"
  if (pathname === '/') {
    if (isPedirHost(host)) {
      return NextResponse.rewrite(new URL('/pedir', request.url));
    }
    if (isMagasinHost(host)) {
      return NextResponse.rewrite(new URL('/revenda', request.url));
    }
    // Outros hosts (landing, host legado geladinho-app-*) caem pra page.tsx (landing)
  }

  // Auth de admin (independente do host)
  if (pathname.startsWith('/gestion') && !pathname.startsWith('/gestion/login')) {
    const sessionCookie = request.cookies.get('admin_session');
    if (!sessionCookie || sessionCookie.value !== 'authenticated') {
      return NextResponse.redirect(new URL('/gestion/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/gestion/:path*'],
};
