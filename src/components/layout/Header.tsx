import { Moon, Sun, Building2, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';
import { useDarkMode } from '../../hooks/useDarkMode';
import { useState, useRef, useEffect } from 'react';

export function Header() {
  const { isAdmin } = useAuth();
  const { companies, selectedCompany, setSelectedCompany } = useCompany();
  const { dark, toggle } = useDarkMode();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Company Selector */}
      {isAdmin && companies.length > 0 ? (
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Building2 size={16} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {selectedCompany?.name ?? 'Selecionar empresa'}
            </span>
            <ChevronDown size={14} className="text-gray-400" />
          </button>
          {open && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 z-50">
              {companies.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedCompany(c); setOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                    selectedCompany?.id === c.id ? 'text-primary-600 dark:text-primary-400 font-medium' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="font-medium">{c.name}</div>
                  {c.segment && <div className="text-xs text-gray-400">{c.segment}</div>}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Building2 size={16} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{selectedCompany?.name ?? '—'}</span>
        </div>
      )}

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggle}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
          title={dark ? 'Modo claro' : 'Modo escuro'}
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
