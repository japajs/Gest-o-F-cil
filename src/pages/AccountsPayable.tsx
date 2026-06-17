import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, CreditCard, CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { supabase } from '../lib/supabase';
import { AccountPayable, PaymentStatus } from '../types';
import { formatCurrency, formatDate, statusBadgeClass, statusLabel } from '../lib/utils';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { logAudit } from '../lib/audit';
import { useCompany } from '../contexts/CompanyContext';
import { useAuth } from '../contexts/AuthContext';

interface FormData {
  supplier_name: string;
  description: string;
  amount: string;
  due_date: string;
  status: PaymentStatus;
  paid_date: string;
  notes: string;
}

export default function AccountsPayable() {
  const { selectedCompany } = useCompany();
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<AccountPayable[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AccountPayable | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AccountPayable | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<PaymentStatus | 'all'>('all');

  const { register, handleSubmit, reset, watch } = useForm<FormData>();
  const statusVal = watch('status');

  useEffect(() => { if (selectedCompany) load(); }, [selectedCompany]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('accounts_payable').select('*')
      .eq('company_id', selectedCompany!.id).order('due_date');
    setItems(data ?? []);
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    reset({ supplier_name: '', description: '', amount: '', due_date: '', status: 'pending', paid_date: '', notes: '' });
    setModalOpen(true);
  }

  function openEdit(r: AccountPayable) {
    setEditing(r);
    reset({ supplier_name: r.supplier_name, description: r.description ?? '', amount: String(r.amount), due_date: r.due_date, status: r.status, paid_date: r.paid_date ?? '', notes: r.notes ?? '' });
    setModalOpen(true);
  }

  async function markPaid(r: AccountPayable) {
    await supabase.from('accounts_payable').update({ status: 'paid', paid_date: new Date().toISOString().split('T')[0] }).eq('id', r.id);
    await logAudit({ action: `Pagou: ${r.supplier_name} - ${formatCurrency(r.amount)}`, tableName: 'accounts_payable', recordId: r.id, companyId: selectedCompany!.id });
    load();
  }

  async function onSubmit(data: FormData) {
    setSaving(true);
    const payload = {
      company_id: selectedCompany!.id,
      supplier_name: data.supplier_name,
      description: data.description || null,
      amount: parseFloat(data.amount.replace(',', '.')),
      due_date: data.due_date,
      status: data.status,
      paid_date: data.paid_date || null,
      notes: data.notes || null,
    };
    if (editing) {
      await supabase.from('accounts_payable').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('accounts_payable').insert(payload);
    }
    await logAudit({ action: `${editing ? 'Editou' : 'Criou'} conta a pagar: ${data.supplier_name}`, tableName: 'accounts_payable', companyId: selectedCompany!.id });
    setSaving(false);
    setModalOpen(false);
    load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await supabase.from('accounts_payable').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    load();
  }

  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter);
  const totalPending = items.filter(i => i.status === 'pending').reduce((a, r) => a + Number(r.amount), 0);
  const totalOverdue = items.filter(i => i.status === 'overdue').reduce((a, r) => a + Number(r.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contas a Pagar</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Pendente: <span className="font-semibold text-orange-600">{formatCurrency(totalPending)}</span>
            {totalOverdue > 0 && <> · Vencido: <span className="font-semibold text-red-600">{formatCurrency(totalOverdue)}</span></>}
          </p>
        </div>
        {isAdmin && <button onClick={openNew} className="btn-primary flex items-center gap-2"><Plus size={16} /> Nova Conta</button>}
      </div>

      <div className="flex gap-2">
        {(['all', 'pending', 'overdue', 'paid'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === s ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50'}`}>
            {s === 'all' ? 'Todos' : statusLabel(s)}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size={32} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState title="Nenhum registro" icon={<CreditCard size={40} />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Fornecedor</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Descrição</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Vencimento</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Valor</th>
                  <th className="px-4 py-3 w-28" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{r.supplier_name}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{r.description ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{formatDate(r.due_date)}</td>
                    <td className="px-4 py-3"><span className={statusBadgeClass(r.status)}>{statusLabel(r.status)}</span></td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(r.amount)}</td>
                    <td className="px-4 py-3">
                      {isAdmin && (
                        <div className="flex items-center gap-1 justify-end">
                          {r.status !== 'paid' && (
                            <button onClick={() => markPaid(r)} title="Marcar como pago" className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-gray-400 hover:text-green-600 transition-colors"><CheckCircle size={14} /></button>
                          )}
                          <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors"><Pencil size={14} /></button>
                          <button onClick={() => setDeleteTarget(r)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Conta' : 'Nova Conta a Pagar'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Fornecedor *</label>
              <input {...register('supplier_name', { required: true })} className="input" placeholder="Nome do fornecedor" />
            </div>
            <div className="col-span-2">
              <label className="label">Descrição</label>
              <input {...register('description')} className="input" placeholder="Ex: Conta de energia" />
            </div>
            <div>
              <label className="label">Valor (R$) *</label>
              <input {...register('amount', { required: true })} className="input" placeholder="0,00" />
            </div>
            <div>
              <label className="label">Vencimento *</label>
              <input {...register('due_date', { required: true })} type="date" className="input" />
            </div>
            <div>
              <label className="label">Status</label>
              <select {...register('status')} className="input">
                <option value="pending">Pendente</option>
                <option value="paid">Pago</option>
                <option value="overdue">Vencido</option>
              </select>
            </div>
            {statusVal === 'paid' && (
              <div>
                <label className="label">Data de pagamento</label>
                <input {...register('paid_date')} type="date" className="input" />
              </div>
            )}
          </div>
          <div>
            <label className="label">Observações</label>
            <textarea {...register('notes')} className="input h-16 resize-none" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Salvando...' : editing ? 'Salvar' : 'Criar'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete}
        title="Excluir registro" message={`Excluir conta de "${deleteTarget?.supplier_name}"?`} />
    </div>
  );
}
