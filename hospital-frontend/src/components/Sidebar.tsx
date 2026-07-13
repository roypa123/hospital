import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/hooks/useAuthStore';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Users, 
  FileText, 
  FlaskConical, 
  CreditCard, 
  Package, 
  ShieldAlert, 
  BarChart3, 
  UserCircle,
  LogOut,
  Activity
} from 'lucide-react';

interface SidebarProps {
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const { user, logout } = useAuthStore();
  const roles = user?.roles || [];

  const hasRole = (allowedRoles: string[]) => {
    return allowedRoles.some(role => roles.includes(role));
  };

  const menuItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      show: true
    },
    {
      name: 'Appointments',
      path: '/appointments',
      icon: CalendarDays,
      show: hasRole(['ADMIN', 'RECEPTIONIST', 'DOCTOR', 'PATIENT', 'NURSE'])
    },
    {
      name: 'Patients & EMR',
      path: '/patients',
      icon: Users,
      show: hasRole(['ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE', 'LAB_TECHNICIAN'])
    },
    {
      name: 'Prescriptions',
      path: '/prescriptions',
      icon: FileText,
      show: hasRole(['ADMIN', 'DOCTOR', 'PHARMACIST', 'PATIENT'])
    },
    {
      name: 'Laboratory',
      path: '/laboratory',
      icon: FlaskConical,
      show: hasRole(['ADMIN', 'DOCTOR', 'LAB_TECHNICIAN', 'PATIENT'])
    },
    {
      name: 'Billing & Claims',
      path: '/billing',
      icon: CreditCard,
      show: hasRole(['ADMIN', 'CASHIER', 'PATIENT', 'INSURANCE_OFFICER'])
    },
    {
      name: 'Pharmacy Stock',
      path: '/inventory',
      icon: Package,
      show: hasRole(['ADMIN', 'PHARMACIST'])
    },
    {
      name: 'System Users',
      path: '/users',
      icon: Users,
      show: hasRole(['ADMIN'])
    },
    {
      name: 'Audit Logs',
      path: '/audit-logs',
      icon: ShieldAlert,
      show: hasRole(['ADMIN'])
    },
    {
      name: 'Reports & Analytics',
      path: '/reports',
      icon: BarChart3,
      show: hasRole(['ADMIN'])
    },
    {
      name: 'Profile Settings',
      path: '/profile',
      icon: UserCircle,
      show: true
    }
  ];

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 text-slate-300 w-64 select-none">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-lg shadow-teal-500/20">
          <Activity className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h1 className="font-bold text-white tracking-wide text-md">Aura Health</h1>
          <span className="text-xs text-slate-500 font-medium">Core Platform</span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {menuItems
          .filter(item => item.show)
          .map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onCloseMobile}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 group
                  ${isActive 
                    ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/5 text-emerald-400 border-l-4 border-emerald-500 shadow-sm shadow-emerald-950/10' 
                    : 'hover:bg-slate-800/50 hover:text-slate-100 border-l-4 border-transparent'
                  }
                `}
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                    <span className="text-[14px]">{item.name}</span>
                  </>
                )}
              </NavLink>
            );
          })}
      </nav>

      {/* User Session Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex flex-col gap-3">
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold text-sm">
            {user?.first_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.first_name} {user?.last_name}</p>
            <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
            <span className="inline-block px-1.5 py-0.5 mt-1 text-[8px] font-bold tracking-wider uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              {roles[0] || 'PATIENT'}
            </span>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-slate-800 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 font-semibold text-xs text-slate-400 transition-all duration-300 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </button>
      </div>
    </div>
  );
};
