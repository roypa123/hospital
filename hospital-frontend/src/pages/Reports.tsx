import React, { useEffect, useState } from 'react';
import { api } from '@/api/endpoints';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { 
  BarChart3, 
  RefreshCw, 
  Activity, 
  TrendingUp, 
  DollarSign, 
  CalendarDays
} from 'lucide-react';
import { toast } from 'sonner';

export const Reports: React.FC = () => {
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [apptData, setApptData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [revRes, apptRes] = await Promise.all([
        api.reports.getRevenue(),
        api.reports.getAppointments()
      ]);
      
      // Transform data for recharts if needed
      setRevenueData(revRes.data || []);
      setApptData(apptRes.data || []);
    } catch (e) {
      toast.error('Failed to load intelligence reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const totalBilled = revenueData.reduce((acc, curr) => acc + parseFloat(curr.total_billed || 0), 0);
  const totalCollected = revenueData.reduce((acc, curr) => acc + parseFloat(curr.total_paid || 0), 0);
  const totalVolume = apptData.reduce((acc, curr) => acc + parseInt(curr.count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-emerald-500" />
          <h2 className="text-sm font-bold text-slate-450 uppercase tracking-wider">Reports & Analytics Console</h2>
        </div>
        <button 
          onClick={fetchReports} 
          className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors cursor-pointer text-slate-500"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Overview Metric Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Total Bills Dispatched</p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">${totalBilled.toLocaleString(undefined, { maximumFractionDigits: 2 })}</h3>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Collections Received</p>
              <h3 className="text-2xl font-extrabold text-emerald-500">${totalCollected.toLocaleString(undefined, { maximumFractionDigits: 2 })}</h3>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Appointment Volume</p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">{totalVolume}</h3>
            </div>
            <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
              <CalendarDays className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Revenue chart */}
        <Card className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Financial Revenue Timeline</CardTitle>
            <CardDescription className="text-xs text-slate-550 dark:text-slate-450">Billed amount vs. payments collected historically</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {loading && revenueData.length === 0 ? (
              <div className="flex justify-center items-center h-full">
                <Activity className="w-6 h-6 animate-spin text-emerald-500" />
              </div>
            ) : revenueData.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-450 h-full flex items-center justify-center">
                No financial logs recorded.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3341551A" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px', color: '#fff' }} />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px' }} />
                  <Area name="Total Billed ($)" type="monotone" dataKey="total_billed" stroke="#38bdf8" strokeWidth={2} fillOpacity={0} />
                  <Area name="Total Paid ($)" type="monotone" dataKey="total_paid" stroke="#10b981" fillOpacity={1} fill="url(#colorPaid)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Appointment chart */}
        <Card className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Bookings Load Factor</CardTitle>
            <CardDescription className="text-xs text-slate-550 dark:text-slate-450">Active count distribution over status tags</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {loading && apptData.length === 0 ? (
              <div className="flex justify-center items-center h-full">
                <Activity className="w-6 h-6 animate-spin text-emerald-500" />
              </div>
            ) : apptData.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-450 h-full flex items-center justify-center">
                No appointment load logs.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={apptData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3341551A" />
                  <XAxis dataKey="status" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px', color: '#fff' }} />
                  <Bar dataKey="count" fill="#6366f1" radius={[8, 8, 0, 0]} name="Booking Count" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
};
