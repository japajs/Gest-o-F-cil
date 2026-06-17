import { PaymentMethod, PaymentStatus } from '../types';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatDate(date: string): string {
  if (!date) return '-';
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date + 'T00:00:00'));
}

export function formatDateTime(date: string): string {
  if (!date) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date));
}

export function paymentMethodLabel(method: PaymentMethod): string {
  const labels: Record<PaymentMethod, string> = {
    cash: 'Dinheiro',
    pix: 'PIX',
    credit_card: 'Cartão de Crédito',
    debit_card: 'Cartão de Débito',
    bank_transfer: 'Transferência',
    check: 'Cheque',
    other: 'Outro',
  };
  return labels[method] ?? method;
}

export function statusLabel(status: PaymentStatus): string {
  const labels: Record<PaymentStatus, string> = {
    pending: 'Pendente',
    paid: 'Pago',
    overdue: 'Vencido',
  };
  return labels[status] ?? status;
}

export function statusBadgeClass(status: PaymentStatus): string {
  const classes: Record<PaymentStatus, string> = {
    pending: 'badge-pending',
    paid: 'badge-paid',
    overdue: 'badge-overdue',
  };
  return classes[status] ?? '';
}

export function getMonthRange(year: number, month: number): { start: string; end: string } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return {
    start: start.toISOString().split('T')[0]!,
    end: end.toISOString().split('T')[0]!,
  };
}

export function segmentOptions(): string[] {
  return [
    'Barbearia', 'Clínica', 'Loja', 'Manicure', 'Pedicure',
    'Prestador de serviço', 'Restaurante', 'Salão', 'Outro',
  ];
}
