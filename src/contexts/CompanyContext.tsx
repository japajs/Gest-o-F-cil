import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Company } from '../types';
import { useAuth } from './AuthContext';

interface CompanyContextType {
  companies: Company[];
  selectedCompany: Company | null;
  setSelectedCompany: (c: Company | null) => void;
  loading: boolean;
  refresh: () => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { profile, isAdmin } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) load();
  }, [profile]);

  async function load() {
    setLoading(true);
    const query = supabase.from('companies').select('*').eq('active', true).order('name');
    const { data } = await query;
    const list = data ?? [];
    setCompanies(list);

    if (!isAdmin && profile?.company_id) {
      const own = list.find(c => c.id === profile.company_id) ?? null;
      setSelectedCompany(own);
    } else if (list.length > 0 && !selectedCompany) {
      setSelectedCompany(list[0] ?? null);
    }
    setLoading(false);
  }

  return (
    <CompanyContext.Provider value={{ companies, selectedCompany, setSelectedCompany, loading, refresh: load }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error('useCompany must be used inside CompanyProvider');
  return ctx;
}
