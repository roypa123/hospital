import React, { useEffect, useState } from 'react';
import { api } from '@/api/endpoints';
import { useAuthStore } from '@/hooks/useAuthStore';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  FileText, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Activity, 
  Pill, 
  User, 
  CalendarDays, 
  FileCheck2
} from 'lucide-react';
import { toast } from 'sonner';

export const Prescriptions: React.FC = () => {
  const { user } = useAuthStore();
  const role = user?.roles?.[0] || 'PATIENT';
  const isDoctor = role === 'DOCTOR' || role === 'ADMIN';
  const isPharmacist = role === 'PHARMACIST' || role === 'ADMIN';

  // Lists
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  
  // States
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form fields
  const [selectedPatient, setSelectedPatient] = useState('');
  const [selectedMedicine, setSelectedMedicine] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [duration, setDuration] = useState('');
  const [instructions, setInstructions] = useState('');
  const [itemsList, setItemsList] = useState<any[]>([]);

  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      const res = await api.prescriptions.list();
      setPrescriptions(res.data || []);
    } catch (e) {
      toast.error('Failed to load prescriptions list');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const patsRes = await api.patients.list();
      setPatients(patsRes.data || []);
      const medsRes = await api.medicines.list();
      setMedicines(medsRes.data || []);
    } catch (e) {
      console.error('Failed to load metadata', e);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
    fetchMetadata();
  }, []);

  const handleAddItem = () => {
    if (!selectedMedicine || !dosage || !frequency || !duration) {
      toast.error('Medication, dosage, frequency, and duration are required');
      return;
    }
    const medObj = medicines.find(m => m.id === selectedMedicine);
    if (!medObj) return;

    setItemsList(prev => [...prev, {
      medicine_id: selectedMedicine,
      name: medObj.name,
      dosage,
      frequency,
      duration,
      instructions
    }]);

    setSelectedMedicine('');
    setDosage('');
    setFrequency('');
    setDuration('');
    setInstructions('');
  };

  const handleRemoveItem = (index: number) => {
    setItemsList(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreatePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      toast.error('Please select a patient');
      return;
    }
    if (itemsList.length === 0) {
      toast.error('Please add at least one medication');
      return;
    }

    try {
      await api.prescriptions.create({
        patient_id: selectedPatient,
        items: itemsList
      });
      toast.success('Prescription created successfully!');
      setShowAddModal(false);
      setSelectedPatient('');
      setItemsList([]);
      fetchPrescriptions();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create prescription');
    }
  };

  const handleDispensePrescription = async (id: string) => {
    try {
      await api.prescriptions.dispense(id);
      toast.success('Prescription dispensed and inventory adjusted');
      fetchPrescriptions();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to dispense prescription');
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Medical Prescriptions Registry</h2>
        <div className="flex gap-2">
          <button 
            onClick={fetchPrescriptions} 
            className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors cursor-pointer text-slate-550"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {isDoctor && (
            <Button 
              onClick={() => setShowAddModal(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs py-2 font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/10"
            >
              <Plus className="w-4 h-4" /> Write Prescription
            </Button>
          )}
        </div>
      </div>

      {/* Grid of Prescriptions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && prescriptions.length === 0 ? (
          <div className="col-span-full flex justify-center py-12">
            <Activity className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="col-span-full text-center py-12 text-xs text-slate-450">
            No medical prescriptions logged in file.
          </div>
        ) : (
          prescriptions.map((pres) => (
            <Card key={pres.id} className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm flex flex-col justify-between transition-all duration-300 hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider
                      ${pres.status === 'dispensed' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                      {pres.status}
                    </span>
                    <CardTitle className="text-xs font-bold text-slate-900 dark:text-white pt-1">ID: {pres.id.substring(0, 8)}...</CardTitle>
                  </div>
                  <FileText className="w-5 h-5 text-slate-400" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pb-4">
                <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-350">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold">Patient:</span> {pres.patient_name || `${pres.patient_first_name} ${pres.patient_last_name}`}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold">Doctor:</span> Dr. {pres.doctor_first_name} {pres.doctor_last_name}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold">Issued:</span> {new Date(pres.created_at || pres.timestamp).toLocaleDateString()}
                  </div>
                </div>

                {/* Items */}
                <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2 space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Medications</p>
                  <div className="space-y-1 text-xs">
                    {pres.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-slate-655 dark:text-slate-400 bg-slate-50 dark:bg-slate-850/45 px-2.5 py-1.5 rounded-xl border border-slate-150/40 dark:border-slate-850">
                        <span className="font-bold flex items-center gap-1"><Pill className="w-3 h-3 text-slate-400" /> {item.medicine_name || item.name}</span>
                        <span className="text-[10px] text-slate-450">{item.dosage} • {item.frequency}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>

              {/* Action for pharmacists */}
              {isPharmacist && pres.status === 'pending' && (
                <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/30 dark:bg-slate-950/20">
                  <Button 
                    onClick={() => handleDispensePrescription(pres.id)}
                    className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <FileCheck2 className="w-4 h-4" /> Dispense Stock
                  </Button>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* MODAL: ADD PRESCRIPTION */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <Card className="w-full max-w-xl bg-slate-900 border-slate-800 rounded-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">New Clinical Prescription File</CardTitle>
              <CardDescription className="text-xs text-slate-400">Add medications and configure dosages</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreatePrescription} className="space-y-4 text-xs">
                {/* Select Patient */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-350">Select Patient Profile</label>
                  <select
                    value={selectedPatient}
                    onChange={(e) => setSelectedPatient(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  >
                    <option value="">Choose Patient</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.email})</option>
                    ))}
                  </select>
                </div>

                {/* Add Medication row */}
                <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-2xl space-y-3">
                  <p className="font-bold text-[10px] text-slate-450 uppercase tracking-wider flex items-center gap-1"><Pill className="w-3.5 h-3.5" /> Add Drug Row</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-400">Medicine</label>
                      <select
                        value={selectedMedicine}
                        onChange={(e) => setSelectedMedicine(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl focus:outline-none"
                      >
                        <option value="">Select Drug</option>
                        {medicines.map(m => (
                          <option key={m.id} value={m.id}>{m.name} (Stock: {m.stock_quantity})</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-400">Dosage</label>
                      <Input
                        placeholder="500mg, 1 tablet..."
                        value={dosage}
                        onChange={(e) => setDosage(e.target.value)}
                        className="bg-slate-950/40 border-slate-800 text-white rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-400">Frequency</label>
                      <Input
                        placeholder="Twice daily, every 8 hours..."
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value)}
                        className="bg-slate-950/40 border-slate-800 text-white rounded-xl text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-400">Duration</label>
                      <Input
                        placeholder="5 days, 1 week..."
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="bg-slate-950/40 border-slate-800 text-white rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <Button 
                    type="button"
                    onClick={handleAddItem}
                    className="w-full bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs py-1.5 rounded-xl cursor-pointer"
                  >
                    Add Row to Bill
                  </Button>
                </div>

                {/* Items List added */}
                {itemsList.length > 0 && (
                  <div className="space-y-2">
                    <p className="font-bold text-[10px] text-slate-450 uppercase tracking-wider">Medications Added</p>
                    <div className="space-y-1.5">
                      {itemsList.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-slate-950/60 border border-slate-800 px-3 py-2 rounded-xl text-xs">
                          <div>
                            <span className="font-bold text-white">{item.name}</span>
                            <span className="text-[10px] text-slate-450 block">{item.dosage} • {item.frequency} for {item.duration}</span>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <Button 
                    type="button" 
                    onClick={() => setShowAddModal(false)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl py-2 cursor-pointer font-bold"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2 cursor-pointer font-bold shadow-lg shadow-emerald-500/10"
                  >
                    Sign Prescription
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
};
