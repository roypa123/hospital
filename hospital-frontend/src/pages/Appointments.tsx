import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/hooks/useAuthStore';
import { api } from '@/api/endpoints';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  CalendarDays, 
  User, 
  Stethoscope, 
  Clock, 
  ClipboardList, 
  RefreshCw, 
  PlaySquare, 
  CheckCheck
} from 'lucide-react';
import { toast } from 'sonner';

export const Appointments: React.FC = () => {
  const { user } = useAuthStore();
  const role = user?.roles?.[0] || 'PATIENT';
  const isStaff = ['ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'].includes(role);

  // Lists
  const [appointments, setAppointments] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  
  // Selection / Form
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [reason, setReason] = useState('');
  
  // Loading
  const [loadingAppts, setLoadingAppts] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const fetchAppointments = async () => {
    setLoadingAppts(true);
    try {
      const response = await api.appointments.list();
      setAppointments(response.data || []);
    } catch (e: any) {
      toast.error('Failed to load appointments roster');
    } finally {
      setLoadingAppts(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const deptsRes = await api.departments.list();
      setDepartments(deptsRes.data || []);
      const docsRes = await api.doctors.list();
      setDoctors(docsRes.data || []);
    } catch (e) {
      console.error('Failed to load metadata', e);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchMetadata();
  }, []);

  // Fetch Slots
  const handleFetchSlots = async () => {
    if (!selectedDoctor || !selectedDate) {
      toast.error('Please select both a doctor and date to view slots');
      return;
    }
    setLoadingSlots(true);
    try {
      const response = await api.appointments.getSlots(selectedDoctor, selectedDate);
      setSlots(response.data || []);
    } catch (e: any) {
      toast.error('Failed to load available slots');
    } finally {
      setLoadingSlots(false);
    }
  };

  // Generate Slots (Staff only)
  const handleGenerateSlots = async () => {
    if (!selectedDoctor || !selectedDate) {
      toast.error('Select doctor and date to generate schedule');
      return;
    }
    try {
      const response = await api.appointments.generateSlots({
        doctor_id: selectedDoctor,
        date: selectedDate
      });
      toast.success(response.message || 'Slots generated successfully');
      handleFetchSlots();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to generate slots');
    }
  };

  // Book Appointment
  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !selectedSlot) {
      toast.error('Doctor and slot selection required');
      return;
    }
    try {
      await api.appointments.create({
        doctor_id: selectedDoctor,
        slot_id: selectedSlot,
        reason
      });
      toast.success('Appointment booked successfully!');
      setSelectedSlot('');
      setReason('');
      fetchAppointments();
      handleFetchSlots();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Booking conflict or error. Try another slot.');
    }
  };

  // Status transitions
  const handleStatusTransition = async (apptId: string, nextStatus: string) => {
    try {
      await api.appointments.updateStatus(apptId, { 
        status: nextStatus,
        notes: `Appointment status adjusted to ${nextStatus}`
      });
      toast.success(`Status updated to ${nextStatus.replace('_', ' ')}`);
      fetchAppointments();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Transition blocked by workflow engine');
    }
  };

  // Cancel Appointment
  const handleCancelAppointment = async (apptId: string) => {
    try {
      await api.appointments.cancel(apptId);
      toast.success('Appointment cancelled and slot freed');
      fetchAppointments();
    } catch (e: any) {
      toast.error('Failed to cancel appointment');
    }
  };

  // Filtered Doctors list
  const filteredDoctors = selectedDept
    ? doctors.filter(doc => doc.department_id === selectedDept)
    : doctors;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Scheduler Controls */}
        <div className="xl:col-span-1 space-y-6">
          <Card className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Book Consultation</CardTitle>
              <CardDescription className="text-xs text-slate-550 dark:text-slate-400">Find doctors and check active schedules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Department Select */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Select Department</label>
                <select
                  value={selectedDept}
                  onChange={(e) => { setSelectedDept(e.target.value); setSelectedDoctor(''); }}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">All Departments</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>

              {/* Doctor Select */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Select Doctor</label>
                <select
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Choose Practitioner</option>
                  {filteredDoctors.map(doc => (
                    <option key={doc.id} value={doc.id}>Dr. {doc.first_name} {doc.last_name}</option>
                  ))}
                </select>
              </div>

              {/* Date Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Select Date</label>
                <Input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs rounded-xl"
                />
              </div>

              {/* Slots Generate / Fetch Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button 
                  onClick={handleFetchSlots}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs py-2 font-bold cursor-pointer"
                  disabled={loadingSlots}
                >
                  Show Slots
                </Button>
                {isStaff && (
                  <Button 
                    onClick={handleGenerateSlots}
                    className="bg-teal-500/10 border border-teal-500/20 hover:bg-teal-500/25 text-teal-600 dark:text-teal-400 rounded-xl text-xs py-2 font-bold cursor-pointer"
                  >
                    Generate Slots
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Slot Selection Block */}
          {slots.length > 0 && (
            <Card className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Available Slots</CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-450">Select desired consultation timing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {slots.map(s => (
                    <button
                      key={s.id}
                      onClick={() => s.status === 'available' && setSelectedSlot(s.id)}
                      className={`px-2.5 py-2 text-[10px] font-bold rounded-xl border text-center transition-all duration-300 cursor-pointer
                        ${s.status !== 'available' 
                          ? 'bg-slate-100 dark:bg-slate-900/50 border-slate-150 dark:border-slate-800 text-slate-400 line-through cursor-not-allowed' 
                          : selectedSlot === s.id
                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-md'
                            : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 hover:bg-emerald-500/10 hover:border-emerald-500/20'
                        }
                      `}
                      disabled={s.status !== 'available'}
                    >
                      {s.start_time.substring(0, 5)}
                    </button>
                  ))}
                </div>

                {selectedSlot && (
                  <form onSubmit={handleBookAppointment} className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Reason for Visit</label>
                      <Input
                        type="text"
                        placeholder="Routine physical, symptoms details..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs rounded-xl"
                      />
                    </div>
                    <Button 
                      type="submit"
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-2 rounded-xl shadow-lg shadow-emerald-500/10 cursor-pointer"
                    >
                      Confirm Booking
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Appointments Queue Roster */}
        <div className="xl:col-span-2">
          <Card className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Scheduled Bookings</CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-450">Manage states, reschedule entries, and view active lists</CardDescription>
              </div>
              <button 
                onClick={fetchAppointments} 
                className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors cursor-pointer text-slate-500"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingAppts ? 'animate-spin' : ''}`} />
              </button>
            </CardHeader>
            <CardContent>
              {loadingAppts ? (
                <div className="flex justify-center py-8">
                  <Clock className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : appointments.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-400">
                  No scheduled appointments registered.
                </div>
              ) : (
                <div className="space-y-4">
                  {appointments.map((appt) => (
                    <div 
                      key={appt.id} 
                      className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 bg-white/50 dark:bg-slate-950/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-300 hover:border-slate-300 dark:hover:border-slate-700"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider uppercase
                            ${appt.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                              appt.status === 'consultation' ? 'bg-teal-500/10 text-teal-500 border border-teal-500/20' : 
                              appt.status === 'checked_in' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 
                              appt.status === 'cancelled' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                              'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'}`}>
                            {appt.status.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold">ID: {appt.id.substring(0, 8)}...</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-350">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-semibold">Patient:</span> {appt.patient_name || `${appt.patient_first_name} ${appt.patient_last_name}`}
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-350">
                            <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-semibold">Doctor:</span> Dr. {appt.doctor_first_name} {appt.doctor_last_name}
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-655 dark:text-slate-400 col-span-2">
                            <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-semibold">Schedule:</span> {new Date(appt.date).toLocaleDateString()} @ {appt.start_time.substring(0, 5)} - {appt.end_time.substring(0, 5)}
                          </div>
                          {appt.reason && (
                            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-450 col-span-2">
                              <ClipboardList className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-semibold">Reason:</span> {appt.reason}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Controls depending on state */}
                      <div className="flex flex-wrap gap-2 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800/50 justify-end">
                        {appt.status === 'scheduled' && (
                          <>
                            {isStaff && (
                              <Button
                                onClick={() => handleStatusTransition(appt.id, 'checked_in')}
                                className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] h-8 px-3 font-semibold cursor-pointer"
                              >
                                Check In
                              </Button>
                            )}
                            <Button
                              onClick={() => handleCancelAppointment(appt.id)}
                              className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-500 rounded-xl text-[10px] h-8 px-3 font-semibold cursor-pointer"
                            >
                              Cancel
                            </Button>
                          </>
                        )}

                        {appt.status === 'checked_in' && isStaff && (
                          <Button
                            onClick={() => handleStatusTransition(appt.id, 'consultation')}
                            className="bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-[10px] h-8 px-3 font-semibold cursor-pointer"
                          >
                            <PlaySquare className="w-3.5 h-3.5 mr-1" /> Start Consult
                          </Button>
                        )}

                        {appt.status === 'consultation' && isStaff && (
                          <Button
                            onClick={() => handleStatusTransition(appt.id, 'completed')}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] h-8 px-3 font-semibold cursor-pointer"
                          >
                            <CheckCheck className="w-3.5 h-3.5 mr-1" /> Mark Complete
                          </Button>
                        )}
                        
                        {(appt.status === 'completed' || appt.status === 'cancelled') && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-550 italic font-semibold">Workflow Closed</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
      </div>
    </div>
  );
};
