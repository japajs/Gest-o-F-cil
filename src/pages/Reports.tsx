import { useState } from 'react';
import { FileText, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import { formatCurrency, formatDate, statusLabel, paymentMethodLabel } from '../lib/utils';
import { Spinner } from '../components/ui/Spinner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type ReportType = 'revenues' | 'expenses' | 'accounts_receivable' | 'accounts_payable' | 'cash_flow';

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: 'revenues', label: 'Receitas' },
  { value: 'expenses', label: 'Despesas' },
  { value: 'accounts_receivable', label: 'Contas a Receber' },
  { value: 'accounts_payable', label: 'Contas a Pagar' },
  { value: 'cash_flow', label: 'Fluxo de Caixa' },
];

export default function Reports() {
  const { selectedCompany, companies } = useCompany();
  const [reportType, setReportType] = useState<ReportType>('revenues');
  const [companyId, setCompanyId] = useState<string>(selectedCompany?.id ?? '');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date(); const e = new Date(d.getFullYear(), d.getMonth()+1, 0);
    return e.toISOString().split('T')[0]!;
  });
  const [generating, setGenerating] = useState(false);

  async function generate() {
    const cId = companyId || selectedCompany?.id;
    if (!cId) return;

    setGenerating(true);
    const company = companies.find(c => c.id === cId) ?? selectedCompany;
    const period = `${formatDate(startDate)} a ${formatDate(endDate)}`;

    try {
      const doc = new jsPDF();
      const blue = [37, 99, 235] as [number, number, number];

      // Header
      doc.setFillColor(...blue);
      doc.rect(0, 0, 210, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Financeiro Fácil', 14, 14);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(REPORT_TYPES.find(r => r.value === reportType)?.label ?? '', 14, 22);

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`Empresa: ${company?.name ?? ''}`, 14, 38);
      doc.text(`Período: ${period}`, 14, 45);
      doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 52);

      let startY = 62;

      if (reportType === 'revenues') {
        const { data } = await supabase.from('revenues').select('*, categories(name)')
          .eq('company_id', cId).gte('date', startDate).lte('date', endDate).order('date');
        const rows = (data ?? []).map(r => [formatDate(r.date), r.description, r.categories?.name ?? '—', paymentMethodLabel(r.payment_method), formatCurrency(r.amount)]);
        const total = (data ?? []).reduce((a, r) => a + Number(r.amount), 0);
        autoTable(doc, { startY, head: [['Data', 'Descrição', 'Categoria', 'Pagamento', 'Valor']], body: rows, theme: 'striped', headStyles: { fillColor: blue }, foot: [['', '', '', 'Total', formatCurrency(total)]], footStyles: { fontStyle: 'bold' } });

      } else if (reportType === 'expenses') {
        const { data } = await supabase.from('expenses').select('*, categories(name)')
          .eq('company_id', cId).gte('date', startDate).lte('date', endDate).order('date');
        const rows = (data ?? []).map(r => [formatDate(r.date), r.description, r.categories?.name ?? '—', paymentMethodLabel(r.payment_method), formatCurrency(r.amount)]);
        const total = (data ?? []).reduce((a, r) => a + Number(r.amount), 0);
        autoTable(doc, { startY, head: [['Data', 'Descrição', 'Categoria', 'Pagamento', 'Valor']], body: rows, theme: 'striped', headStyles: { fillColor: blue }, foot: [['', '', '', 'Total', formatCurrency(total)]], footStyles: { fontStyle: 'bold' } });

      } else if (reportType === 'accounts_receivable') {
        const { data } = await supabase.from('accounts_receivable').select('*')
          .eq('company_id', cId).gte('due_date', startDate).lte('due_date', endDate).order('due_date');
        const rows = (data ?? []).map(r => [r.client_name, r.description ?? '—', formatDate(r.due_date), statusLabel(r.status), formatCurrency(r.amount)]);
        const total = (data ?? []).reduce((a, r) => a + Number(r.amount), 0);
        autoTable(doc, { startY, head: [['Cliente', 'Descrição', 'Vencimento', 'Status', 'Valor']], body: rows, theme: 'striped', headStyles: { fillColor: blue }, foot: [['', '', '', 'Total', formatCurrency(total)]], footStyles: { fontStyle: 'bold' } });

      } else if (reportType === 'accounts_payable') {
        const { data } = await supabase.from('accounts_payable').select('*')
          .eq('company_id', cId).gte('due_date', startDate).lte('due_date', endDate).order('due_date');
        const rows = (data ?? []).map(r => [r.supplier_name, r.description ?? '—', formatDate(r.due_date), statusLabel(r.status), formatCurrency(r.amount)]);
        const total = (data ?? []).reduce((a, r) => a + Number(r.amount), 0);
        autoTable(doc, { startY, head: [['Fornecedor', 'Descrição', 'Vencimento', 'Status', 'Valor']], body: rows, theme: 'striped', headStyles: { fillColor: blue }, foot: [['', '', '', 'Total', formatCurrency(total)]], footStyles: { fontStyle: 'bold' } });

      } else if (reportType === 'cash_flow') {
        const [revs, exps] = await Promise.all([
          supabase.from('revenues').select('date, amount').eq('company_id', cId).gte('date', startDate).lte('date', endDate),
          supabase.from('expenses').select('date, amount').eq('company_id', cId).gte('date', startDate).lte('date', endDate),
        ]);
        const dayMap: Record<string, { rev: number; exp: number }> = {};
        for (const r of revs.data ?? []) { if (!dayMap[r.date]) dayMap[r.date] = { rev: 0, exp: 0 }; dayMap[r.date]!.rev += Number(r.amount); }
        for (const e of exps.data ?? []) { if (!dayMap[e.date]) dayMap[e.date] = { rev: 0, exp: 0 }; dayMap[e.date]!.exp += Number(e.amount); }
        let acc = 0;
        const rows = Object.entries(dayMap).sort().map(([date, { rev, exp }]) => {
          acc += rev - exp;
          return [formatDate(date), formatCurrency(rev), formatCurrency(exp), formatCurrency(rev - exp), formatCurrency(acc)];
        });
        const totalRev = (revs.data ?? []).reduce((a, r) => a + Number(r.amount), 0);
        const totalExp = (exps.data ?? []).reduce((a, r) => a + Number(r.amount), 0);
        autoTable(doc, { startY, head: [['Data', 'Entradas', 'Saídas', 'Saldo do Dia', 'Saldo Acumulado']], body: rows, theme: 'striped', headStyles: { fillColor: blue }, foot: [['Total', formatCurrency(totalRev), formatCurrency(totalExp), formatCurrency(totalRev - totalExp), '']], footStyles: { fontStyle: 'bold' } });
      }

      const filename = `${reportType}_${company?.name?.replace(/\s/g, '_')}_${startDate}_${endDate}.pdf`;
      doc.save(filename);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Relatórios</h1>
      </div>

      <div className="card p-6 max-w-xl">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-5 flex items-center gap-2">
          <FileText size={18} className="text-primary-600" /> Gerar Relatório PDF
        </h2>

        <div className="space-y-4">
          <div>
            <label className="label">Tipo de relatório</label>
            <select value={reportType} onChange={e => setReportType(e.target.value as ReportType)} className="input">
              {REPORT_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          {companies.length > 1 && (
            <div>
              <label className="label">Empresa</label>
              <select value={companyId} onChange={e => setCompanyId(e.target.value)} className="input">
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Data inicial</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Data final</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input" />
            </div>
          </div>

          <button onClick={generate} disabled={generating} className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
            {generating ? <><Spinner size={16} /> Gerando...</> : <><Download size={16} /> Gerar PDF</>}
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORT_TYPES.map(r => (
          <button
            key={r.value}
            onClick={() => { setReportType(r.value); }}
            className={`card p-5 text-left hover:border-primary-300 dark:hover:border-primary-700 transition-colors cursor-pointer ${reportType === r.value ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : ''}`}
          >
            <FileText size={20} className={reportType === r.value ? 'text-primary-600' : 'text-gray-400'} />
            <p className={`mt-2 text-sm font-medium ${reportType === r.value ? 'text-primary-700 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'}`}>{r.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">Clique para selecionar</p>
          </button>
        ))}
      </div>
    </div>
  );
}
