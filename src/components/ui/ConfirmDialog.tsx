import { Modal } from './Modal';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  loading?: boolean;
}

export function ConfirmDialog({ open, onClose, onConfirm, title = 'Confirmar', message, loading }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button onClick={onClose} className="btn-secondary">Cancelar</button>
        <button onClick={onConfirm} disabled={loading} className="btn-danger">
          {loading ? 'Aguarde...' : 'Confirmar'}
        </button>
      </div>
    </Modal>
  );
}
