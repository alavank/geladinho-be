'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export interface Breadcrumb {
  label: string;
  href?: string;
}

interface Props {
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
}

const NAV_LINKS = [
  { href: '/admin', label: 'Pedidos', accent: 'border-brand-200 text-brand-700 hover:bg-brand-50' },
  { href: '/admin/clientes', label: 'Clientes', accent: 'border-brand-200 text-brand-700 hover:bg-brand-50' },
  { href: '/admin/gastos', label: 'Gastos', accent: 'border-orange-200 text-orange-700 hover:bg-orange-50' },
  { href: '/admin/estoque', label: 'Estoque', accent: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' },
  { href: '/admin/rotas', label: 'Rotas', accent: 'border-cyan-200 text-cyan-700 hover:bg-cyan-50' },
  { href: '/admin/relatorios', label: 'Relatorios', accent: 'border-purple-200 text-purple-700 hover:bg-purple-50' },
  { href: '/admin/configuracoes', label: 'Config', accent: 'border-gray-200 text-gray-600 hover:bg-gray-50' },
  { href: '/admin/parametros', label: 'Parametros', accent: 'border-amber-200 text-amber-700 hover:bg-amber-50' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin';
  return pathname.startsWith(href);
}

export default function AdminHeader({ breadcrumbs, actions }: Props) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white shadow-sm">
      {/* Top bar: logo + nav links */}
      <div className="flex items-center justify-between px-4 py-2 md:px-6">
        <Link href="/admin" scroll={false} className="shrink-0">
          <Image src="/logo.png" alt="Madame Simone" width={120} height={44} className="h-8 w-auto object-contain" />
        </Link>

        <nav className="flex flex-wrap items-center gap-1.5">
          {NAV_LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                scroll={false}
                className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                  active
                    ? `${link.accent} bg-opacity-100 border-current`
                    : `border-gray-100 text-gray-500 hover:border-gray-200 hover:text-gray-700`
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Breadcrumb bar + actions */}
      {(breadcrumbs || actions) && (
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2 md:px-6">
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <nav className="flex items-center gap-1.5 text-sm">
              {breadcrumbs.map((crumb, i) => {
                const isLast = i === breadcrumbs.length - 1;
                return (
                  <span key={i} className="flex items-center gap-1.5">
                    {i > 0 && <span className="text-gray-300">/</span>}
                    {crumb.href && !isLast ? (
                      <Link href={crumb.href} scroll={false} className="font-medium text-gray-500 hover:text-gray-700">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="font-bold text-gray-900">{crumb.label}</span>
                    )}
                  </span>
                );
              })}
            </nav>
          ) : (
            <div />
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
    </header>
  );
}
