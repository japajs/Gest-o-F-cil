import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, TrendingDown, Link } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { supabase } from '../lib/supabase';
import { Expense, Category } from '../types';
import { formatCurrency, formatDate, paymentMethodLabel } from '../lib/utils';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { CurrencyInput, parseCurrency, amountValidation } from '../components/ui/CurrencyInput';
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

export default function Expenses() {
  const { selectedCompany } = useCompany();
  const [items, setItems] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>();

  useEffect(() => { if (selectedCompany) { load(); loadCategories(); } }, [selectedCompany]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('expenses').select('*, categories(name)')
      .eq('company_id', selectedCompany!.id).order('date', { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  }

  async function loadCategories() {
    const { data } = await supabase.from('categories').select('*')
      .eq('type', 'expense')
      .or(`company_id.is.null,company_id.eq.${selectedCompany!.id}`)
      .order('name');
    setCategories(data ?? []);
  }

  function openNew() {
    setEditing(null);
    reset({ description: '', category_id: '', amount: '', date: new Date().toISOString().split('T')[0], payment_method: 'pix', notes: '' });
    setModalOpen(true);
  }

  function openEdit(e: Expense) {
    setEditing(e);
    reset({ description: e.description, category_id: e.category_id ?? '', amount: String(e.amount), date: e.date, payment_method: e.payment_method, notes: e.notes ?? '' });
    setModalOpen(true);
  }

  async function onSubmit(data: FormData) {
    setSaving(true);
    const payload = {
      company_id:     selectedCompany!.id,
      description:    data.description,
      category_id:    data.category_id || null,
      amount:         parseCurrency(data.amount),
      date:           data.date,
      payment_method: data.payment_method,
      notes:          data.notes || null,
    };
    if (editing) {
      await supabase.from('expenses').update(payload).eq('id', editing.id);
      await logAudit({
        action: `Editou despesa: ${data.description}`,
        tableName: 'expenses',
        recordId: editing.id,
        companyId: selectedCompany!.id,
        details: {
          before: { amount: editing.amount, description: editing.description },
          after:  { amount: payload.amount, description: data.description },
        },
      });
    } else {
      const { data: created } = await supabase.from('expenses').insert(payload).select().single();
      await logAudit({
        action: `Lançou despesa: ${data.description}`,
        tableName: 'expenses',
        recordId: created?.id,
        companyId: selectedCompany!.id,
        details: { amount: payload.amount },
      });
    }
    setSaving(false);
    setModalOpen(false);
    load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await supabase.from('expenses').delete().eq('id', deleteTarget.id);
    await logAudit({
      action: `Excluiu despesa: ${deleteTarget.description} – ${formatCurrency(deleteTarget.amount)}`,
      tableName: 'expenses',
      recordId: deleteTarget.id,
      companyId: selectedCompany!.id,
      details: { amount: deleteTarget.amount },
    });
    setDeleteTarget(null);
    load();
  }

  const total = items.reduce((a, r) => a + Number(r.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Despesas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Total: <span className="font-semibold text-red-600">{formatCurrency(total)}</span></p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2"><Plus size={16} /> Nova Despesa</button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size={32} /></div>
        ) : items.length === 0 ? (
          <EmptyState title="Nenhuma despesa lançada" icon={<TrendingDown size={40} />} />
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
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">{r.description}</span>
                        {r.ap_id && (
                          <span title="Gerado automaticamente a partir de Conta a Pagar" className="inline-flex items-center gap-0.5 text-[10px] bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded">
                            <Link size={9} /> auto
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{r.categories?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{formatDate(r.date)}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{paymentMethodLabel(r.payment_method)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">{formatCurrency(r.amount)}</td>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Despesa' : 'Nova Despesa'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Descrição *</label>
            <input {...register('description', { required: 'Campo obrigatório', maxLength: { value: 500, message: 'Máximo 500 caracteres' } })} className="input" placeholder="Ex: Aluguel" />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Valor (R$) *</label>
              <CurrencyInput {...register('amount', amountValidation)} hasError={!!errors.amount} />
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
            </div>
            <div>
              <label className="label">Data *</label>
              <input {...register('date', { required: 'Campo obrigatório' })} type="date" className="input" />
              {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date.message}</p>}
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
        title="Excluir despesa"
        message={`Excluir "${deleteTarget?.description}" no valor de ${deleteTarget ? formatCurrency(deleteTarget.amount) : ''}?`} />
    </div>
  );
}
