import type { Metadata, Viewport } from 'next';
import '../globals.css';
import { PWARegister } from './pwa-register';
import AdminSpaShell from '@/components/gestion/AdminSpaShell';

export const metadata: Metadata = {
  title: 'Admin — Madame Simone',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MS Admin',
  },
};

export const viewport: Viewport = {
  themeColor: '#C41230',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <AdminSpaShell>{children}</AdminSpaShell>
      <PWARegister />
    </div>
  );
}
