import React, { useEffect, useState } from 'react';
import { api } from '@/api/endpoints';
import { useAuthStore } from '@/hooks/useAuthStore';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Plus, 
  FileHeart, 
  Clock, 
  ChevronRight, 
  FileUp, 
  Download,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

export const Patients: React.FC = () => {
  const { user } = useAuthStore();
  const role = user?.roles?.[0] || 'PATIENT';
  const isDoctor = ['ADMIN', 'DOCTOR'].includes(role);

  // States
  const [patients, setPatients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  
  // Modals / Forms
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showAddRecord, setShowAddRecord] = useState(false);
  
  // Form fields
  const [newPatient, setNewPatient] = useState({
    first_name: '',
    last_name: '',
    email: '',
    date_of_birth: '',
    gender: 'Male',
    blood_group: 'O+',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewPatient(prev => ({ ...prev, [name]: value }));
  };

  const [newRecord, setNewRecord] = useState({
    symptoms: '',
    diagnoses: '',
    treatment_plan: '',
    blood_pressure: '120/80',
    heart_rate: '72',
    temperature: '37.0',
    notes: '',
  });

  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const handleSelectPatient = async (patient: any) => {
    setSelectedPatient(patient);
    try {
      const recordsRes = await api.medicalRecords.list({ patient_id: patient.id });
      setMedicalRecords(recordsRes.data || []);
      const docRes = await api.documents.list({ patient_id: patient.id });
      setDocuments(docRes.data || []);
    } catch (e) {
      console.error('Failed to load patient clinical history', e);
    }
  };

  const fetchPatients = async (query = '') => {
    try {
      const response = await api.patients.list(query);
      setPatients(response.data || []);
      if (response.data && response.data.length > 0 && !selectedPatient) {
        handleSelectPatient(response.data[0]);
      }
    } catch (e) {
      toast.error('Failed to load patient records');
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPatients(search);
  };

  // Add Patient
  const handleAddPatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.patients.create(newPatient);
      toast.success('Patient registered successfully');
      setShowAddPatient(false);
      setNewPatient({
        first_name: '',
        last_name: '',
        email: '',
        date_of_birth: '',
        gender: 'Male',
        blood_group: 'O+',
      });
      fetchPatients(search);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to register patient');
    }
  };

  // Add Medical Record
  const handleAddRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    try {
      await api.medicalRecords.create({
        patient_id: selectedPatient.id,
        symptoms: newRecord.symptoms,
        diagnosis: newRecord.diagnoses,
        treatment_plan: newRecord.treatment_plan,
        vital_signs: {
          blood_pressure: newRecord.blood_pressure,
          heart_rate: newRecord.heart_rate ? parseInt(newRecord.heart_rate, 10) : undefined,
          temperature: newRecord.temperature ? parseFloat(newRecord.temperature) : undefined,
        },
        clinical_notes: newRecord.notes,
      });
      toast.success('EMR clinical record created successfully!');
      setShowAddRecord(false);
      setNewRecord({
        symptoms: '',
        diagnoses: '',
        treatment_plan: '',
        blood_pressure: '120/80',
        heart_rate: '72',
        temperature: '37.0',
        notes: '',
      });
      handleSelectPatient(selectedPatient);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create record');
    }
  };

  // Document Upload
  const handleDocumentUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !selectedPatient) {
      toast.error('Please choose a file to upload');
      return;
    }
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('patient_id', selectedPatient.id);
    formData.append('document_type', 'lab_report');

    try {
      await api.documents.upload(formData);
      toast.success('Medical document uploaded successfully!');
      setUploadFile(null);
      handleSelectPatient(selectedPatient);
    } catch (err: any) {
      toast.error('Failed to upload file');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:w-80">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search patients by name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs rounded-xl"
            />
          </div>
          <Button type="submit" className="bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs px-3 font-semibold cursor-pointer">
            Search
          </Button>
        </form>
        
        <Button 
          onClick={() => setShowAddPatient(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs py-2 font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/10"
        >
          <Plus className="w-4 h-4" /> Register Patient
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Patient Directory list */}
        <div className="lg:col-span-1">
          <Card className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Patient Registry</CardTitle>
              <CardDescription className="text-xs text-slate-550 dark:text-slate-400">Total: {patients.length} cases matching criteria</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {patients.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-450">
                  No records registered.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[550px] overflow-y-auto">
                  {patients.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleSelectPatient(p)}
                      className={`w-full text-left p-4 transition-all duration-300 flex items-center justify-between cursor-pointer
                        ${selectedPatient?.id === p.id 
                          ? 'bg-emerald-500/5 dark:bg-emerald-500/10 border-l-4 border-emerald-500' 
                          : 'hover:bg-slate-50/50 dark:hover:bg-slate-850/20 border-l-4 border-transparent'
                        }
                      `}
                    >
                      <div>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white">{p.first_name} {p.last_name}</h4>
                        <p className="text-[10px] text-slate-450 dark:text-slate-550 mt-1 truncate max-w-[180px]">{p.email}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Clinical worksheet */}
        <div className="lg:col-span-2 space-y-6">
          {selectedPatient ? (
            <>
              {/* Profile Card Summary */}
              <Card className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm">
                <CardContent className="p-6 flex flex-col md:flex-row justify-between gap-4">
                  <div className="space-y-2">
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">{selectedPatient.first_name} {selectedPatient.last_name}</h3>
                    <p className="text-xs text-slate-500">Registered Patient ID: <strong className="text-slate-700 dark:text-slate-300">{selectedPatient.id}</strong></p>
                    
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-2 text-xs">
                      <span className="text-slate-655 dark:text-slate-400">Gender: <strong className="text-slate-800 dark:text-slate-350">{selectedPatient.gender || 'Not specified'}</strong></span>
                      <span className="text-slate-655 dark:text-slate-400">DOB: <strong className="text-slate-800 dark:text-slate-350">{new Date(selectedPatient.date_of_birth).toLocaleDateString()}</strong></span>
                      <span className="text-slate-655 dark:text-slate-400">Blood Group: <strong className="text-rose-500 font-extrabold">{selectedPatient.blood_group || 'O+'}</strong></span>
                    </div>
                  </div>
                  
                  {isDoctor && (
                    <div className="flex flex-col md:items-end justify-center gap-2">
                      <Button 
                        onClick={() => setShowAddRecord(true)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs py-2 font-bold cursor-pointer shadow-lg shadow-emerald-500/10"
                      >
                        Add EMR Record
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Grid: EMR Timeline & Document Upload */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Clinical History Timeline */}
                <Card className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Clinical EMR History</CardTitle>
                    <CardDescription className="text-xs text-slate-550 dark:text-slate-450">Diagnostics and symptoms log timeline</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {medicalRecords.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-450">
                        No medical records added yet.
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                        {medicalRecords.map((rec) => (
                          <div key={rec.id} className="p-3 bg-slate-50 dark:bg-slate-850/40 rounded-xl border border-slate-150 dark:border-slate-850 space-y-1.5">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="font-bold text-emerald-500 flex items-center gap-1">
                                <FileHeart className="w-3 h-3" /> EMR File
                              </span>
                              <span className="text-slate-450 dark:text-slate-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {new Date(rec.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-slate-850 dark:text-slate-200">Diagnosis: {rec.diagnoses || 'General evaluation'}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Symptoms: {rec.symptoms}</p>
                            {rec.treatment_plan && (
                              <p className="text-[11px] text-slate-655 dark:text-slate-400 italic">Plan: {rec.treatment_plan}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Uploaded Documents */}
                <Card className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Clinical Scanner Reports</CardTitle>
                    <CardDescription className="text-xs text-slate-550 dark:text-slate-450">PDF scan documents storage</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Upload tool */}
                    <form onSubmit={handleDocumentUpload} className="flex gap-2">
                      <Input
                        type="file"
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-[10px] py-1 rounded-xl"
                      />
                      <Button type="submit" className="bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-[10px] px-3 font-semibold cursor-pointer">
                        <FileUp className="w-3.5 h-3.5" />
                      </Button>
                    </form>

                    {/* Doc list */}
                    {documents.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-450">
                        No report scanner files.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {documents.map((doc) => (
                          <div key={doc.id} className="p-2.5 bg-slate-50 dark:bg-slate-850/40 border border-slate-150 dark:border-slate-850 rounded-xl flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700 dark:text-slate-350 truncate max-w-[160px]">{doc.filename}</span>
                            <a 
                              href={`http://localhost:3000/api/documents/${doc.id}/download`} 
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 border border-slate-250 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

              </div>
            </>
          ) : (
            <Card className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm text-center py-12">
              <CardContent className="flex flex-col items-center justify-center gap-3">
                <AlertCircle className="w-8 h-8 text-slate-300" />
                <p className="text-xs text-slate-450">Choose a patient folder to review EMR charts.</p>
              </CardContent>
            </Card>
          )}
        </div>

      </div>

      {/* MODAL: REGISTER PATIENT */}
      {showAddPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <Card className="w-full max-w-md bg-slate-900 border-slate-800 rounded-2xl shadow-2xl relative">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">Patient Registration Form</CardTitle>
              <CardDescription className="text-xs text-slate-400">Initialize a new patient clinical profile file</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddPatientSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-300">First Name</label>
                    <Input
                      type="text"
                      name="first_name"
                      value={newPatient.first_name}
                      onChange={handleInputChange}
                      className="bg-slate-950/40 border-slate-800 text-white rounded-xl text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-300">Last Name</label>
                    <Input
                      type="text"
                      name="last_name"
                      value={newPatient.last_name}
                      onChange={handleInputChange}
                      className="bg-slate-950/40 border-slate-800 text-white rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Email Address</label>
                  <Input
                    type="email"
                    name="email"
                    value={newPatient.email}
                    onChange={handleInputChange}
                    className="bg-slate-950/40 border-slate-800 text-white rounded-xl text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Date of Birth</label>
                  <Input
                    type="date"
                    name="date_of_birth"
                    value={newPatient.date_of_birth}
                    onChange={handleInputChange}
                    onClick={(e) => e.currentTarget.showPicker?.()}
                    className="bg-slate-950/40 border-slate-800 text-white rounded-xl text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-300">Gender</label>
                    <select
                      name="gender"
                      value={newPatient.gender}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-300">Blood Group</label>
                    <select
                      name="blood_group"
                      value={newPatient.blood_group}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="A+">A+</option>
                      <option value="B+">B+</option>
                      <option value="O+">O+</option>
                      <option value="AB+">AB+</option>
                      <option value="A-">A-</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button 
                    type="button" 
                    onClick={() => setShowAddPatient(false)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl py-2 cursor-pointer font-bold"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2 cursor-pointer font-bold shadow-lg shadow-emerald-500/10"
                  >
                    Confirm Register
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL: ADD MEDICAL RECORD */}
      {showAddRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <Card className="w-full max-w-lg bg-slate-900 border-slate-800 rounded-2xl shadow-2xl relative">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">Add Clinical EMR File</CardTitle>
              <CardDescription className="text-xs text-slate-400">Record symptoms, diagnostic profiles, and clinical vitals</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddRecordSubmit} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Symptoms</label>
                  <Input
                    placeholder="Dry cough, fever, congestion..."
                    value={newRecord.symptoms}
                    onChange={(e) => setNewRecord(prev => ({ ...prev, symptoms: e.target.value }))}
                    className="bg-slate-950/40 border-slate-800 text-white rounded-xl text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Diagnoses</label>
                  <Input
                    placeholder="Acute Viral Bronchitis"
                    value={newRecord.diagnoses}
                    onChange={(e) => setNewRecord(prev => ({ ...prev, diagnoses: e.target.value }))}
                    className="bg-slate-950/40 border-slate-800 text-white rounded-xl text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Treatment Plan</label>
                  <Input
                    placeholder="Bed rest, continuous hydration..."
                    value={newRecord.treatment_plan}
                    onChange={(e) => setNewRecord(prev => ({ ...prev, treatment_plan: e.target.value }))}
                    className="bg-slate-950/40 border-slate-800 text-white rounded-xl text-xs"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-300">Blood Pressure</label>
                    <Input
                      placeholder="120/80"
                      value={newRecord.blood_pressure}
                      onChange={(e) => setNewRecord(prev => ({ ...prev, blood_pressure: e.target.value }))}
                      className="bg-slate-950/40 border-slate-800 text-white rounded-xl text-[10px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-300">Heart Rate (BPM)</label>
                    <Input
                      placeholder="72"
                      value={newRecord.heart_rate}
                      onChange={(e) => setNewRecord(prev => ({ ...prev, heart_rate: e.target.value }))}
                      className="bg-slate-950/40 border-slate-800 text-white rounded-xl text-[10px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-300">Temperature (°C)</label>
                    <Input
                      placeholder="37.0"
                      value={newRecord.temperature}
                      onChange={(e) => setNewRecord(prev => ({ ...prev, temperature: e.target.value }))}
                      className="bg-slate-950/40 border-slate-800 text-white rounded-xl text-[10px]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Additional Notes</label>
                  <Input
                    placeholder="Patient shows high compliance..."
                    value={newRecord.notes}
                    onChange={(e) => setNewRecord(prev => ({ ...prev, notes: e.target.value }))}
                    className="bg-slate-950/40 border-slate-800 text-white rounded-xl text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button 
                    type="button" 
                    onClick={() => setShowAddRecord(false)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl py-2 cursor-pointer font-bold"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2 cursor-pointer font-bold shadow-lg shadow-emerald-500/10"
                  >
                    Save EMR Record
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
