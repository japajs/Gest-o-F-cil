-- ============================================================
-- MIGRATION 002 — C-02: Consistência financeira AR/AP → Receitas/Despesas
-- ============================================================
-- Estratégia: adicionar colunas de vínculo (ar_id, ap_id) em
-- revenues e expenses para rastrear entradas/saídas geradas
-- automaticamente quando contas são marcadas como pagas.
--
-- Quando uma conta a receber é marcada como paga:
--   → cria um registro em revenues com ar_id = ar.id
-- Quando uma conta a pagar é marcada como paga:
--   → cria um registro em expenses com ap_id = ap.id
--
-- ON DELETE SET NULL: se o AR/AP for excluído, o revenue/expense
-- permanece mas perde o vínculo (dado financeiro é preservado).
-- ============================================================

alter table revenues
  add column if not exists ar_id uuid references accounts_receivable(id) on delete set null;

alter table expenses
  add column if not exists ap_id uuid references accounts_payable(id) on delete set null;

-- Índices para lookup rápido do vínculo
create index if not exists idx_revenues_ar_id on revenues(ar_id) where ar_id is not null;
create index if not exists idx_expenses_ap_id on expenses(ap_id) where ap_id is not null;

-- Constraint: uma conta a receber pode ter no máximo um revenue vinculado
create unique index if not exists uniq_revenues_ar_id on revenues(ar_id) where ar_id is not null;
create unique index if not exists uniq_expenses_ap_id on expenses(ap_id) where ap_id is not null;
