'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Send, Clock, CheckCircle, XCircle, ArrowUpRight, Globe, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useSocket } from '../../../contexts/SocketContext';
import Spinner from '../../../components/ui/Spinner';

const STATUS_COLORS = {
  COMPLETED:   { bg: 'rgba(22,163,74,.12)',  color: '#16a34a' },
  FAILED:      { bg: 'rgba(220,38,38,.12)',  color: '#dc2626' },
  CANCELLED:   { bg: 'rgba(100,116,139,.12)',color: '#94a3b8' },
  FLAGGED:     { bg: 'rgba(217,119,6,.12)',  color: '#d97706' },
  PENDING:     { bg: 'rgba(59,130,246,.12)', color: '#60a5fa' },
  OTP_PENDING: { bg: 'rgba(59,130,246,.12)', color: '#60a5fa' },
  PROCESSING:  { bg: 'rgba(59,130,246,.12)', color: '#60a5fa' },
};

function fmtAmt(amount, currency) {
  return `${Number(amount).toLocaleString()} ${currency ?? ''}`;
}

function StatusBadge({ status }) {
  const cfg = STATUS_COLORS[status] ?? STATUS_COLORS.PENDING;
  return (
    <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: cfg.bg, color: cfg.color, textTransform: 'uppercase', letterSpacing: '.05em' }}>
      {status?.replace('_', ' ')}
    </span>
  );
}

export default function ClientDashboardPage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [wallet, setWallet]       = useState(null);
  const [transfers, setTransfers] = useState([]);
  const [kycStatus, setKycStatus] = useState(null);
  const [loading, setLoading]     = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [walletRes, txRes, kycRes] = await Promise.all([
        api.get('/api/v1/clients/wallet').catch(() => ({ data: null })),
        api.get('/api/v1/transfers?limit=5').catch(() => ({ data: { transfers: [] } })),
        api.get('/api/v1/kyc/status').catch(() => ({ data: { data: null } })),
      ]);
      setWallet(walletRes.data?.data ?? walletRes.data);
      setTransfers(txRes.data?.data?.transfers ?? txRes.data?.transfers ?? []);
      setKycStatus(kycRes.data?.data ?? kycRes.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!socket) return;
    socket.on('transfer:update', loadData);
    return () => socket.off('transfer:update', loadData);
  }, [socket, loadData]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
      <Spinner size="lg" />
    </div>
  );

  const completed = transfers.filter(t => t.status === 'COMPLETED').length;
  const pending   = transfers.filter(t => ['PENDING','OTP_PENDING','PROCESSING'].includes(t.status)).length;
  const kycApproved = kycStatus?.application?.status === 'APPROVED' || kycStatus?.status === 'APPROVED';

  const stats = [
    { label: 'Wallet Balance', value: wallet ? fmtAmt(wallet.balance, wallet.currency) : '— RWF', icon: Globe, color: '#c9a870' },
    { label: 'Completed',      value: completed, icon: CheckCircle, color: '#16a34a' },
    { label: 'Pending',        value: pending,   icon: Clock,       color: '#60a5fa' },
    { label: 'KYC Status',     value: kycStatus?.application?.status ?? kycStatus?.status ?? 'Not Started', icon: ShieldCheck, color: kycApproved ? '#16a34a' : '#d97706' },
  ];

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f0e2c4', margin: 0 }}>
            Welcome back, {user?.name?.split(' ')[0] ?? 'there'}!
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(245,240,232,.45)', marginTop: 4 }}>Here's your account overview</p>
        </div>
        <Link href="/client/send" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '11px 22px', borderRadius: 10,
          background: 'linear-gradient(135deg,#c9a870,#d4af7a)',
          color: '#07111f', fontWeight: 700, fontSize: 14, textDecoration: 'none',
        }}>
          <Send size={15} /> Send Money
        </Link>
      </div>

      {/* KYC banner */}
      {!kycApproved && (
        <div style={{ borderRadius: 12, padding: '14px 18px', background: 'rgba(217,119,6,.08)', border: '1px solid rgba(217,119,6,.2)', marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <ShieldCheck size={18} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', margin: '0 0 2px' }}>Complete your KYC verification</p>
            <p style={{ fontSize: 12, color: 'rgba(245,240,232,.45)', margin: 0 }}>Verify your identity to unlock higher transfer limits and full platform access.</p>
          </div>
          <Link href="/client/kyc" style={{ fontSize: 12, fontWeight: 600, color: '#c9a870', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Verify now →
          </Link>
        </div>
      )}

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{ padding: '20px 22px', borderRadius: 14, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} color={color} />
              </div>
              <span style={{ fontSize: 12, color: 'rgba(245,240,232,.45)', fontWeight: 500 }}>{label}</span>
            </div>
            <p style={{ fontSize: 22, fontWeight: 800, color: '#f0e2c4', margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Recent transfers */}
      <div style={{ borderRadius: 16, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#f0e2c4', margin: 0 }}>Recent Transfers</h2>
          <Link href="/client/transfers" style={{ fontSize: 13, color: '#c9a870', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            View all <ArrowUpRight size={14} />
          </Link>
        </div>

        {transfers.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <Send size={32} color="rgba(201,168,112,.25)" style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 13, color: 'rgba(245,240,232,.35)', margin: 0 }}>
              No transfers yet.{' '}
              <Link href="/client/send" style={{ color: '#c9a870', textDecoration: 'none' }}>Send your first transfer</Link>
            </p>
          </div>
        ) : (
          transfers.map((tx, i) => (
            <Link key={tx.id} href={`/client/transfers/${tx.urc}`} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 24px', textDecoration: 'none',
              borderBottom: i < transfers.length - 1 ? '1px solid rgba(255,255,255,.05)' : 'none',
              transition: 'background .1s',
            }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,.03)'}
              onMouseOut={e => e.currentTarget.style.background = 'none'}
            >
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(201,168,112,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {tx.status === 'COMPLETED' ? <CheckCircle size={18} color="#16a34a" /> :
                 tx.status === 'FAILED'    ? <XCircle    size={18} color="#dc2626" /> :
                                             <Clock      size={18} color="#60a5fa" />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#f0e2c4', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tx.recipientName ?? tx.recipientMsisdn}
                </p>
                <p style={{ fontSize: 11, color: 'rgba(245,240,232,.35)', margin: 0 }}>
                  {tx.fromCurrency}→{tx.toCurrency} · {format(new Date(tx.createdAt), 'dd MMM yyyy')}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#f0e2c4', margin: '0 0 4px' }}>{fmtAmt(tx.sendAmount, tx.fromCurrency)}</p>
                <StatusBadge status={tx.status} />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
