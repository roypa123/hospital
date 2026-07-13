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
  DollarSign,
  Trash2
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
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');

  // Multi-item Billing states
  const [invoiceItems, setInvoiceItems] = useState<{ item_name: string; item_type: string; unit_price: string; quantity: string }[]>([
    { item_name: '', item_type: 'consultation', unit_price: '', quantity: '1' }
  ]);

  const handleAddItem = () => {
    setInvoiceItems(prev => [...prev, { item_name: '', item_type: 'other', unit_price: '', quantity: '1' }]);
  };

  const handleRemoveItem = (index: number) => {
    if (invoiceItems.length === 1) return;
    setInvoiceItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateItem = (index: number, key: string, value: string) => {
    setInvoiceItems(prev => prev.map((item, idx) => idx === index ? { ...item, [key]: value } : item));
  };

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
    if (!selectedPatient) {
      toast.error('Patient selection is required');
      return;
    }

    const invalidItem = invoiceItems.find(item => !item.item_name || !item.unit_price || parseFloat(item.unit_price) <= 0);
    if (invalidItem) {
      toast.error('All items must have a valid name and positive price value');
      return;
    }

    try {
      await api.billing.createInvoice({
        patient_id: selectedPatient,
        items: invoiceItems.map(item => ({
          item_name: item.item_name,
          item_type: item.item_type,
          unit_price: parseFloat(item.unit_price),
          quantity: parseInt(item.quantity, 10) || 1
        }))
      });
      toast.success('Invoice created successfully');
      setShowAddInvoice(false);
      setSelectedPatient('');
      setInvoiceItems([{ item_name: '', item_type: 'consultation', unit_price: '', quantity: '1' }]);
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

    const isRazorpayMethod = ['card', 'upi', 'net_banking'].includes(paymentMethod);

    if (isRazorpayMethod) {
      try {
        toast.info('Initializing Razorpay secure portal...');
        const orderRes = await api.billing.createRazorpayOrder(payingInvoiceId);
        const order = orderRes.data;

        if (order.id && order.id.startsWith('order_mock_')) {
          // Mock Simulation
          toast.info('Simulating local sandbox payment signature...');
          const mockPaymentId = `pay_mock_${Date.now()}`;
          await api.billing.verifyRazorpayPayment(payingInvoiceId, {
            razorpay_order_id: order.id,
            razorpay_payment_id: mockPaymentId,
            razorpay_signature: 'mock_sig_pass',
          });
          toast.success('Mock Razorpay checkout verified successfully!');
          setPayingInvoiceId(null);
          fetchInvoices();
          return;
        }

        // Live Razorpay Flow
        const loaded = await new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.body.appendChild(script);
        });

        if (!loaded) {
          toast.error('Failed to load Razorpay checkout script');
          return;
        }

        const options = {
          key: order.key_id || 'rzp_test_mock_key_id',
          amount: order.amount,
          currency: order.currency,
          name: 'Aura Health',
          description: `Invoice Payment - ${invoice.id.substring(0, 8)}`,
          order_id: order.id,
          handler: async (response: any) => {
            try {
              await api.billing.verifyRazorpayPayment(payingInvoiceId, {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              toast.success('Razorpay payment verified & completed successfully!');
              setPayingInvoiceId(null);
              fetchInvoices();
            } catch (err: any) {
              toast.error(err.response?.data?.message || 'Signature validation failed');
            }
          },
          prefill: {
            name: `${user?.first_name} ${user?.last_name}`,
            email: user?.email,
          },
          theme: {
            color: '#10b981',
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Razorpay initialization failed');
      }
    } else {
      // Cash & Manual flows
      try {
        await api.billing.payInvoice(payingInvoiceId, {
          amount: balance,
          payment_method: paymentMethod
        });
        toast.success('Manual payment recorded successfully!');
        setPayingInvoiceId(null);
        fetchInvoices();
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Payment recording failed');
      }
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

  const handlePrintGstBill = async (invoiceId: string) => {
    try {
      toast.info('Fetching invoice details for receipt...');
      const res = await api.billing.getInvoice(invoiceId);
      const inv = res.data;

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Pop-up blocker prevented opening receipt window');
        return;
      }

      const cgst = parseFloat(inv.tax_amount || 0) / 2;
      const sgst = parseFloat(inv.tax_amount || 0) / 2;
      const total = parseFloat(inv.total_amount || 0);
      const discount = parseFloat(inv.discount_amount || 0);
      const net = parseFloat(inv.net_amount || 0);
      const paid = parseFloat(inv.paid_amount || 0);

      const itemsHtml = (inv.items || []).map((item: any, idx: number) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px; text-align: left;">${idx + 1}</td>
          <td style="padding: 10px; text-align: left;">
            <div style="font-weight: bold; color: #1e293b;">${item.item_name}</div>
            <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">${item.item_type}</div>
          </td>
          <td style="padding: 10px; text-align: right;">$${parseFloat(item.unit_price).toFixed(2)}</td>
          <td style="padding: 10px; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px; text-align: right; font-weight: bold;">$${parseFloat(item.total_price).toFixed(2)}</td>
        </tr>
      `).join('');

      const paymentsHtml = (inv.payments || []).map((p: any) => `
        <div style="display: flex; justify-content: space-between; font-size: 11px; color: #475569; margin-top: 4px;">
          <span>Transaction ref: ${p.transaction_reference} (${p.payment_method.toUpperCase()})</span>
          <span>Paid: $${parseFloat(p.amount).toFixed(2)}</span>
        </div>
      `).join('') || '<div style="font-size: 11px; color: #64748b; font-style: italic;">No payment logs recorded yet.</div>';

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>GST Invoice - Aura Health</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #334155; margin: 0; padding: 40px; }
            .invoice-card { max-width: 800px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 30px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 20px; }
            .brand-title { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; }
            .brand-gstin { font-size: 11px; font-weight: 700; color: #0ea5e9; margin-top: 4px; }
            .details { display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 13px; }
            .details h4 { margin: 0 0 6px 0; color: #64748b; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
            .details p { margin: 0; font-weight: 600; color: #1e293b; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; }
            th { background: #f8fafc; color: #64748b; font-weight: 700; padding: 12px 10px; text-transform: uppercase; font-size: 10px; }
            .summary { display: flex; justify-content: flex-end; margin-bottom: 30px; }
            .summary-table { width: 300px; font-size: 13px; }
            .summary-table tr td { padding: 6px 10px; }
            .summary-table tr.total td { font-size: 16px; font-weight: 800; color: #0f172a; border-top: 2px solid #f1f5f9; }
            .footer { border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 40px; font-size: 11px; color: #94a3b8; text-align: center; }
            @media print {
              body { padding: 0; }
              .invoice-card { border: none; box-shadow: none; padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div style="max-width: 800px; margin: 0 auto 15px auto; display: flex; justify-content: flex-end;" class="no-print">
            <button onclick="window.print()" style="background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 6px;">
              Print / Save PDF
            </button>
          </div>
          <div class="invoice-card">
            <div class="header">
              <div>
                <h1 class="brand-title">AURA HEALTH CLINIC</h1>
                <div class="brand-gstin">GSTIN: ${inv.hospital_gstin || '29AAAAA1111A1Z1'}</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 12px; font-weight: bold; color: #94a3b8; text-transform: uppercase;">TAX INVOICE</div>
                <div style="font-size: 16px; font-weight: bold; color: #0f172a; margin-top: 4px;">#INV-${inv.id.substring(0, 8).toUpperCase()}</div>
              </div>
            </div>

            <div class="details">
              <div>
                <h4>Patient Information</h4>
                <p>${inv.patient_first_name} ${inv.patient_last_name}</p>
                <p style="font-size: 11px; font-weight: 500; color: #64748b; margin-top: 2px;">${inv.patient_email || ''}</p>
              </div>
              <div style="text-align: right;">
                <h4>Billing Timestamps</h4>
                <p>Date: ${new Date(inv.created_at).toLocaleDateString()}</p>
                <p style="font-size: 11px; font-weight: 500; color: #64748b; margin-top: 2px;">Status: <span style="color: ${inv.status === 'paid' ? '#10b981' : '#f59e0b'}; font-weight: bold; text-transform: uppercase;">${inv.status}</span></p>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 5%; text-align: left;">#</th>
                  <th style="width: 55%; text-align: left;">Service Description</th>
                  <th style="width: 15%; text-align: right;">Unit Price</th>
                  <th style="width: 10%; text-align: center;">Qty</th>
                  <th style="width: 15%; text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 20px;">
              <div style="flex: 1; border: 1px solid #f1f5f9; padding: 15px; border-radius: 12px; background: #fafafa;">
                <h4 style="margin: 0 0 10px 0; font-size: 10px; color: #64748b; text-transform: uppercase;">Transaction Receipts</h4>
                ${paymentsHtml}
              </div>

              <div class="summary">
                <table class="summary-table">
                  <tr>
                    <td style="color: #64748b;">Subtotal</td>
                    <td style="text-align: right; font-weight: bold;">$${total.toFixed(2)}</td>
                  </tr>
                  ${discount > 0 ? `
                  <tr>
                    <td style="color: #64748b;">Discount</td>
                    <td style="text-align: right; font-weight: bold; color: #ef4444;">-$${discount.toFixed(2)}</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="color: #64748b;">CGST (2.5%)</td>
                    <td style="text-align: right; font-weight: bold;">$${cgst.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b;">SGST (2.5%)</td>
                    <td style="text-align: right; font-weight: bold;">$${sgst.toFixed(2)}</td>
                  </tr>
                  <tr class="total">
                    <td>Total Due</td>
                    <td style="text-align: right;">$${net.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="color: #10b981; font-weight: 700;">Paid Amount</td>
                    <td style="text-align: right; font-weight: 700; color: #10b981;">$${paid.toFixed(2)}</td>
                  </tr>
                </table>
              </div>
            </div>

            <div class="footer">
              <p>Thank you for choosing Aura Health Clinic. Wish you a speedy recovery!</p>
              <p style="font-size: 9px; margin-top: 4px; color: #cbd5e1;">This is a computer generated document and does not require signature.</p>
            </div>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
    } catch (e: any) {
      toast.error('Failed to prepare invoice print document');
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
                  <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/30 dark:bg-slate-950/20 flex flex-col gap-2">
                    <div className="text-center">
                      <span className="text-[10px] text-emerald-500 font-bold italic">Transaction Settled</span>
                    </div>
                    <Button 
                      onClick={() => handlePrintGstBill(inv.id)}
                      className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[10px] py-1.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                    >
                      Print GST Bill (PDF)
                    </Button>
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

                {/* Dynamic Bill Items */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-slate-350">Line Items</label>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add Item
                    </button>
                  </div>

                  <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                    {invoiceItems.map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl space-y-2 relative">
                        {invoiceItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="absolute right-2 top-2 text-rose-500 hover:text-rose-400 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">Item Name</label>
                          <Input
                            placeholder="Consultation, Amoxicillin 500mg, etc..."
                            value={item.item_name}
                            onChange={(e) => handleUpdateItem(idx, 'item_name', e.target.value)}
                            className="bg-slate-900 border-slate-800 text-white rounded-lg text-xs"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1 col-span-1">
                            <label className="text-[10px] font-bold text-slate-500">Type</label>
                            <select
                              value={item.item_type}
                              onChange={(e) => handleUpdateItem(idx, 'item_type', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 text-slate-300 text-[10px] rounded-lg focus:outline-none"
                            >
                              <option value="consultation">Consultation</option>
                              <option value="lab_test">Lab Test</option>
                              <option value="pharmacy">Pharmacy</option>
                              <option value="other">Other</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">Price ($)</label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="50"
                              value={item.unit_price}
                              onChange={(e) => handleUpdateItem(idx, 'unit_price', e.target.value)}
                              className="bg-slate-900 border-slate-800 text-white rounded-lg text-xs"
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">Qty</label>
                            <Input
                              type="number"
                              placeholder="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(idx, 'quantity', e.target.value)}
                              className="bg-slate-900 border-slate-800 text-white rounded-lg text-xs"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total Summary */}
                <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex justify-between items-center">
                  <span className="font-bold text-slate-450">Invoice Net Amount:</span>
                  <span className="text-sm font-extrabold text-emerald-400">
                    ${invoiceItems.reduce((acc, curr) => acc + (parseFloat(curr.unit_price || '0') * (parseInt(curr.quantity || '1', 10) || 1)), 0).toFixed(2)}
                  </span>
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
