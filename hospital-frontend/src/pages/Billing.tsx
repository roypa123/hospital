import React, { useEffect, useState } from 'react';
import { api } from '@/api/endpoints';
import { useAuthStore } from '@/hooks/useAuthStore';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  CreditCard, 
  Plus, 
  Activity, 
  User, 
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';

export const Billing: React.FC = () => {
  const { user } = useAuthStore();
  const role = user?.roles?.[0] || 'PATIENT';
  const isCashier = role === 'CASHIER' || role === 'ADMIN';

  // Lists
  const [invoices, setInvoices] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'invoices' | 'claims'>('invoices');

  // Loading
  const [loading, setLoading] = useState(false);
  
  // Modals
  const [showAddInvoice, setShowAddInvoice] = useState(false);
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [claimingInvoiceId, setClaimingInvoiceId] = useState<string | null>(null);

  // Form Fields
  const [selectedPatient, setSelectedPatient] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.billing.listInvoices();
      setInvoices(res.data || []);
    } catch (e) {
      toast.error('Failed to load invoices catalog');
    } finally {
      setLoading(false);
    }
  };

  const fetchClaims = async () => {
    try {
      const res = await api.insurance.listClaims();
      setClaims(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMetadata = async () => {
    try {
      const patsRes = await api.patients.list();
      setPatients(patsRes.data || []);
      const provsRes = await api.insurance.getProviders();
      setProviders(provsRes.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchClaims();
    fetchMetadata();
  }, []);

  const handleCreateInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !amount) {
      toast.error('Patient and amount are required');
      return;
    }

    try {
      await api.billing.createInvoice({
        patient_id: selectedPatient,
        items: [
          {
            item_name: description || 'General Medical Service',
            item_type: 'other',
            unit_price: parseFloat(amount),
            quantity: 1
          }
        ]
      });
      toast.success('Invoice created successfully');
      setShowAddInvoice(false);
      setSelectedPatient('');
      setAmount('');
      setDescription('');
      fetchInvoices();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create invoice');
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInvoiceId) return;

    const invoice = invoices.find(i => i.id === payingInvoiceId);
    if (!invoice) {
      toast.error('Invoice details not found');
      return;
    }

    const balance = parseFloat(invoice.net_amount) - parseFloat(invoice.paid_amount || '0');
    if (balance <= 0) {
      toast.error('This invoice has already been fully paid');
      return;
    }

    let mappedMethod = paymentMethod;
    if (paymentMethod === 'upi' || paymentMethod === 'net_banking') {
      mappedMethod = 'bank_transfer';
    }

    try {
      await api.billing.payInvoice(payingInvoiceId, {
        amount: balance,
        payment_method: mappedMethod
      });
      toast.success('Payment completed successfully!');
      setPayingInvoiceId(null);
      fetchInvoices();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Payment simulation failed');
    }
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimingInvoiceId || !selectedProvider || !policyNumber) {
      toast.error('Provider and policy number are required');
      return;
    }

    try {
      await api.insurance.createClaim({
        invoice_id: claimingInvoiceId,
        provider_id: selectedProvider,
        policy_number: policyNumber,
        claimed_amount: parseFloat(invoices.find(i => i.id === claimingInvoiceId)?.total_amount || '0')
      });
      toast.success('Insurance claim filed successfully!');
      setClaimingInvoiceId(null);
      setSelectedProvider('');
      setPolicyNumber('');
      fetchClaims();
      fetchInvoices();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to file claim');
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs / Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white/50 dark:bg-slate-900/40 p-1">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer
              ${activeTab === 'invoices' 
                ? 'bg-slate-850 dark:bg-slate-800 text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'}`}
          >
            Invoices & Payments
          </button>
          <button
            onClick={() => setActiveTab('claims')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer
              ${activeTab === 'claims' 
                ? 'bg-slate-850 dark:bg-slate-800 text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'}`}
          >
            Insurance Claims
          </button>
        </div>

        {activeTab === 'invoices' && isCashier && (
          <Button 
            onClick={() => setShowAddInvoice(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs py-2 font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/10"
          >
            <Plus className="w-4 h-4" /> Create Invoice
          </Button>
        )}
      </div>

      {/* RENDER INVOICES */}
      {activeTab === 'invoices' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading && invoices.length === 0 ? (
            <div className="col-span-full flex justify-center py-12">
              <Activity className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="col-span-full text-center py-12 text-xs text-slate-455">
              No bills or invoices logged in file.
            </div>
          ) : (
            invoices.map((inv) => (
              <Card key={inv.id} className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm flex flex-col justify-between transition-all duration-300 hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[8px] font-extrabold tracking-wider uppercase
                        ${inv.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                          inv.status === 'partially_paid' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 
                          'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'}`}>
                        {inv.status.replace('_', ' ')}
                      </span>
                      <CardTitle className="text-xs font-bold text-slate-900 dark:text-white pt-1">Invoice ID: {inv.id.substring(0, 8)}...</CardTitle>
                    </div>
                    <CreditCard className="w-5 h-5 text-slate-400" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pb-4">
                  <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-350">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold">Patient:</span> {inv.patient_name || `${inv.patient_first_name} ${inv.patient_last_name}`}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold">Amount:</span> <strong className="text-emerald-500 dark:text-emerald-450">${parseFloat(inv.total_amount).toLocaleString()}</strong>
                    </div>
                    {inv.description && (
                      <p className="text-[11px] text-slate-500 mt-1 truncate max-w-[200px]">Desc: {inv.description}</p>
                    )}
                  </div>
                </CardContent>

                {/* Actions */}
                {inv.status !== 'paid' && (
                  <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/30 dark:bg-slate-950/20 flex gap-2">
                    <Button 
                      onClick={() => setPayingInvoiceId(inv.id)}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                    >
                      Pay Bill
                    </Button>
                    {role === 'PATIENT' && (
                      <Button 
                        onClick={() => setClaimingInvoiceId(inv.id)}
                        className="flex-1 bg-slate-800 hover:bg-slate-750 border border-slate-750 text-slate-200 font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                      >
                        Claim Insurance
                      </Button>
                    )}
                  </div>
                )}
                {inv.status === 'paid' && (
                  <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/30 dark:bg-slate-950/20 text-center">
                    <span className="text-[10px] text-emerald-500 font-bold italic">Transaction Settled</span>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      )}

      {/* RENDER CLAIMS */}
      {activeTab === 'claims' && (
        <Card className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm">
          <CardContent className="p-0">
            {claims.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-450">
                No active insurance claims logged.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-150 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Claim ID</th>
                      <th className="py-3 px-4">Provider</th>
                      <th className="py-3 px-4">Policy #</th>
                      <th className="py-3 px-4">Amount Claimed</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {claims.map((claim) => (
                      <tr key={claim.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-855/20 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-350">{claim.id.substring(0, 8)}...</td>
                        <td className="py-3.5 px-4 text-slate-900 dark:text-white font-medium">{claim.provider_name}</td>
                        <td className="py-3.5 px-4 text-slate-655 dark:text-slate-400">{claim.policy_number}</td>
                        <td className="py-3.5 px-4 font-bold text-emerald-500">${parseFloat(claim.claimed_amount).toLocaleString()}</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase
                            ${claim.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                              claim.status === 'rejected' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 
                              'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                            {claim.status}
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
      )}

      {/* MODAL: CREATE INVOICE */}
      {showAddInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <Card className="w-full max-w-md bg-slate-900 border-slate-800 rounded-2xl shadow-2xl relative">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">Generate Bill Invoice</CardTitle>
              <CardDescription className="text-xs text-slate-400">Initialize a new financial receipt record</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateInvoiceSubmit} className="space-y-4 text-xs">
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
                  <label className="font-bold text-slate-350">Total Amount ($)</label>
                  <Input
                    type="number"
                    placeholder="150"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-slate-950/40 border-slate-800 text-white rounded-xl text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-350">Billing Details / Description</label>
                  <Input
                    placeholder="General consultation & lab diagnostics checkout..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-slate-950/40 border-slate-800 text-white rounded-xl text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button 
                    type="button" 
                    onClick={() => setShowAddInvoice(false)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl py-2 cursor-pointer font-bold"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2 cursor-pointer font-bold shadow-lg shadow-emerald-500/10"
                  >
                    Generate Invoice
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL: PAY INVOICE */}
      {payingInvoiceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <Card className="w-full max-w-sm bg-slate-900 border-slate-800 rounded-2xl shadow-2xl relative">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">Simulate Payment Checkout</CardTitle>
              <CardDescription className="text-xs text-slate-400">Complete transaction securely</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePaymentSubmit} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-350">Payment Channel</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="card">Card Payment</option>
                    <option value="upi">UPI Transfer</option>
                    <option value="cash">Cash Counter</option>
                    <option value="net_banking">Net Banking</option>
                    <option value="insurance">Insurance Adjuster</option>
                  </select>
                </div>

                <Button 
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                >
                  Confirm & Authorize Payment
                </Button>
                
                <Button 
                  type="button" 
                  onClick={() => setPayingInvoiceId(null)}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl py-2 cursor-pointer font-bold"
                >
                  Cancel
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL: INSURANCE CLAIM */}
      {claimingInvoiceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <Card className="w-full max-w-md bg-slate-900 border-slate-800 rounded-2xl shadow-2xl relative">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">File Insurance Claim</CardTitle>
              <CardDescription className="text-xs text-slate-400">Submit invoice details to linked claims adjuster</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleClaimSubmit} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-350">Provider</label>
                  <select
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  >
                    <option value="">Select Provider</option>
                    {providers.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-350">Policy Reference Number</label>
                  <Input
                    placeholder="POL-9988776655"
                    value={policyNumber}
                    onChange={(e) => setPolicyNumber(e.target.value)}
                    className="bg-slate-950/40 border-slate-800 text-white rounded-xl text-xs"
                    required
                  />
                </div>

                <Button 
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                >
                  Submit Claim Request
                </Button>
                
                <Button 
                  type="button" 
                  onClick={() => setClaimingInvoiceId(null)}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl py-2 cursor-pointer font-bold"
                >
                  Cancel
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
};
