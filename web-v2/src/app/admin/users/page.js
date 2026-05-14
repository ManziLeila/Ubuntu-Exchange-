'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { api } from '../../../lib/api';
import Badge from '../../../components/ui/Badge';
import Pagination from '../../../components/ui/Pagination';
import Spinner from '../../../components/ui/Spinner';

const ROLES = ['All','client','agent','admin','compliance_officer','super_admin'];
const ROLE_BADGE = { client:'info', agent:'default', admin:'warning', compliance_officer:'pending', super_admin:'danger' };

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage]   = useState(1);
  const [role, setRole]   = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (role !== 'All') params.set('role', role);
      if (search) params.set('search', search);
      const r = await api.get(`/api/v1/super/users?${params}`);
      const d = r.data.data ?? r.data;
      setUsers(Array.isArray(d) ? d : d.users ?? []);
      setTotal(d.total ?? 0);
    } catch { setUsers([]); } finally { setLoading(false); }
  }, [page, role, search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Users</h1>
      <div className="flex flex-col sm:flex-row gap-3">
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Name, email or phone…"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        <select value={role} onChange={e => { setRole(e.target.value); setPage(1); }}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white">
          {ROLES.map(r => <option key={r}>{r}</option>)}
        </select>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? <div className="flex justify-center py-16"><Spinner size="lg" /></div> : users.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Name','Email','Phone','Role','Country','Status','Joined',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3 text-gray-500">{u.msisdn ?? '—'}</td>
                    <td className="px-4 py-3"><Badge variant={ROLE_BADGE[u.role] ?? 'default'} size="sm">{u.role}</Badge></td>
                    <td className="px-4 py-3 text-gray-500">{u.country}</td>
                    <td className="px-4 py-3"><Badge variant={u.status === 'active' ? 'success' : 'danger'} size="sm">{u.status ?? 'active'}</Badge></td>
                    <td className="px-4 py-3 text-gray-400">{format(new Date(u.createdAt), 'dd MMM yy')}</td>
                    <td className="px-4 py-3"><Link href={`/admin/users/${u.id}`} className="text-brand-600 hover:text-brand-700 text-xs font-medium">View →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {total > 15 && <div className="flex justify-center"><Pagination page={page} totalPages={Math.ceil(total/15)} onPageChange={setPage} /></div>}
    </div>
  );
}
