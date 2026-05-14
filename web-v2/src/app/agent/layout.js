'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';

export default function AgentLayout({ children }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'agent') router.replace('/login');
  }, [user, isLoading, router]);
  if (isLoading || !user || user.role !== 'agent') return null;
  return <DashboardLayout>{children}</DashboardLayout>;
}
