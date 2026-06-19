import { supabase } from './supabase';
import { AccountReceivable, AccountPayable } from '../types';

type ARShape = Pick<AccountReceivable, 'id' | 'status' | 'client_name' | 'description' | 'amount' | 'paid_date'>;
type APShape = Pick<AccountPayable, 'id' | 'status' | 'supplier_name' | 'description' | 'amount' | 'paid_date'>;

const today = () => new Date().toISOString().split('T')[0]!;

// Sincroniza uma conta a receber com o fluxo de caixa (tabela revenues).
// - Se status === 'paid': garante que existe exatamente um revenue vinculado (ar_id)
// - Se status !== 'paid': remove o revenue vinculado (se existir)
// Idempotente: pode ser chamada múltiplas vezes sem efeito colateral.
export async function syncARPayment(ar: ARShape, companyId: string): Promise<void> {
  if (ar.status === 'paid') {
    const { data: existing } = await supabase
      .from('revenues').select('id, amount').eq('ar_id', ar.id).maybeSingle();

    const desc = ar.description
      ? `${ar.client_name} - ${ar.description}`
      : ar.client_name;

    const entry = {
      company_id:     companyId,
      description:    `Recebimento: ${desc}`,
      amount:         ar.amount,
      date:           ar.paid_date ?? today(),
      payment_method: 'pix' as const,
      ar_id:          ar.id,
    };

    if (existing) {
      // Atualiza se o valor ou data mudou
      await supabase.from('revenues').update(entry).eq('ar_id', ar.id);
    } else {
      await supabase.from('revenues').insert(entry);
    }
  } else {
    // Conta revertida para não-paga: remove receita vinculada
    await supabase.from('revenues').delete().eq('ar_id', ar.id);
  }
}

// Sincroniza uma conta a pagar com o fluxo de caixa (tabela expenses).
export async function syncAPPayment(ap: APShape, companyId: string): Promise<void> {
  if (ap.status === 'paid') {
    const { data: existing } = await supabase
      .from('expenses').select('id, amount').eq('ap_id', ap.id).maybeSingle();

    const desc = ap.description
      ? `${ap.supplier_name} - ${ap.description}`
      : ap.supplier_name;

    const entry = {
      company_id:     companyId,
      description:    `Pagamento: ${desc}`,
      amount:         ap.amount,
      date:           ap.paid_date ?? today(),
      payment_method: 'pix' as const,
      ap_id:          ap.id,
    };

    if (existing) {
      await supabase.from('expenses').update(entry).eq('ap_id', ap.id);
    } else {
      await supabase.from('expenses').insert(entry);
    }
  } else {
    await supabase.from('expenses').delete().eq('ap_id', ap.id);
  }
}
