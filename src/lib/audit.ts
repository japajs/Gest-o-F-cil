import { supabase } from './supabase';

interface AuditParams {
  action: string;
  tableName?: string;
  recordId?: string;
  companyId?: string;
  details?: Record<string, unknown>;
}

export async function logAudit(params: AuditParams) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user?.id ?? '')
    .single();

  await supabase.from('audit_logs').insert({
    user_id: user?.id ?? null,
    user_name: profile?.full_name ?? user?.email ?? null,
    company_id: params.companyId ?? null,
    action: params.action,
    table_name: params.tableName ?? null,
    record_id: params.recordId ?? null,
    details: params.details ?? null,
  });
}
