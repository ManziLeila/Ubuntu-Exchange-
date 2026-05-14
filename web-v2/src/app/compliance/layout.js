'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';

export default function ComplianceLayout({ children }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (!['compliance_officer','admin','super_admin'].includes(user.role)) router.replace('/login');
  }, [user, isLoading, router]);
  if (isLoading || !user || !['compliance_officer','admin','super_admin'].includes(user.role)) return null;
  return <DashboardLayout>{children}</DashboardLayout>;
}
