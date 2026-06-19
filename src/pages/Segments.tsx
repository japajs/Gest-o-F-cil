import { useEffect, useState } from 'react';
import { Plus, Trash2, Layers } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { supabase } from '../lib/supabase';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { logAudit } from '../lib/audit';

interface Segment { id: string; name: string; created_at: string; }
interface FormData { name: string; }

export default function Segments() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Segment | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('segments').select('*').order('name');
    setSegments(data ?? []);
    setLoading(false);
  }

  async function onSubmit(data: FormData) {
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('segments').insert({ name: data.name.trim() });
    if (err) {
      setError(err.code === '23505' ? 'Segmento já existe.' : 'Erro ao salvar.');
      setSaving(false);
      return;
    }
    await logAudit({ action: `Criou segmento: ${data.name.trim()}`, tableName: 'segments' });
    setSaving(false);
    setModalOpen(false);
    reset();
    load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.from('segments').delete().eq('id', deleteTarget.id);
    await logAudit({ action: `Excluiu segmento: ${deleteTarget.name}`, tableName: 'segments', recordId: deleteTarget.id });
    setDeleting(false);
    setDeleteTarget(null);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Segmentos</h1>
        <button onClick={() => { reset(); setError(''); setModalOpen(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Novo Segmento
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-10"><Spinner size={28} /></div>
        ) : segments.length === 0 ? (
          <EmptyState title="Nenhum segmento cadastrado" icon={<Layers size={36} />} />
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {segments.map(s => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                <div className="flex items-center gap-3">
                  <Layers size={16} className="text-primary-500" />
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{s.name}</span>
                </div>
                <button
                  onClick={() => setDeleteTarget(s)}
                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo Segmento" size="sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Nome *</label>
            <input
              {...register('name', { required: true })}
              className="input"
              placeholder="Ex: Academia"
              autoFocus
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">Campo obrigatório</p>}
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Salvando...' : 'Criar'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Excluir segmento"
        message={`Excluir o segmento "${deleteTarget?.name}"?`}
      />
    </div>
  );
}
