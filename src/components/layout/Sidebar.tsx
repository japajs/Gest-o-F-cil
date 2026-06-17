import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Building2, TrendingUp, TrendingDown,
  CreditCard, Wallet, ArrowLeftRight, FileText, ClipboardList,
  Settings, LogOut, ChevronLeft, ChevronRight, Tag, Users,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const LOGO = () => (
  <div className="flex items-center gap-2.5">
    <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shrink-0">
      <span className="text-white font-bold text-sm">FF</span>
    </div>
    <span className="font-bold text-gray-900 dark:text-white text-base whitespace-nowrap">Financeiro Fácil</span>
  </div>
);

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  adminOnly?: boolean;
}

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: 'GERAL',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/companies', icon: Building2, label: 'Empresas', adminOnly: true },
    ],
  },
  {
    title: 'FINANCEIRO',
    items: [
      { to: '/revenues', icon: TrendingUp, label: 'Receitas' },
      { to: '/expenses', icon: TrendingDown, label: 'Despesas' },
      { to: '/accounts-receivable', icon: Wallet, label: 'A Receber' },
      { to: '/accounts-payable', icon: CreditCard, label: 'A Pagar' },
    ],
  },
  {
    title: 'ANÁLISE',
    items: [
      { to: '/cash-flow', icon: ArrowLeftRight, label: 'Fluxo de Caixa' },
      { to: '/reports', icon: FileText, label: 'Relatórios' },
    ],
  },
  {
    title: 'SISTEMA',
    items: [
      { to: '/categories', icon: Tag, label: 'Categorias', adminOnly: true },
      { to: '/users', icon: Users, label: 'Usuários', adminOnly: true },
      { to: '/audit', icon: ClipboardList, label: 'Auditoria', adminOnly: true },
      { to: '/settings', icon: Settings, label: 'Configurações' },
    ],
  },
];

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: Props) {
  const { isAdmin, signOut, profile } = useAuth();

  return (
    <aside
      className={`
        fixed top-0 left-0 h-full z-40 flex flex-col
        bg-white dark:bg-gray-900
        border-r border-gray-200 dark:border-gray-800
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-16' : 'w-60'}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-gray-200 dark:border-gray-800">
        {!collapsed && <LOGO />}
        {collapsed && (
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-sm">FF</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className={`p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${collapsed ? 'absolute -right-3 top-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm' : ''}`}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navSections.map(section => {
          const visibleItems = section.items.filter(item => !item.adminOnly || isAdmin);
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.title} className="mb-2">
              {!collapsed && (
                <p className="px-3 mb-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500 tracking-widest">
                  {section.title}
                </p>
              )}
              {visibleItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group
                    ${isActive
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                    }
                    ${collapsed ? 'justify-center' : ''}`
                  }
                >
                  <item.icon size={18} className="shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-3">
        {!collapsed && (
          <div className="px-2 py-2 mb-2">
            <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
              {profile?.full_name ?? 'Usuário'}
            </p>
            <p className="text-[11px] text-gray-400 capitalize">{profile?.role === 'admin' ? 'Administrador' : 'Cliente'}</p>
          </div>
        )}
        <button
          onClick={signOut}
          title={collapsed ? 'Sair' : undefined}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={18} />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
}
