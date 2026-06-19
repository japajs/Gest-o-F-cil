-- ============================================================
-- MIGRATION 004 — M-03: Constraints de valores monetários
-- ============================================================
-- Causa raiz: campos amount sem validação no banco permitiam
-- valores negativos, zero e absurdamente altos.
--
-- Usamos NOT VALID para não bloquear caso existam dados ruins.
-- Após validação manual dos dados existentes, executar VALIDATE.
-- ============================================================

-- revenues: amount > 0 e <= 9.999.999.999,99
alter table revenues
  add constraint if not exists chk_revenues_amount_positive
    check (amount > 0) not valid;

alter table revenues
  add constraint if not exists chk_revenues_amount_max
    check (amount <= 9999999999.99) not valid;

-- expenses
alter table expenses
  add constraint if not exists chk_expenses_amount_positive
    check (amount > 0) not valid;

alter table expenses
  add constraint if not exists chk_expenses_amount_max
    check (amount <= 9999999999.99) not valid;

-- accounts_receivable
alter table accounts_receivable
  add constraint if not exists chk_ar_amount_positive
    check (amount > 0) not valid;

alter table accounts_receivable
  add constraint if not exists chk_ar_amount_max
    check (amount <= 9999999999.99) not valid;

-- accounts_payable
alter table accounts_payable
  add constraint if not exists chk_ap_amount_positive
    check (amount > 0) not valid;

alter table accounts_payable
  add constraint if not exists chk_ap_amount_max
    check (amount <= 9999999999.99) not valid;

-- ============================================================
-- Para ativar as constraints em dados existentes, execute:
-- alter table revenues       validate constraint chk_revenues_amount_positive;
-- alter table revenues       validate constraint chk_revenues_amount_max;
-- alter table expenses       validate constraint chk_expenses_amount_positive;
-- alter table expenses       validate constraint chk_expenses_amount_max;
-- alter table accounts_receivable validate constraint chk_ar_amount_positive;
-- alter table accounts_receivable validate constraint chk_ar_amount_max;
-- alter table accounts_payable    validate constraint chk_ap_amount_positive;
-- alter table accounts_payable    validate constraint chk_ap_amount_max;
-- ============================================================
