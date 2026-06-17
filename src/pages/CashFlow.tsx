import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import { formatCurrency, getMonthRange } from '../lib/utils';
import { Spinner } from '../components/ui/Spinner';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DayEntry {
  date: string;
  revenues: number;
  expenses: number;
  balance: number;
  accumulated: number;
}

export default function CashFlow() {
  const { selectedCompany } = useCompany();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mode, setMode] = useState<'monthly' | 'daily'>('monthly');
  const [data, setData] = useState<DayEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (selectedCompany) load(); }, [selectedCompany, currentDate, mode]);

  async function load() {
    setLoading(true);
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth() + 1;
    const { start, end } = getMonthRange(y, m);

    const [revs, exps] = await Promise.all([
      supabase.from('revenues').select('date, amount').eq('company_id', selectedCompany!.id).gte('date', start).lte('date', end),
      supabase.from('expenses').select('date, amount').eq('company_id', selectedCompany!.id).gte('date', start).lte('date', end),
    ]);

    const dayMap: Record<string, { revenues: number; expenses: number }> = {};

    for (const r of revs.data ?? []) {
      if (!dayMap[r.date]) dayMap[r.date] = { revenues: 0, expenses: 0 };
      dayMap[r.date]!.revenues += Number(r.amount);
    }
    for (const e of exps.data ?? []) {
      if (!dayMap[e.date]) dayMap[e.date] = { revenues: 0, expenses: 0 };
      dayMap[e.date]!.expenses += Number(e.amount);
    }

    if (mode === 'daily') {
      let acc = 0;
      const days: DayEntry[] = [];
      const daysInMonth = new Date(y, m, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const { revenues = 0, expenses = 0 } = dayMap[dateStr] ?? {};
        acc += revenues - expenses;
        days.push({ date: String(d), revenues, expenses, balance: revenues - expenses, accumulated: acc });
      }
      setData(days);
    } else {
      // Group by week for monthly view — actually group by day but display in chart
      let acc = 0;
      const days: DayEntry[] = [];
      for (const [dateStr, { revenues, expenses }] of Object.entries(dayMap).sort()) {
        acc += revenues - expenses;
        const day = parseInt(dateStr.split('-')[2]!);
        days.push({ date: String(day), revenues, expenses, balance: revenues - expenses, accumulated: acc });
      }
      setData(days);
    }
    setLoading(false);
  }

  const totalRevenue = data.reduce((a, d) => a + d.revenues, 0);
  const totalExpense = data.reduce((a, d) => a + d.expenses, 0);
  const finalBalance = totalRevenue - totalExpense;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fluxo de Caixa</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button onClick={() => setMode('daily')} className={`px-3 py-1.5 text-sm font-medium transition-colors ${mode === 'daily' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>Diário</button>
            <button onClick={() => setMode('monthly')} className={`px-3 py-1.5 text-sm font-medium transition-colors ${mode === 'monthly' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>Mensal</button>
          </div>
        </div>
      </div>

      {/* Month navigator */}
      <div className="flex items-center gap-4">
        <button onClick={() => setCurrentDate(d => subMonths(d, 1))} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><ChevronLeft size={18} /></button>
        <span className="text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize min-w-[180px] text-center">
          {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
        </span>
        <button onClick={() => setCurrentDate(d => addMonths(d, 1))} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><ChevronRight size={18} /></button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Entradas', value: totalRevenue, color: 'text-green-600' },
          { label: 'Total Saídas', value: totalExpense, color: 'text-red-600' },
          { label: 'Saldo Final', value: finalBalance, color: finalBalance >= 0 ? 'text-blue-600' : 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="card p-5">
            <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{formatCurrency(s.value)}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="card p-6">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size={32} /></div>
        ) : (
          <>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Entradas, Saídas e Saldo Acumulado</h3>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={data} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="left" dataKey="revenues" name="Entradas" fill="#22c55e" radius={[3,3,0,0]} />
                <Bar yAxisId="left" dataKey="expenses" name="Saídas" fill="#ef4444" radius={[3,3,0,0]} />
                <Line yAxisId="right" type="monotone" dataKey="accumulated" name="Saldo acum." stroke="#3b82f6" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </>
        )}
      </div>

      {/* Detail Table */}
      {!loading && data.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Dia</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Entradas</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Saídas</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Saldo do dia</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Saldo acumulado</th>
                </tr>
              </thead>
              <tbody>
                {data.filter(d => d.revenues > 0 || d.expenses > 0).map(d => (
                  <tr key={d.date} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">Dia {d.date}</td>
                    <td className="px-4 py-2.5 text-right text-green-600 font-medium">{d.revenues > 0 ? formatCurrency(d.revenues) : '—'}</td>
                    <td className="px-4 py-2.5 text-right text-red-600 font-medium">{d.expenses > 0 ? formatCurrency(d.expenses) : '—'}</td>
                    <td className={`px-4 py-2.5 text-right font-medium ${d.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(d.balance)}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold ${d.accumulated >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatCurrency(d.accumulated)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
