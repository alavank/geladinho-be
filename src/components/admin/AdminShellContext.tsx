'use client';

import { createContext, useContext } from 'react';
import type { AdminSpaRoute } from '@/lib/admin-spa';

type AdminShellContextValue = {
  activeRoute: AdminSpaRoute | null;
  shellEnabled: boolean;
};

const AdminShellContext = createContext<AdminShellContextValue>({
  activeRoute: null,
  shellEnabled: false,
});

export function AdminShellProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: AdminShellContextValue;
}) {
  return (
    <AdminShellContext.Provider value={value}>
      {children}
    </AdminShellContext.Provider>
  );
}

export function useAdminShell() {
  return useContext(AdminShellContext);
}

export function useIsAdminModuleActive(route: AdminSpaRoute) {
  const { activeRoute, shellEnabled } = useAdminShell();
  if (!shellEnabled) return true;
  return activeRoute === route;
}
