import React, { useEffect, useState } from 'react';
import { api } from '@/api/endpoints';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ShieldAlert, 
  RefreshCw, 
  Activity, 
  Clock, 
  User, 
  Database 
} from 'lucide-react';
import { toast } from 'sonner';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.auditLogs.list();
      setLogs(res.data || []);
    } catch (e) {
      toast.error('Failed to load system audit trails');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => 
    log.event_type?.toLowerCase().includes(search.toLowerCase()) ||
    log.table_name?.toLowerCase().includes(search.toLowerCase()) ||
    log.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    log.last_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-500" />
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">System Security Audit</h2>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Filter logs by event..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button 
            onClick={fetchLogs} 
            className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors cursor-pointer text-slate-500"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <Card className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm">
        <CardContent className="p-0">
          {loading && logs.length === 0 ? (
            <div className="flex justify-center py-12">
              <Activity className="w-8 h-8 animate-spin text-rose-550" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-450">
              No audit logs captured.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-150 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Operator</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Resource</th>
                    <th className="py-3 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors">
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-350 whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          {log.first_name ? `${log.first_name} ${log.last_name}` : 'SYSTEM'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider
                          ${log.event_type.includes('LOGIN') ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/15' : 
                            log.event_type.includes('DELETE') ? 'bg-rose-500/10 text-rose-500 border border-rose-500/15' : 
                            'bg-indigo-500/10 text-indigo-500 border border-indigo-500/15'}`}>
                          {log.event_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <Database className="w-3 h-3 text-slate-400" />
                          {log.table_name}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-450 dark:text-slate-500 truncate max-w-[250px] cursor-help" title={JSON.stringify(log.payload)}>
                        {JSON.stringify(log.payload)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
