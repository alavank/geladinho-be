'use client';

import type { ComponentType, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { ADMIN_SPA_ROUTES, AdminSpaRoute, isAdminSpaRoute } from '@/lib/admin-spa';
import { AdminShellProvider } from '@/components/admin/AdminShellContext';

function ModuleLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center text-gray-400">
      Carregando...
    </div>
  );
}

type PreloadableComponent = ComponentType & {
  preload?: () => Promise<unknown>;
};

const routeImports: Record<AdminSpaRoute, () => Promise<{ default: ComponentType }>> = {
  '/admin': () => import('@/app/admin/page'),
  '/admin/clientes': () => import('@/app/admin/clientes/page'),
  '/admin/gastos': () => import('@/app/admin/gastos/page'),
  '/admin/estoque': () => import('@/app/admin/estoque/page'),
  '/admin/rotas': () => import('@/app/admin/rotas/page'),
  '/admin/relatorios': () => import('@/app/admin/relatorios/page'),
  '/admin/configuracoes': () => import('@/app/admin/configuracoes/page'),
  '/admin/parametros': () => import('@/app/admin/parametros/page'),
};

const routeModules: Record<AdminSpaRoute, ComponentType> = {
  '/admin': dynamic(routeImports['/admin'], { loading: ModuleLoading }),
  '/admin/clientes': dynamic(routeImports['/admin/clientes'], { loading: ModuleLoading }),
  '/admin/gastos': dynamic(routeImports['/admin/gastos'], { loading: ModuleLoading }),
  '/admin/estoque': dynamic(routeImports['/admin/estoque'], { loading: ModuleLoading }),
  '/admin/rotas': dynamic(routeImports['/admin/rotas'], { loading: ModuleLoading }),
  '/admin/relatorios': dynamic(routeImports['/admin/relatorios'], { loading: ModuleLoading }),
  '/admin/configuracoes': dynamic(routeImports['/admin/configuracoes'], { loading: ModuleLoading }),
  '/admin/parametros': dynamic(routeImports['/admin/parametros'], { loading: ModuleLoading }),
};

type OverlayRouteDefinition = {
  baseRoute: AdminSpaRoute;
  component: PreloadableComponent;
  panelClassName?: string;
  pattern: RegExp;
};

const overlayRouteDefinitions: OverlayRouteDefinition[] = [
  {
    baseRoute: '/admin',
    component: dynamic(() => import('@/app/admin/pedidos/[id]/page'), { loading: ModuleLoading }),
    panelClassName: 'max-w-6xl',
    pattern: /^\/admin\/pedidos\/[^/]+$/,
  },
  {
    baseRoute: '/admin/gastos',
    component: dynamic(() => import('@/app/admin/gastos/novo/page'), { loading: ModuleLoading }),
    panelClassName: 'max-w-6xl',
    pattern: /^\/admin\/gastos\/novo$/,
  },
  {
    baseRoute: '/admin/gastos',
    component: dynamic(() => import('@/app/admin/gastos/categorias/page'), { loading: ModuleLoading }),
    panelClassName: 'max-w-3xl',
    pattern: /^\/admin\/gastos\/categorias$/,
  },
  {
    baseRoute: '/admin/gastos',
    component: dynamic(() => import('@/app/admin/gastos/fornecedores/page'), { loading: ModuleLoading }),
    panelClassName: 'max-w-3xl',
    pattern: /^\/admin\/gastos\/fornecedores$/,
  },
  {
    baseRoute: '/admin/gastos',
    component: dynamic(() => import('@/app/admin/gastos/[id]/editar/page'), { loading: ModuleLoading }),
    panelClassName: 'max-w-6xl',
    pattern: /^\/admin\/gastos\/[^/]+\/editar$/,
  },
  {
    baseRoute: '/admin/gastos',
    component: dynamic(() => import('@/app/admin/gastos/[id]/page'), { loading: ModuleLoading }),
    panelClassName: 'max-w-4xl',
    pattern: /^\/admin\/gastos\/[^/]+$/,
  },
  {
    baseRoute: '/admin/configuracoes',
    component: dynamic(() => import('@/app/admin/configuracoes/b2b/page'), { loading: ModuleLoading }),
    panelClassName: 'max-w-4xl',
    pattern: /^\/admin\/configuracoes\/b2b$/,
  },
];

export default function AdminSpaShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const currentPath = pathname || '';
  const overlayRoute = useMemo(
    () => overlayRouteDefinitions.find((route) => route.pattern.test(currentPath)) || null,
    [currentPath]
  );
  const isSpaRoute = isAdminSpaRoute(currentPath);
  const activeBaseRoute = isSpaRoute ? currentPath : overlayRoute?.baseRoute ?? null;
  const shouldUseShell = activeBaseRoute !== null;
  const canPreloadModules = currentPath !== '/admin/login';
  const OverlayComponent = overlayRoute?.component;
  const overlayPanelClassName = overlayRoute?.panelClassName || 'max-w-6xl';

  const [visitedRoutes, setVisitedRoutes] = useState<AdminSpaRoute[]>(() =>
    activeBaseRoute ? [activeBaseRoute] : []
  );

  const previousPathRef = useRef(currentPath);
  const scrollPositionsRef = useRef<Partial<Record<AdminSpaRoute, number>>>({});

  useEffect(() => {
    if (!activeBaseRoute) return;

    setVisitedRoutes((prev) => (
      prev.includes(activeBaseRoute) ? prev : [...prev, activeBaseRoute]
    ));
  }, [activeBaseRoute]);

  useEffect(() => {
    const previousPath = previousPathRef.current;

    if (isAdminSpaRoute(previousPath)) {
      scrollPositionsRef.current[previousPath] = window.scrollY;
    }

    if (isSpaRoute) {
      const savedScroll = scrollPositionsRef.current[currentPath] ?? 0;
      requestAnimationFrame(() => {
        window.scrollTo({ top: savedScroll, behavior: 'auto' });
      });
    }

    previousPathRef.current = currentPath;
  }, [currentPath, isSpaRoute]);

  useEffect(() => {
    if (!overlayRoute) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [overlayRoute]);

  const closeOverlay = useCallback(() => {
    if (!overlayRoute) return;
    router.push(overlayRoute.baseRoute, { scroll: false });
  }, [overlayRoute, router]);

  useEffect(() => {
    if (!overlayRoute) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeOverlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeOverlay, overlayRoute]);

  useEffect(() => {
    if (!canPreloadModules) return;

    const timer = window.setTimeout(() => {
      ADMIN_SPA_ROUTES.forEach((route) => {
        if (route !== currentPath) {
          void routeImports[route]();
        }
      });

      overlayRouteDefinitions.forEach((route) => {
        void route.component.preload?.();
      });
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [canPreloadModules, currentPath]);

  return (
    <AdminShellProvider value={{ activeRoute: activeBaseRoute, shellEnabled: shouldUseShell }}>
      <div className={shouldUseShell ? 'block' : 'hidden'}>
        {visitedRoutes.map((route) => {
          const Module = routeModules[route];
          const active = route === activeBaseRoute;

          return (
            <section key={route} aria-hidden={!active} className={active ? 'block' : 'hidden'}>
              <Module />
            </section>
          );
        })}
      </div>
      {overlayRoute && OverlayComponent && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px]"
          onClick={closeOverlay}
        >
          <div
            role="dialog"
            aria-modal="true"
            className={`absolute inset-y-0 right-0 w-full overflow-y-auto bg-gray-50 shadow-2xl ${overlayPanelClassName}`}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeOverlay}
              className="fixed right-4 top-4 z-[60] rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 shadow-sm hover:bg-gray-50 hover:text-gray-900"
            >
              Fechar
            </button>
            <OverlayComponent />
          </div>
        </div>
      )}
      {!shouldUseShell && children}
    </AdminShellProvider>
  );
}
