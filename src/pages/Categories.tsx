import { useEffect, useState } from 'react';
import { Plus, Trash2, Tag } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { supabase } from '../lib/supabase';
import { Category, CategoryType } from '../types';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { useCompany } from '../contexts/CompanyContext';

interface FormData { name: string; type: CategoryType; }

export default function Categories() {
  const { selectedCompany } = useCompany();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [tab, setTab] = useState<CategoryType>('revenue');
  const { register, handleSubmit, reset } = useForm<FormData>();

  useEffect(() => { load(); }, [selectedCompany]);

  async function load() {
    setLoading(true);
    let query = supabase.from('categories').select('*').order('name');
    if (selectedCompany) query = query.or(`company_id.is.null,company_id.eq.${selectedCompany.id}`);
    else query = query.is('company_id', null);
    const { data } = await query;
    setCategories(data ?? []);
    setLoading(false);
  }

  async function onSubmit(data: FormData) {
    await supabase.from('categories').insert({ name: data.name, type: data.type, company_id: selectedCompany?.id ?? null });
    setModalOpen(false);
    reset();
    load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await supabase.from('categories').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    load();
  }

  const filtered = categories.filter(c => c.type === tab);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Categorias</h1>
        <button onClick={() => { reset({ type: tab }); setModalOpen(true); }} className="btn-primary flex items-center gap-2"><Plus size={16} /> Nova Categoria</button>
      </div>

      <div className="flex gap-2">
        {(['revenue', 'expense'] as CategoryType[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'}`}>
            {t === 'revenue' ? 'Receitas' : 'Despesas'}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-10"><Spinner size={28} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState title="Nenhuma categoria" icon={<Tag size={36} />} />
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.map(c => (
              <div key={c.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                <div className="flex items-center gap-3">
                  <Tag size={16} className={c.type === 'revenue' ? 'text-green-500' : 'text-red-500'} />
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{c.name}</span>
                  {!c.company_id && <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 px-1.5 py-0.5 rounded">Global</span>}
                </div>
                {c.company_id && (
                  <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova Categoria" size="sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Nome *</label>
            <input {...register('name', { required: true })} className="input" placeholder="Ex: Serviços" autoFocus />
          </div>
          <div>
            <label className="label">Tipo</label>
            <select {...register('type')} className="input">
              <option value="revenue">Receita</option>
              <option value="expense">Despesa</option>
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Criar</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete}
        title="Excluir categoria" message={`Excluir "${deleteTarget?.name}"?`} />
    </div>
  );
}
