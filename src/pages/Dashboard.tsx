import { useEffect, useState } from 'react';
import {
  TrendingUp, TrendingDown, Wallet, CreditCard, DollarSign, BarChart2,
  AlertTriangle, CheckCircle,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line,
} from 'recharts';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, getMonthRange } from '../lib/utils';
import { Spinner } from '../components/ui/Spinner';
import { ClientAlert } from '../types';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StatCard {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bg: string;
}

interface MonthData {
  month: string;
  receitas: number;
  despesas: number;
  saldo: number;
}

export default function Dashboard() {
  const { selectedCompany, companies } = useCompany();
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ revenue: 0, expense: 0, receivable: 0, payable: 0 });
  const [chartData, setChartData] = useState<MonthData[]>([]);
  const [alerts, setAlerts] = useState<ClientAlert[]>([]);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  useEffect(() => {
    if (selectedCompany) {
      loadStats(selectedCompany.id);
      loadChartData(selectedCompany.id);
    }
    if (isAdmin && companies.length > 0) loadAlerts();
  }, [selectedCompany, isAdmin, companies]);

  async function loadStats(companyId: string) {
    setLoading(true);
    const { start, end } = getMonthRange(year, month);

    const [rev, exp, ar, ap] = await Promise.all([
      supabase.from('revenues').select('amount').eq('company_id', companyId).gte('date', start).lte('date', end),
      supabase.from('expenses').select('amount').eq('company_id', companyId).gte('date', start).lte('date', end),
      supabase.from('accounts_receivable').select('amount').eq('company_id', companyId).eq('status', 'pending'),
      supabase.from('accounts_payable').select('amount').eq('company_id', companyId).eq('status', 'pending'),
    ]);

    const sum = (rows: { amount: number }[] | null) => (rows ?? []).reduce((a, r) => a + Number(r.amount), 0);
    setStats({ revenue: sum(rev.data), expense: sum(exp.data), receivable: sum(ar.data), payable: sum(ap.data) });
    setLoading(false);
  }

  async function loadChartData(companyId: string) {
    // Busca os 6 meses de uma vez (2 queries totais em vez de 12 sequenciais)
    const oldest = subMonths(now, 5);
    const { start: rangeStart } = getMonthRange(oldest.getFullYear(), oldest.getMonth() + 1);
    const { end: rangeEnd } = getMonthRange(year, month);

    const [revAll, expAll] = await Promise.all([
      supabase.from('revenues').select('date, amount').eq('company_id', companyId)
        .gte('date', rangeStart).lte('date', rangeEnd),
      supabase.from('expenses').select('date, amount').eq('company_id', companyId)
        .gte('date', rangeStart).lte('date', rangeEnd),
    ]);

    // Agrupa por mês
    const monthMap: Record<string, { rev: number; exp: number }> = {};
    for (const r of revAll.data ?? []) {
      const key = r.date.substring(0, 7); // "2024-06"
      if (!monthMap[key]) monthMap[key] = { rev: 0, exp: 0 };
      monthMap[key]!.rev += Number(r.amount);
    }
    for (const e of expAll.data ?? []) {
      const key = e.date.substring(0, 7);
      if (!monthMap[key]) monthMap[key] = { rev: 0, exp: 0 };
      monthMap[key]!.exp += Number(e.amount);
    }

    const months: MonthData[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      const key = format(d, 'yyyy-MM');
      const label = format(d, 'MMM/yy', { locale: ptBR });
      const { rev = 0, exp = 0 } = monthMap[key] ?? {};
      months.push({ month: label, receitas: rev, despesas: exp, saldo: rev - exp });
    }
    setChartData(months);
  }

  async function loadAlerts() {
    const { start: ms, end: me } = getMonthRange(year, month);
    const prevMonth = month - 1 === 0 ? 12 : month - 1;
    const prevYear  = month - 1 === 0 ? year - 1 : year;
    const { start: ps, end: pe } = getMonthRange(prevYear, prevMonth);

    // C-02 N+1 fix: dispara todas as empresas em paralelo em vez de sequencial
    const alertResults = await Promise.all(
      companies.map(company =>
        Promise.all([
          supabase.from('revenues').select('amount').eq('company_id', company.id).gte('date', ms).lte('date', me),
          supabase.from('expenses').select('amount').eq('company_id', company.id).gte('date', ms).lte('date', me),
          supabase.from('revenues').select('amount').eq('company_id', company.id).gte('date', ps).lte('date', pe),
          supabase.from('accounts_receivable').select('id').eq('company_id', company.id).eq('status', 'overdue'),
          supabase.from('accounts_payable').select('id').eq('company_id', company.id).eq('status', 'overdue'),
        ]).then(([curRev, curExp, prevRev, overdueAR, overdueAP]) => ({ company, curRev, curExp, prevRev, overdueAR, overdueAP }))
      )
    );

    const alertList: ClientAlert[] = [];
    for (const { company, curRev, curExp, prevRev, overdueAR, overdueAP } of alertResults) {
      const sum = (r: { amount: number }[] | null) => (r ?? []).reduce((a, x) => a + Number(x.amount), 0);
      const curR = sum(curRev.data); const curE = sum(curExp.data);
      const prevR = sum(prevRev.data);

      const negativeCashFlow = curR - curE < 0;
      const overdueAccounts  = (overdueAR.data?.length ?? 0) > 0 || (overdueAP.data?.length ?? 0) > 0;
      const revenueDrop      = prevR > 0 && curR < prevR * 0.7;
      const expenseSpike     = curR > 0 && curE > curR * 1.3;

      if (negativeCashFlow || overdueAccounts || revenueDrop || expenseSpike) {
        alertList.push({ company, negativeCashFlow, overdueAccounts, revenueDrop, expenseSpike });
      }
    }
    setAlerts(alertList);
  }

  const balance  = stats.revenue - stats.expense;
  // C-03 fix: "Saldo Previsto" substituiu "Lucro do Mês" (que era idêntico ao Saldo).
  // Saldo Previsto = saldo atual + contas pendentes a receber - contas pendentes a pagar.
  const forecast = balance + stats.receivable - stats.payable;

  const cards: StatCard[] = [
    { label: 'Saldo do Mês',     value: balance,          icon: DollarSign,  color: balance >= 0 ? 'text-blue-600' : 'text-red-600',       bg: balance >= 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-red-50 dark:bg-red-900/20' },
    { label: 'Receitas do Mês',  value: stats.revenue,    icon: TrendingUp,  color: 'text-green-600',   bg: 'bg-green-50 dark:bg-green-900/20' },
    { label: 'Despesas do Mês',  value: stats.expense,    icon: TrendingDown, color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-900/20' },
    { label: 'Saldo Previsto',   value: forecast,         icon: BarChart2,   color: forecast >= 0 ? 'text-emerald-600' : 'text-red-600', bg: forecast >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20' },
    { label: 'A Receber',        value: stats.receivable, icon: Wallet,      color: 'text-violet-600',  bg: 'bg-violet-50 dark:bg-violet-900/20' },
    { label: 'A Pagar',          value: stats.payable,    icon: CreditCard,  color: 'text-orange-600',  bg: 'bg-orange-50 dark:bg-orange-900/20' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {selectedCompany?.name} · {format(now, 'MMMM yyyy', { locale: ptBR })}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size={32} /></div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {cards.map(card => (
            <div key={card.label} className="card p-5">
              <div className={`inline-flex p-2 rounded-lg ${card.bg} mb-3`}>
                <card.icon size={20} className={card.color} />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{card.label}</p>
              <p className={`text-xl font-bold mt-1 ${card.color}`}>{formatCurrency(card.value)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Receitas x Despesas (6 meses)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="receitas" name="Receitas" fill="#22c55e" radius={[4,4,0,0]} />
              <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Evolução do Saldo (6 meses)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Line type="monotone" dataKey="saldo" name="Saldo" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {isAdmin && (
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            Painel Consolidado — Alertas de Clientes
          </h3>
          {alerts.length === 0 ? (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 py-4">
              <CheckCircle size={20} />
              <span className="text-sm font-medium">Todos os clientes estão saudáveis este mês.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map(a => <AlertRow key={a.company.id} alert={a} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AlertRow({ alert }: { alert: ClientAlert }) {
  const tags = [
    alert.negativeCashFlow && { label: 'Fluxo negativo',        color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    alert.overdueAccounts  && { label: 'Contas vencidas',        color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
    alert.revenueDrop      && { label: 'Queda de faturamento',   color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    alert.expenseSpike     && { label: 'Despesas excessivas',    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  ].filter(Boolean) as { label: string; color: string }[];

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
        <span className="text-xs font-bold text-gray-500">{alert.company.name.charAt(0).toUpperCase()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{alert.company.name}</p>
        {alert.company.segment && <p className="text-xs text-gray-400">{alert.company.segment}</p>}
      </div>
      <div className="flex flex-wrap gap-1.5 justify-end">
        {tags.map(t => (
          <span key={t.label} className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${t.color}`}>{t.label}</span>
        ))}
      </div>
    </div>
  );
}
