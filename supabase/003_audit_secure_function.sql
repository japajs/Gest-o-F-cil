-- ============================================================
-- MIGRATION 003 — M-02: Auditoria segura via função server-side
-- ============================================================
-- Causa raiz: a policy "system can insert audit logs" tinha
-- with check (true), permitindo qualquer usuário autenticado
-- inserir logs forjados com user_id e user_name arbitrários.
--
-- Solução: função SECURITY DEFINER que:
--   1. Executa como owner do banco (bypass RLS)
--   2. Deriva user_id de auth.uid() (não aceita do cliente)
--   3. Deriva user_name de profiles (não aceita do cliente)
--   4. Engole erros para nunca bloquear a operação principal
-- ============================================================

create or replace function log_audit_event(
  p_action      text,
  p_table_name  text  default null,
  p_record_id   text  default null,
  p_company_id  uuid  default null,
  p_details     jsonb default null
) returns void language plpgsql security definer
set search_path = public as $$
declare
  v_record_id uuid;
  v_user_name text;
begin
  -- Converter record_id de text para uuid (falha silenciosa)
  begin
    v_record_id := p_record_id::uuid;
  exception when others then
    v_record_id := null;
  end;

  -- Derivar nome do usuário do banco (não do cliente)
  select coalesce(full_name, (select email from auth.users where id = auth.uid()))
    into v_user_name
    from profiles
   where id = auth.uid();

  insert into audit_logs (user_id, user_name, company_id, action, table_name, record_id, details)
  values (
    auth.uid(),
    v_user_name,
    p_company_id,
    p_action,
    p_table_name,
    v_record_id,
    p_details
  );
exception when others then
  -- Falha de auditoria NUNCA deve bloquear a operação principal
  null;
end;
$$;

-- Conceder execução a usuários autenticados
grant execute on function log_audit_event(text, text, text, uuid, jsonb) to authenticated;

-- Remover policy aberta de INSERT direto
drop policy if exists "system can insert audit logs" on audit_logs;

-- Nova policy: INSERT proibido diretamente pelo cliente.
-- A função security definer bypassa o RLS e pode inserir.
-- Não há policy de INSERT → clientes não conseguem inserir diretamente.
-- (Supabase: sem policy = acesso negado)

-- Permitir que admins vejam todos os logs (mantém a policy existente)
drop policy if exists "admins can read all audit logs" on audit_logs;
create policy "admins can read all audit logs" on audit_logs
  for select using (get_user_role() = 'admin');
