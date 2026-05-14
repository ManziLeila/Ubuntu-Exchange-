'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';

export default function AdminLayout({ children }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (!['admin','super_admin'].includes(user.role)) router.replace('/login');
  }, [user, isLoading, router]);
  if (isLoading || !user || !['admin','super_admin'].includes(user.role)) return null;
  return <DashboardLayout>{children}</DashboardLayout>;
}
