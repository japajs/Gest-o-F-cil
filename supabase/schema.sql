-- ============================================================
-- Financeiro Fácil – Schema idempotente (pode re-executar)
-- ============================================================

-- ---------- EXTENSÕES ----------
create extension if not exists "uuid-ossp";

-- ---------- TIPOS ENUM (sem erro se já existir) ----------
do $$ begin
  create type user_role as enum ('admin', 'client');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type payment_status as enum ('pending', 'paid', 'overdue');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type payment_method as enum ('cash', 'pix', 'credit_card', 'debit_card', 'bank_transfer', 'check', 'other');
exception when duplicate_object then null;
end $$;

-- ---------- TABELA: companies ----------
create table if not exists companies (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  owner_name  text not null,
  document    text,
  phone       text,
  email       text,
  segment     text,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- TABELA: profiles ----------
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        user_role not null default 'client',
  company_id  uuid references companies(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- TABELA: categories ----------
create table if not exists categories (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  type        text not null check (type in ('revenue', 'expense')),
  company_id  uuid references companies(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- ---------- TABELA: revenues ----------
create table if not exists revenues (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid not null references companies(id) on delete cascade,
  description     text not null,
  category_id     uuid references categories(id) on delete set null,
  amount          numeric(15,2) not null,
  date            date not null,
  payment_method  payment_method not null default 'pix',
  notes           text,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------- TABELA: expenses ----------
create table if not exists expenses (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid not null references companies(id) on delete cascade,
  description     text not null,
  category_id     uuid references categories(id) on delete set null,
  amount          numeric(15,2) not null,
  date            date not null,
  payment_method  payment_method not null default 'pix',
  notes           text,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------- TABELA: accounts_receivable ----------
create table if not exists accounts_receivable (
  id           uuid primary key default uuid_generate_v4(),
  company_id   uuid not null references companies(id) on delete cascade,
  client_name  text not null,
  description  text,
  amount       numeric(15,2) not null,
  due_date     date not null,
  paid_date    date,
  status       payment_status not null default 'pending',
  notes        text,
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------- TABELA: accounts_payable ----------
create table if not exists accounts_payable (
  id            uuid primary key default uuid_generate_v4(),
  company_id    uuid not null references companies(id) on delete cascade,
  supplier_name text not null,
  description   text,
  amount        numeric(15,2) not null,
  due_date      date not null,
  paid_date     date,
  status        payment_status not null default 'pending',
  notes         text,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------- TABELA: audit_logs ----------
create table if not exists audit_logs (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id),
  user_name   text,
  company_id  uuid references companies(id) on delete set null,
  action      text not null,
  table_name  text,
  record_id   uuid,
  details     jsonb,
  created_at  timestamptz not null default now()
);

-- ---------- FUNÇÃO: updated_at ----------
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- TRIGGERS: updated_at (recriar se necessário) ----------
drop trigger if exists trg_companies_updated_at    on companies;
drop trigger if exists trg_profiles_updated_at     on profiles;
drop trigger if exists trg_revenues_updated_at     on revenues;
drop trigger if exists trg_expenses_updated_at     on expenses;
drop trigger if exists trg_ar_updated_at           on accounts_receivable;
drop trigger if exists trg_ap_updated_at           on accounts_payable;

create trigger trg_companies_updated_at    before update on companies    for each row execute function update_updated_at();
create trigger trg_profiles_updated_at     before update on profiles     for each row execute function update_updated_at();
create trigger trg_revenues_updated_at     before update on revenues     for each row execute function update_updated_at();
create trigger trg_expenses_updated_at     before update on expenses     for each row execute function update_updated_at();
create trigger trg_ar_updated_at           before update on accounts_receivable for each row execute function update_updated_at();
create trigger trg_ap_updated_at           before update on accounts_payable     for each row execute function update_updated_at();

-- ---------- FUNÇÃO + TRIGGER: auto-create profile ----------
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'client')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- FUNÇÕES HELPER ----------
create or replace function get_user_role()
returns user_role language sql security definer stable as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function get_user_company_id()
returns uuid language sql security definer stable as $$
  select company_id from profiles where id = auth.uid();
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table companies           enable row level security;
alter table profiles            enable row level security;
alter table categories          enable row level security;
alter table revenues            enable row level security;
alter table expenses            enable row level security;
alter table accounts_receivable enable row level security;
alter table accounts_payable    enable row level security;
alter table audit_logs          enable row level security;

-- ---- profiles ----
drop policy if exists "users can read own profile"    on profiles;
drop policy if exists "admins can read all profiles"  on profiles;
drop policy if exists "users can update own profile"  on profiles;
create policy "users can read own profile"   on profiles for select using (id = auth.uid());
create policy "admins can read all profiles" on profiles for select using (get_user_role() = 'admin');
create policy "users can update own profile" on profiles for update using (id = auth.uid());

-- ---- companies ----
drop policy if exists "admins can do all on companies" on companies;
drop policy if exists "clients can read own company"   on companies;
create policy "admins can do all on companies" on companies for all    using (get_user_role() = 'admin');
create policy "clients can read own company"   on companies for select using (id = get_user_company_id());

-- ---- categories ----
drop policy if exists "admins can do all on categories"          on categories;
drop policy if exists "clients can read own company categories"  on categories;
create policy "admins can do all on categories"         on categories for all    using (get_user_role() = 'admin');
create policy "clients can read own company categories" on categories for select using (company_id = get_user_company_id() or company_id is null);

-- ---- revenues ----
drop policy if exists "admins can do all on revenues"          on revenues;
drop policy if exists "clients can read own company revenues"  on revenues;
create policy "admins can do all on revenues"         on revenues for all    using (get_user_role() = 'admin');
create policy "clients can read own company revenues" on revenues for select using (company_id = get_user_company_id());

-- ---- expenses ----
drop policy if exists "admins can do all on expenses"          on expenses;
drop policy if exists "clients can read own company expenses"  on expenses;
create policy "admins can do all on expenses"         on expenses for all    using (get_user_role() = 'admin');
create policy "clients can read own company expenses" on expenses for select using (company_id = get_user_company_id());

-- ---- accounts_receivable ----
drop policy if exists "admins can do all on ar"          on accounts_receivable;
drop policy if exists "clients can read own company ar"  on accounts_receivable;
create policy "admins can do all on ar"         on accounts_receivable for all    using (get_user_role() = 'admin');
create policy "clients can read own company ar" on accounts_receivable for select using (company_id = get_user_company_id());

-- ---- accounts_payable ----
drop policy if exists "admins can do all on ap"          on accounts_payable;
drop policy if exists "clients can read own company ap"  on accounts_payable;
create policy "admins can do all on ap"         on accounts_payable for all    using (get_user_role() = 'admin');
create policy "clients can read own company ap" on accounts_payable for select using (company_id = get_user_company_id());

-- ---- audit_logs ----
drop policy if exists "admins can read all audit logs" on audit_logs;
drop policy if exists "system can insert audit logs"   on audit_logs;
create policy "admins can read all audit logs" on audit_logs for select using (get_user_role() = 'admin');
create policy "system can insert audit logs"   on audit_logs for insert with check (true);

-- ============================================================
-- SEED: categorias padrão (só insere se não existirem)
-- ============================================================
insert into categories (name, type, company_id)
select name, type, null
from (values
  ('Serviços',   'revenue'),
  ('Produtos',   'revenue'),
  ('Outros',     'revenue'),
  ('Aluguel',    'expense'),
  ('Salários',   'expense'),
  ('Materiais',  'expense'),
  ('Marketing',  'expense'),
  ('Impostos',   'expense'),
  ('Utilities',  'expense'),
  ('Outros',     'expense')
) as t(name, type)
where not exists (
  select 1 from categories c
  where c.name = t.name and c.type = t.type and c.company_id is null
);
