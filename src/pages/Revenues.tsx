import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, TrendingUp } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { supabase } from '../lib/supabase';
import { Revenue, Category } from '../types';
import { formatCurrency, formatDate, paymentMethodLabel } from '../lib/utils';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { logAudit } from '../lib/audit';
import { useCompany } from '../contexts/CompanyContext';

const PAYMENT_METHODS = ['cash','pix','credit_card','debit_card','bank_transfer','check','other'] as const;

interface FormData {
  description: string;
  category_id: string;
  amount: string;
  date: string;
  payment_method: string;
  notes: string;
}

export default function Revenues() {
  const { selectedCompany } = useCompany();
  const [items, setItems] = useState<Revenue[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Revenue | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Revenue | null>(null);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset } = useForm<FormData>();

  useEffect(() => { if (selectedCompany) { load(); loadCategories(); } }, [selectedCompany]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('revenues').select('*, categories(name)')
      .eq('company_id', selectedCompany!.id).order('date', { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  }

  async function loadCategories() {
    const { data } = await supabase.from('categories').select('*')
      .eq('type', 'revenue')
      .or(`company_id.is.null,company_id.eq.${selectedCompany!.id}`)
      .order('name');
    setCategories(data ?? []);
  }

  function openNew() {
    setEditing(null);
    reset({ description: '', category_id: '', amount: '', date: new Date().toISOString().split('T')[0], payment_method: 'pix', notes: '' });
    setModalOpen(true);
  }

  function openEdit(r: Revenue) {
    setEditing(r);
    reset({ description: r.description, category_id: r.category_id ?? '', amount: String(r.amount), date: r.date, payment_method: r.payment_method, notes: r.notes ?? '' });
    setModalOpen(true);
  }

  async function onSubmit(data: FormData) {
    setSaving(true);
    const payload = {
      company_id: selectedCompany!.id,
      description: data.description,
      category_id: data.category_id || null,
      amount: parseFloat(data.amount.replace(',', '.')),
      date: data.date,
      payment_method: data.payment_method,
      notes: data.notes || null,
    };
    if (editing) {
      await supabase.from('revenues').update(payload).eq('id', editing.id);
      await logAudit({ action: `Editou receita: ${data.description}`, tableName: 'revenues', recordId: editing.id, companyId: selectedCompany!.id });
    } else {
      const { data: created } = await supabase.from('revenues').insert(payload).select().single();
      await logAudit({ action: `Lançou receita: ${data.description}`, tableName: 'revenues', recordId: created?.id, companyId: selectedCompany!.id });
    }
    setSaving(false);
    setModalOpen(false);
    load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await supabase.from('revenues').delete().eq('id', deleteTarget.id);
    await logAudit({ action: `Excluiu receita: ${deleteTarget.description}`, tableName: 'revenues', recordId: deleteTarget.id, companyId: selectedCompany!.id });
    setDeleteTarget(null);
    load();
  }

  const total = items.reduce((a, r) => a + Number(r.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Receitas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Total: <span className="font-semibold text-green-600">{formatCurrency(total)}</span></p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2"><Plus size={16} /> Nova Receita</button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size={32} /></div>
        ) : items.length === 0 ? (
          <EmptyState title="Nenhuma receita lançada" icon={<TrendingUp size={40} />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Descrição</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Categoria</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Data</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Pagamento</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Valor</th>
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {items.map(r => (
                  <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{r.description}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{r.categories?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{formatDate(r.date)}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{paymentMethodLabel(r.payment_method)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-600">{formatCurrency(r.amount)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors"><Pencil size={14} /></button>
                        <button onClick={() => setDeleteTarget(r)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Receita' : 'Nova Receita'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Descrição *</label>
            <input {...register('description', { required: true })} className="input" placeholder="Ex: Venda de serviço" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Valor (R$) *</label>
              <input {...register('amount', { required: true })} className="input" placeholder="0,00" />
            </div>
            <div>
              <label className="label">Data *</label>
              <input {...register('date', { required: true })} type="date" className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Categoria</label>
              <select {...register('category_id')} className="input">
                <option value="">Sem categoria</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Forma de pagamento</label>
              <select {...register('payment_method')} className="input">
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{paymentMethodLabel(m)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Observações</label>
            <textarea {...register('notes')} className="input h-20 resize-none" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Salvando...' : editing ? 'Salvar' : 'Lançar'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete}
        title="Excluir receita" message={`Excluir "${deleteTarget?.description}"?`} />
    </div>
  );
}
