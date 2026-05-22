export const ADMIN_SPA_ROUTES = [
  '/gestion',
  '/gestion/clientes',
  '/gestion/gastos',
  '/gestion/estoque',
  '/gestion/rotas',
  '/gestion/relatorios',
  '/gestion/configuracoes',
  '/gestion/parametros',
] as const;

export type AdminSpaRoute = (typeof ADMIN_SPA_ROUTES)[number];

export function isAdminSpaRoute(pathname: string): pathname is AdminSpaRoute {
  return (ADMIN_SPA_ROUTES as readonly string[]).includes(pathname);
}
