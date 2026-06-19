-- ============================================================
-- MIGRATION 005 — M-07: Índices de performance
-- ============================================================
-- Baseado nas queries mais frequentes observadas no código.
-- Todos usam IF NOT EXISTS para ser idempotente.
-- ============================================================

-- revenues: filtragem por empresa + intervalo de data (Dashboard, CashFlow, Reports)
-- Ganho: de full table scan para index range scan. Com 10k registros: ~100x mais rápido.
create index if not exists idx_revenues_company_date
  on revenues(company_id, date desc);

-- expenses: mesmo padrão
create index if not exists idx_expenses_company_date
  on expenses(company_id, date desc);

-- accounts_receivable: filtro por empresa + status (Dashboard "A Receber", filtros da tela)
create index if not exists idx_ar_company_status
  on accounts_receivable(company_id, status);

-- accounts_receivable: filtro por empresa + vencimento (Relatórios)
create index if not exists idx_ar_company_due_date
  on accounts_receivable(company_id, due_date);

-- accounts_payable: mesmos padrões
create index if not exists idx_ap_company_status
  on accounts_payable(company_id, status);

create index if not exists idx_ap_company_due_date
  on accounts_payable(company_id, due_date);

-- audit_logs: ordenação por data desc (tela de Auditoria)
create index if not exists idx_audit_logs_created_at
  on audit_logs(created_at desc);

-- profiles: RLS helper functions buscam por company_id
create index if not exists idx_profiles_company_id
  on profiles(company_id) where company_id is not null;

-- categories: filtro por empresa + tipo (carregamento de categorias nos formulários)
create index if not exists idx_categories_company_type
  on categories(company_id, type);

-- ============================================================
-- Estimativa de impacto por tabela (com 10.000 registros/empresa):
--
-- revenues(company_id, date):
--   ANTES: seq scan ~10ms por empresa por query
--   DEPOIS: index scan ~0.1ms — 100x ganho
--   Armazenamento extra: ~500KB por 1M linhas
--
-- accounts_receivable(company_id, status):
--   Queries no Dashboard contam pending/overdue — index elimina full scan
--   Ganho: ~50x com muitas contas
--
-- audit_logs(created_at desc):
--   Query de auditoria ordena por data — sem index faz sort de todas as linhas
--   Com 500k logs: de ~5s para <50ms
-- ============================================================
