export const ADMIN_SPA_ROUTES = [
  '/admin',
  '/admin/clientes',
  '/admin/gastos',
  '/admin/estoque',
  '/admin/rotas',
  '/admin/relatorios',
  '/admin/configuracoes',
  '/admin/parametros',
] as const;

export type AdminSpaRoute = (typeof ADMIN_SPA_ROUTES)[number];

export function isAdminSpaRoute(pathname: string): pathname is AdminSpaRoute {
  return (ADMIN_SPA_ROUTES as readonly string[]).includes(pathname);
}
