'use client';
import { useParams, useRouter } from 'next/navigation';
import AdminKycReviewPage from '../../../(admin)/kyc/[id]/page';

// Compliance officers use the same KYC review UI as admins
export default function ComplianceKycReviewPage() {
  return <AdminKycReviewPage />;
}
