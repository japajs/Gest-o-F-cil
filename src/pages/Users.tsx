import { useEffect, useState } from 'react';
import { Users as UsersIcon, Pencil } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { supabase } from '../lib/supabase';
import { Profile, Company } from '../types';
import { formatDateTime } from '../lib/utils';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';

interface ProfileWithCompany extends Profile { companies?: Company; }

interface FormData { full_name: string; role: 'admin' | 'client'; company_id: string; }

export default function Users() {
  const [profiles, setProfiles] = useState<ProfileWithCompany[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ProfileWithCompany | null>(null);
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, reset } = useForm<FormData>();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [p, c] = await Promise.all([
      supabase.from('profiles').select('*, companies(name)').order('full_name'),
      supabase.from('companies').select('*').eq('active', true).order('name'),
    ]);
    setProfiles(p.data ?? []);
    setCompanies(c.data ?? []);
    setLoading(false);
  }

  function openEdit(p: ProfileWithCompany) {
    setEditing(p);
    reset({ full_name: p.full_name ?? '', role: p.role, company_id: p.company_id ?? '' });
  }

  async function onSubmit(data: FormData) {
    if (!editing) return;
    setSaving(true);
    await supabase.from('profiles').update({ full_name: data.full_name, role: data.role, company_id: data.company_id || null }).eq('id', editing.id);
    setSaving(false);
    setEditing(null);
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Usuários</h1>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size={32} /></div>
        ) : profiles.length === 0 ? (
          <EmptyState title="Nenhum usuário" icon={<UsersIcon size={40} />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Nome</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Perfil</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Empresa</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Criado em</th>
                  <th className="px-4 py-3 w-16" />
                </tr>
              </thead>
              <tbody>
                {profiles.map(p => (
                  <tr key={p.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{p.full_name ?? '(sem nome)'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${p.role === 'admin' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                        {p.role === 'admin' ? 'Admin' : 'Cliente'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{p.companies?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{formatDateTime(p.created_at)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors"><Pencil size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar Usuário" size="sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Nome completo</label>
            <input {...register('full_name')} className="input" />
          </div>
          <div>
            <label className="label">Perfil</label>
            <select {...register('role')} className="input">
              <option value="admin">Administrador</option>
              <option value="client">Cliente</option>
            </select>
          </div>
          <div>
            <label className="label">Empresa vinculada</label>
            <select {...register('company_id')} className="input">
              <option value="">Sem empresa</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setEditing(null)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
