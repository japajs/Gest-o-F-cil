import { useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuditLog } from '../types';
import { formatDateTime } from '../lib/utils';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';

export default function Audit() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('audit_logs')
      .select('*, companies(name)')
      .order('created_at', { ascending: false })
      .limit(500);
    setLogs(data ?? []);
    setLoading(false);
  }

  const filtered = logs.filter(l =>
    !search || l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.user_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Auditoria</h1>
      </div>

      <input
        type="text"
        placeholder="Buscar por ação ou usuário..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="input max-w-md"
      />

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size={32} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState title="Nenhum registro de auditoria" icon={<ClipboardList size={40} />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Data/Hora</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Usuário</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Empresa</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Ação</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => (
                  <tr key={l.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDateTime(l.created_at)}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">{l.user_name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{l.companies?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{l.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
