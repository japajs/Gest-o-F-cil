export type UserRole = 'admin' | 'client';
export type PaymentStatus = 'pending' | 'paid' | 'overdue';
export type PaymentMethod = 'cash' | 'pix' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'check' | 'other';
export type CategoryType = 'revenue' | 'expense';

export interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
  company_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  owner_name: string;
  document: string | null;
  phone: string | null;
  email: string | null;
  segment: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  company_id: string | null;
  created_at: string;
}

export interface Revenue {
  id: string;
  company_id: string;
  description: string;
  category_id: string | null;
  amount: number;
  date: string;
  payment_method: PaymentMethod;
  notes: string | null;
  created_by: string | null;
  ar_id: string | null;
  created_at: string;
  updated_at: string;
  categories?: Category;
  companies?: Company;
}

export interface Expense {
  id: string;
  company_id: string;
  description: string;
  category_id: string | null;
  amount: number;
  date: string;
  payment_method: PaymentMethod;
  notes: string | null;
  created_by: string | null;
  ap_id: string | null;
  created_at: string;
  updated_at: string;
  categories?: Category;
  companies?: Company;
}

export interface AccountReceivable {
  id: string;
  company_id: string;
  client_name: string;
  description: string | null;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: PaymentStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  companies?: Company;
}

export interface AccountPayable {
  id: string;
  company_id: string;
  supplier_name: string;
  description: string | null;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: PaymentStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  companies?: Company;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  user_name: string | null;
  company_id: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  companies?: Company;
}

export interface DashboardStats {
  currentBalance: number;
  monthRevenue: number;
  monthExpense: number;
  monthProfit: number;
  totalReceivable: number;
  totalPayable: number;
}

export interface ClientAlert {
  company: Company;
  negativeCashFlow: boolean;
  overdueAccounts: boolean;
  revenueDrop: boolean;
  expenseSpike: boolean;
}
