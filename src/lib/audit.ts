import { supabase } from './supabase';

interface AuditParams {
  action: string;
  tableName?: string;
  recordId?: string;
  companyId?: string;
  details?: Record<string, unknown>;
}

// Usa função SECURITY DEFINER no banco para garantir que:
// - user_id é sempre o auth.uid() real (não pode ser forjado)
// - user_name é derivado de profiles no servidor (não do cliente)
// - falhas de auditoria nunca bloqueiam a operação principal
export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await supabase.rpc('log_audit_event', {
      p_action:     params.action,
      p_table_name: params.tableName  ?? null,
      p_record_id:  params.recordId   ?? null,
      p_company_id: params.companyId  ?? null,
      p_details:    params.details    ?? null,
    });
  } catch {
    // Falha silenciosa intencional: auditoria não deve interromper o fluxo principal
  }
}
