import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { supabase } from '../lib/supabase';
import { Company } from '../types';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { logAudit } from '../lib/audit';
import { useCompany } from '../contexts/CompanyContext';

type FormData = Omit<Company, 'id' | 'created_at' | 'updated_at' | 'active'>;

export default function Companies() {
  const { refresh } = useCompany();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [segments, setSegments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>();

  useEffect(() => { load(); loadSegments(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('companies').select('*').order('name');
    setCompanies(data ?? []);
    setLoading(false);
  }

  async function loadSegments() {
    const { data } = await supabase.from('segments').select('name').order('name');
    setSegments((data ?? []).map(s => s.name));
  }

  function openNew() {
    setEditing(null);
    reset({ name: '', owner_name: '', document: '', phone: '', email: '', segment: '' });
    setModalOpen(true);
  }

  function openEdit(c: Company) {
    setEditing(c);
    reset({ name: c.name, owner_name: c.owner_name, document: c.document ?? '', phone: c.phone ?? '', email: c.email ?? '', segment: c.segment ?? '' });
    setModalOpen(true);
  }

  async function onSubmit(data: FormData) {
    setSaving(true);
    if (editing) {
      await supabase.from('companies').update(data).eq('id', editing.id);
      await logAudit({ action: `Editou empresa: ${data.name}`, tableName: 'companies', recordId: editing.id });
    } else {
      const { data: created } = await supabase.from('companies').insert({ ...data, active: true }).select().single();
      await logAudit({ action: `Criou empresa: ${data.name}`, tableName: 'companies', recordId: created?.id });
    }
    setSaving(false);
    setModalOpen(false);
    load();
    refresh();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.from('companies').update({ active: false }).eq('id', deleteTarget.id);
    await logAudit({ action: `Desativou empresa: ${deleteTarget.name}`, tableName: 'companies', recordId: deleteTarget.id });
    setDeleting(false);
    setDeleteTarget(null);
    load();
    refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Empresas</h1>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nova Empresa
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size={32} /></div>
        ) : companies.length === 0 ? (
          <EmptyState title="Nenhuma empresa cadastrada" description="Clique em Nova Empresa para começar." icon={<Building2 size={40} />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Empresa</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Responsável</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Segmento</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Contato</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Status</th>
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {companies.map(c => (
                  <tr key={c.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{c.name}</div>
                      {c.document && <div className="text-xs text-gray-400">{c.document}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{c.owner_name}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{c.segment ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="text-gray-600 dark:text-gray-400">{c.email ?? '—'}</div>
                      <div className="text-xs text-gray-400">{c.phone ?? ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${c.active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500'}`}>
                        {c.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Empresa' : 'Nova Empresa'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Nome da Empresa *</label>
              <input {...register('name', { required: true })} className="input" placeholder="Nome da empresa" />
              {errors.name && <p className="text-xs text-red-500 mt-1">Campo obrigatório</p>}
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="label">Responsável *</label>
              <input {...register('owner_name', { required: true })} className="input" placeholder="Nome do responsável" />
              {errors.owner_name && <p className="text-xs text-red-500 mt-1">Campo obrigatório</p>}
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="label">CPF / CNPJ</label>
              <input {...register('document')} className="input" placeholder="000.000.000-00" />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input {...register('phone')} className="input" placeholder="(00) 00000-0000" />
            </div>
            <div>
              <label className="label">E-mail</label>
              <input {...register('email')} type="email" className="input" placeholder="email@empresa.com" />
            </div>
            <div className="col-span-2">
              <label className="label">Segmento</label>
              <select {...register('segment')} className="input">
                <option value="">Selecione...</option>
                {segments.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Salvando...' : editing ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Desativar empresa"
        message={`Deseja desativar a empresa "${deleteTarget?.name}"? Os dados serão mantidos.`}
      />
    </div>
  );
}
