import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/hooks/useAuthStore';
import { api } from '@/api/endpoints';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { 
  Activity, 
  Users, 
  CalendarDays, 
  DollarSign, 
  TrendingUp, 
  UserSquare2, 
  Stethoscope, 
  Clock,
  Sparkles,
  ClipboardList
} from 'lucide-react';
import { toast } from 'sonner';

export const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const role = user?.roles?.[0] || 'PATIENT';

  const COLORS = ['#10b981', '#06b6d4', '#6366f1', '#f59e0b', '#ef4444'];

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      let res;
      if (role === 'ADMIN') {
        res = await api.dashboard.getAdminDashboard();
      } else if (role === 'DOCTOR') {
        res = await api.dashboard.getDoctorDashboard();
      } else {
        res = await api.dashboard.getPatientDashboard();
      }
      setData(res.data);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [role]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Activity className="h-10 w-10 text-emerald-500 animate-spin" />
          <p className="text-slate-500 text-sm font-semibold">Loading diagnostic control dashboard...</p>
        </div>
      </div>
    );
  }

  // Helper metric cards
  const renderMetric = (title: string, value: string | number, desc: string, icon: React.ReactNode, trend?: string) => (
    <Card className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm relative overflow-hidden transition-all duration-300 hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">{title}</p>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">{value}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-450 flex items-center gap-1">
              {trend && <span className="text-emerald-500 font-semibold">{trend}</span>} {desc}
            </p>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-850/50 rounded-xl border border-slate-200/50 dark:border-slate-800/50 text-slate-600 dark:text-slate-350">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // RENDER ADMIN DASHBOARD
  if (role === 'ADMIN' && data) {
    const { overview, financials, appointments_by_status, revenue_by_method } = data;
    
    // Map data for charts
    const statusChartData = appointments_by_status?.map((item: any) => ({
      name: item.status.replace('_', ' ').toUpperCase(),
      value: parseInt(item.count)
    })) || [];

    const methodChartData = revenue_by_method?.map((item: any) => ({
      name: item.payment_method.replace('_', ' ').toUpperCase(),
      value: parseFloat(item.revenue)
    })) || [];

    const totalRevenue = financials ? parseFloat(financials.total_paid) : 0;
    const pendingRevenue = financials ? (parseFloat(financials.total_billed) - parseFloat(financials.total_paid)) : 0;

    return (
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Admin Operations Panel</h1>
            <p className="text-sm text-slate-550 dark:text-slate-400">Hospital occupancy, staffing, financials, and logs overview.</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-450 text-xs font-semibold rounded-full select-none">
            <Sparkles className="w-3.5 h-3.5" /> Operations System Active
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {renderMetric('Total Patients', overview?.patients_count || 0, 'registered users', <Users className="w-5 h-5 text-emerald-500" />)}
          {renderMetric('Total Doctors', overview?.doctors_count || 0, 'medical practitioners', <Stethoscope className="w-5 h-5 text-teal-500" />)}
          {renderMetric('Total Bookings', overview?.appointments_count || 0, 'consultation tickets', <CalendarDays className="w-5 h-5 text-indigo-500" />)}
          {renderMetric('Net Collections', `$${totalRevenue.toLocaleString()}`, `Pending: $${pendingRevenue.toLocaleString()}`, <DollarSign className="w-5 h-5 text-amber-500" />)}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Bookings Distribution by Status</CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-450">Active flow state check across general diagnostics</CardDescription>
            </CardHeader>
            <CardContent className="h-80 flex items-center justify-center">
              {statusChartData.length === 0 ? (
                <p className="text-xs text-slate-400">No booking logs registered.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusChartData.map((_entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px', color: '#fff' }} />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Collections by Payment Method</CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-450">Revenue collections channeled across departments</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {methodChartData.length === 0 ? (
                <p className="text-xs text-slate-400">No revenue bills paid.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={methodChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3341551A" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px', color: '#fff' }} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {methodChartData.map((_entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // RENDER DOCTOR DASHBOARD
  if (role === 'DOCTOR' && data) {
    const { summary, upcoming_appointments } = data;

    return (
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Doctor Portal Workspace</h1>
            <p className="text-sm text-slate-550 dark:text-slate-400">Check active queues, EMR details, and edit patient schedules.</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-450 text-xs font-semibold rounded-full select-none">
            <Stethoscope className="w-3.5 h-3.5" /> Consultation Stream Live
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {renderMetric('Consultations Today', summary?.today_count || 0, 'scheduled bookings', <CalendarDays className="w-5 h-5 text-emerald-500" />)}
          {renderMetric('Patients Checked-In', summary?.checked_in_count || 0, 'waiting in queue', <Clock className="w-5 h-5 text-amber-500" />)}
          {renderMetric('Diagnoses Completed', summary?.completed_count || 0, 'completed tickets', <TrendingUp className="w-5 h-5 text-indigo-500" />)}
        </div>

        {/* Upcoming Queue */}
        <Card className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Patient Roster Queue</CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-450">Active upcoming patient slots for scheduled consultations</CardDescription>
          </CardHeader>
          <CardContent>
            {upcoming_appointments?.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No upcoming slots scheduled for today.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-150 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Time Slot</th>
                      <th className="py-3 px-4">Patient Profile</th>
                      <th className="py-3 px-4">Reason for Visit</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {upcoming_appointments?.map((appt: any) => (
                      <tr key={appt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-350">{appt.start_time} - {appt.end_time}</td>
                        <td className="py-3.5 px-4 text-slate-900 dark:text-white font-medium">{appt.first_name} {appt.last_name}</td>
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 truncate max-w-[200px]">{appt.reason || 'General Routine Consultation'}</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase 
                            ${appt.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                              appt.status === 'consultation' ? 'bg-teal-500/10 text-teal-500 border border-teal-500/20' : 
                              appt.status === 'checked_in' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 
                              'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'}`}>
                            {appt.status.replace('_', ' ')}
                          </span>
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
  }

  // RENDER PATIENT DASHBOARD
  if (role === 'PATIENT' && data) {
    const { summary, vitals_trends } = data;

    // Sort vitals timeline chronologically
    const chartData = vitals_trends?.map((item: any) => {
      // Extract blood pressure values
      let systolic = 120;
      let diastolic = 80;
      if (item.blood_pressure) {
        const parts = item.blood_pressure.split('/');
        if (parts.length === 2) {
          systolic = parseInt(parts[0]) || 120;
          diastolic = parseInt(parts[1]) || 80;
        }
      }

      return {
        date: new Date(item.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        systolic,
        diastolic,
        heart_rate: parseInt(item.heart_rate) || 72,
        temp: parseFloat(item.temperature) || 98.6
      };
    }) || [];

    return (
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Patient Diagnostics Hub</h1>
            <p className="text-sm text-slate-550 dark:text-slate-400">View your clinical trends, book consultations, and read prescriptions.</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-650 dark:text-indigo-400 text-xs font-semibold rounded-full select-none">
            <UserSquare2 className="w-3.5 h-3.5" /> Patient Records Active
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {renderMetric('Next Booking', summary?.upcoming_appointment ? `${new Date(summary.upcoming_appointment.date).toLocaleDateString()} @ ${summary.upcoming_appointment.start_time.substring(0, 5)}` : 'None Scheduled', 'Upcoming Slot', <CalendarDays className="w-5 h-5 text-indigo-500" />)}
          {renderMetric('Active Prescriptions', summary?.active_prescriptions_count || 0, 'dispensable catalog', <ClipboardList className="w-5 h-5 text-emerald-500" />)}
          {renderMetric('Completed Tests', summary?.completed_labs_count || 0, 'uploaded clinical files', <TrendingUp className="w-5 h-5 text-teal-500" />)}
        </div>

        {/* Vitals Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Clinical Vitals History</CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-450">Track blood pressure and heart rate across consultation timelines</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {chartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-xs text-slate-400 gap-2">
                  <Activity className="w-8 h-8 text-slate-300" />
                  No clinical vitals recorded in EMR yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorSys" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPulse" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3341551A" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px', color: '#fff' }} />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px' }} />
                    <Area name="BP Systolic (mmHg)" type="monotone" dataKey="systolic" stroke="#ef4444" fillOpacity={1} fill="url(#colorSys)" strokeWidth={2} />
                    <Area name="Heart Rate (BPM)" type="monotone" dataKey="heart_rate" stroke="#10b981" fillOpacity={1} fill="url(#colorPulse)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm flex flex-col justify-between">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Medical Profile Details</CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-450">Clinical file registration metadata</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3 text-xs">
                <span className="text-slate-450 dark:text-slate-500 font-semibold">User ID</span>
                <span className="text-slate-700 dark:text-slate-350 font-semibold truncate max-w-[150px]">{user?.id}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3 text-xs">
                <span className="text-slate-450 dark:text-slate-500 font-semibold">Verification State</span>
                <span className="text-emerald-500 font-bold">Email Verified</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3 text-xs">
                <span className="text-slate-450 dark:text-slate-500 font-semibold">Authentication Roles</span>
                <span className="text-slate-700 dark:text-slate-300 font-semibold">Registered Patient</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-450 dark:text-slate-500 font-semibold">2FA Enabled</span>
                <span className={`font-bold ${user?.two_factor_enabled ? 'text-emerald-500' : 'text-slate-400'}`}>
                  {user?.two_factor_enabled ? 'Active' : 'Inactive'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-12 text-sm text-slate-500">
      Invalid Dashboard State
    </div>
  );
};
