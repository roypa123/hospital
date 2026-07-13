import React, { useEffect, useState } from 'react';
import { api } from '@/api/endpoints';
import { useAuthStore } from '@/hooks/useAuthStore';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  FlaskConical, 
  Plus, 
  CheckCircle, 
  Upload, 
  Activity, 
  User, 
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

export const Laboratory: React.FC = () => {
  const { user } = useAuthStore();
  const role = user?.roles?.[0] || 'PATIENT';
  const isTechnician = role === 'LAB_TECHNICIAN' || role === 'ADMIN';
  const isDoctor = role === 'DOCTOR' || role === 'ADMIN';

  // Lists
  const [labTests, setLabTests] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  
  // Loading
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Add test form fields
  const [selectedPatient, setSelectedPatient] = useState('');
  const [testName, setTestName] = useState('');
  const [category, setCategory] = useState('Blood Test');
  const [description, setDescription] = useState('');
  
  // Upload results fields
  const [uploadedTestId, setUploadedTestId] = useState<string | null>(null);
  const [resultText, setResultText] = useState('');

  const fetchLabTests = async () => {
    setLoading(true);
    try {
      const res = await api.laboratory.list();
      setLabTests(res.data || []);
    } catch (e) {
      toast.error('Failed to load laboratory reports');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await api.patients.list();
      setPatients(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchLabTests();
    fetchPatients();
  }, []);

  const handleRequestTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !testName) {
      toast.error('Patient and test name are required');
      return;
    }

    try {
      await api.laboratory.requestTest({
        patient_id: selectedPatient,
        test_name: testName,
        category
      });
      toast.success('Lab test requested successfully');
      setShowAddModal(false);
      setSelectedPatient('');
      setTestName('');
      setCategory('Blood Test');
      setDescription('');
      fetchLabTests();
    } catch (err: any) {
      toast.error('Failed to request test');
    }
  };

  const handleUploadResultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedTestId || !resultText) {
      toast.error('Result report text is required');
      return;
    }

    try {
      await api.laboratory.uploadResult(uploadedTestId, {
        results_summary: resultText,
        findings: resultText
      });
      toast.success('Test results uploaded successfully');
      setUploadedTestId(null);
      setResultText('');
      fetchLabTests();
    } catch (err: any) {
      toast.error('Failed to upload results');
    }
  };

  const handleApproveTest = async (id: string) => {
    try {
      await api.laboratory.approveTest(id);
      toast.success('Lab report reviewed and approved');
      fetchLabTests();
    } catch (err: any) {
      toast.error('Failed to approve report');
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Lab Diagnostics Registry</h2>
        {isDoctor && (
          <Button 
            onClick={() => setShowAddModal(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs py-2 font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/10"
          >
            <Plus className="w-4 h-4" /> Request Lab Test
          </Button>
        )}
      </div>

      {/* Grid of Lab Tests */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && labTests.length === 0 ? (
          <div className="col-span-full flex justify-center py-12">
            <Activity className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : labTests.length === 0 ? (
          <div className="col-span-full text-center py-12 text-xs text-slate-455">
            No active laboratory entries scheduled in file.
          </div>
        ) : (
          labTests.map((test) => (
            <Card key={test.id} className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm flex flex-col justify-between transition-all duration-300 hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[8px] font-extrabold tracking-wider uppercase
                      ${test.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                        test.status === 'completed' ? 'bg-teal-500/10 text-teal-500 border border-teal-500/20' : 
                        'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                      {test.status}
                    </span>
                    <CardTitle className="text-xs font-extrabold text-slate-900 dark:text-white pt-1">{test.test_name}</CardTitle>
                  </div>
                  <FlaskConical className="w-5 h-5 text-slate-400" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pb-4">
                <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-350">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold">Patient:</span> {test.patient_name || `${test.patient_first_name} ${test.patient_last_name}`}
                  </div>
                  {test.description && (
                    <div className="flex items-start gap-1.5 text-slate-500">
                      <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <span className="truncate max-w-[200px]">{test.description}</span>
                    </div>
                  )}
                </div>

                {/* Show details / result if present */}
                {test.results_summary && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-850/45 border border-slate-150 dark:border-slate-850 rounded-xl space-y-1">
                    <p className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Report Results</p>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-semibold italic">"{test.results_summary}"</p>
                  </div>
                )}
              </CardContent>

              {/* Action depending on roles */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/30 dark:bg-slate-950/20 flex gap-2">
                {test.status === 'requested' && isTechnician && (
                  <Button 
                    onClick={() => setUploadedTestId(test.id)}
                    className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload Results
                  </Button>
                )}

                {test.status === 'completed' && isDoctor && (
                  <Button 
                    onClick={() => handleApproveTest(test.id)}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Approve Report
                  </Button>
                )}
                
                {test.status === 'approved' && (
                  <span className="text-[10px] text-emerald-500 font-bold italic w-full text-center">Report Approved & Signed</span>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* MODAL: REQUEST LAB TEST */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <Card className="w-full max-w-md bg-slate-900 border-slate-800 rounded-2xl shadow-2xl relative">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">Request Laboratory Report</CardTitle>
              <CardDescription className="text-xs text-slate-400">Order a diagnostics test for a patient</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRequestTest} className="space-y-4 text-xs">
                {/* Select Patient */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-350">Select Patient</label>
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

                <div className="space-y-1">
                  <label className="font-bold text-slate-350">Test Name</label>
                  <Input
                    placeholder="Complete Blood Count (CBC), Lipid Profile..."
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                    className="bg-slate-950/40 border-slate-800 text-white rounded-xl text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-350">Test Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  >
                    <option value="Blood Test">Blood Test</option>
                    <option value="Urine Test">Urine Test</option>
                    <option value="X-Ray">X-Ray</option>
                    <option value="MRI">MRI</option>
                    <option value="CT Scan">CT Scan</option>
                    <option value="ECG">ECG</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-350">Clinical Instructions / Details</label>
                  <Input
                    placeholder="Check platelet counts and hemoglobin levels..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-slate-950/40 border-slate-800 text-white rounded-xl text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
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
                    Send Request
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL: UPLOAD RESULTS */}
      {uploadedTestId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <Card className="w-full max-w-md bg-slate-900 border-slate-800 rounded-2xl shadow-2xl relative">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">Upload Diagnostics Result</CardTitle>
              <CardDescription className="text-xs text-slate-400">Input findings and parameters for this patient file</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUploadResultSubmit} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-350">Result Parameters / Details</label>
                  <textarea
                    rows={4}
                    placeholder="Hemoglobin: 14.2 g/dL (Normal), WBC: 6,800 /uL, Platelets: 240,000 /uL"
                    value={resultText}
                    onChange={(e) => setResultText(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button 
                    type="button" 
                    onClick={() => setUploadedTestId(null)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl py-2 cursor-pointer font-bold"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2 cursor-pointer font-bold shadow-lg shadow-emerald-500/10"
                  >
                    Publish Results
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
