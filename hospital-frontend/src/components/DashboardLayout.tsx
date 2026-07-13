import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { api } from '@/api/endpoints';
import { 
  Menu, 
  X, 
  Bell, 
  Sun, 
  Moon, 
  Check, 
  Loader2 
} from 'lucide-react';
import { toast } from 'sonner';

export const DashboardLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const location = useLocation();

  const toggleDarkMode = () => {
    const isDark = !dark;
    setDark(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  useEffect(() => {
    // Initial theme check
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      setDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const fetchNotifications = async () => {
    setLoadingNotifs(true);
    try {
      const response = await api.notifications.list();
      setNotifications(response.data || []);
    } catch (e) {
      console.error('Failed to load notifications', e);
    } finally {
      setLoadingNotifs(false);
    }
  };

  useEffect(() => {
    // Load notifications on mount and set polling interval
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // 30s
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.notifications.read(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      toast.success('Notification marked as read');
    } catch (e) {
      toast.error('Failed to update notification');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.readAll();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
    } catch (e) {
      toast.error('Failed to update notifications');
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) return 'Clinical Command Dashboard';
    if (path.startsWith('/appointments')) return 'Appointment Scheduler';
    if (path.startsWith('/patients')) return 'Patient Directory & EMR';
    if (path.startsWith('/prescriptions')) return 'Medical Prescriptions';
    if (path.startsWith('/laboratory')) return 'Laboratory Diagnostics';
    if (path.startsWith('/billing')) return 'Financial Desk & Billing';
    if (path.startsWith('/inventory')) return 'Pharmacy Catalog & Stock';
    if (path.startsWith('/audit-logs')) return 'System Security Audit Logs';
    if (path.startsWith('/reports')) return 'Intelligence Reports & Analytics';
    if (path.startsWith('/profile')) return 'Account Preferences';
    return 'Aura Health System';
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 transition-colors duration-300">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block h-full">
        <Sidebar />
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 transform lg:hidden transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onCloseMobile={() => setMobileOpen(false)} />
      </div>

      {/* Content Area Container */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="flex items-center justify-between px-6 py-4 bg-white/70 dark:bg-slate-900/40 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 z-30">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button 
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-850 lg:hidden cursor-pointer"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white capitalize">
              {getPageTitle()}
            </h2>
          </div>

          {/* User Controls / Header Tools */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-850 transition-all duration-300 cursor-pointer"
              title="Toggle Dark Mode"
            >
              {dark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notifications Popover */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-850 transition-all duration-300 cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  {/* Backdrop to close click */}
                  <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 mt-2.5 w-80 max-h-[420px] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl shadow-slate-950/20 z-40 flex flex-col">
                    <div className="flex items-center justify-between p-4 border-b border-slate-150 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/20">
                      <h3 className="font-semibold text-xs text-slate-700 dark:text-slate-350">Notifications</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="flex items-center gap-1 text-[10px] font-semibold text-emerald-500 hover:text-emerald-600 transition-colors cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Mark all read
                        </button>
                      )}
                    </div>
                    
                    {/* List */}
                    <div className="flex-1 overflow-y-auto max-h-[300px] divide-y divide-slate-100 dark:divide-slate-800">
                      {loadingNotifs && notifications.length === 0 ? (
                        <div className="flex items-center justify-center p-8">
                          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-550">
                          No notifications found
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div 
                            key={n.id} 
                            className={`p-4 flex gap-2 transition-colors duration-200 hover:bg-slate-50/50 dark:hover:bg-slate-850/30 ${!n.is_read ? 'bg-slate-500/5' : ''}`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-800 dark:text-slate-250 leading-relaxed">
                                {n.message}
                              </p>
                              <span className="text-[9px] text-slate-450 dark:text-slate-500 mt-1 block">
                                {new Date(n.created_at || n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            {!n.is_read && (
                              <button
                                onClick={() => handleMarkAsRead(n.id)}
                                className="h-5 w-5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-emerald-500 cursor-pointer"
                                title="Mark read"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950/20">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
