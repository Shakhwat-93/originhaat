'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem('admin_authenticated') === 'true';
    setAuthenticated(auth);
    setLoading(false);

    if (!auth && pathname !== '/admin') {
      router.push('/admin');
    }
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#ff6b35] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If not authenticated and trying to access subroute, show blank while redirecting
  if (!authenticated && pathname !== '/admin') {
    return null;
  }

  // If authenticated and on login page, redirect to dashboard
  if (authenticated && pathname === '/admin') {
    router.push('/admin/dashboard');
    return null;
  }

  // Don't show Sidebar AdminLayout on the login page itself
  if (pathname === '/admin') {
    return <>{children}</>;
  }

  return <AdminLayout>{children}</AdminLayout>;
}
