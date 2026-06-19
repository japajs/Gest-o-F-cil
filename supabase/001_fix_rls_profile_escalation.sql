-- ============================================================
-- MIGRATION 001 — C-01: Bloquear escalada de privilégios
-- ============================================================
-- Causa raiz: a policy UPDATE em profiles não tinha WITH CHECK,
-- permitindo que qualquer usuário alterasse role e company_id
-- do próprio perfil via API direta.
-- ============================================================

-- Trigger que impede alteração de role/company_id pelo próprio usuário.
-- Admins atualizando outros usuários (via /users) NÃO são bloqueados,
-- pois auth.uid() != old.id nesse caso.
create or replace function guard_profile_update()
returns trigger language plpgsql security definer as $$
begin
  -- Bloqueia somente quando o usuário altera o PRÓPRIO perfil
  if auth.uid() = old.id then
    if new.role <> old.role then
      raise exception 'Alteração de papel (role) não é permitida pelo próprio usuário';
    end if;
    if new.company_id is distinct from old.company_id then
      raise exception 'Alteração de empresa vinculada não é permitida pelo próprio usuário';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_profile_update on profiles;
create trigger trg_guard_profile_update
  before update on profiles
  for each row execute function guard_profile_update();

-- Recriar policy com WITH CHECK explícito
drop policy if exists "users can update own profile" on profiles;
create policy "users can update own profile" on profiles
  for update
  using  (id = auth.uid())
  with check (id = auth.uid());

-- Garantir que não exista policy de INSERT do próprio perfil
-- (o perfil é criado apenas pelo trigger handle_new_user, nunca pelo cliente)
drop policy if exists "users can insert own profile" on profiles;
