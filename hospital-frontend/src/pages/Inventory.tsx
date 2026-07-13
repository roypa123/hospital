import React, { useEffect, useState } from 'react';
import { api } from '@/api/endpoints';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Package, 
  Activity, 
  Search, 
  AlertTriangle,
  Pill
} from 'lucide-react';
import { toast } from 'sonner';

export const Inventory: React.FC = () => {
  // Lists
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);
  
  // Modals / Actions
  const [adjustingMedId, setAdjustingMedId] = useState<string | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [adjustType, setAdjustType] = useState<'ADD' | 'SUBTRACT'>('ADD');

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await api.medicines.list();
      setMedicines(res.data || []);
    } catch (e) {
      toast.error('Failed to load pharmacy inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleAdjustStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingMedId || !adjustQuantity) {
      toast.error('Please enter adjustment quantity');
      return;
    }

    const qty = parseInt(adjustQuantity);
    const finalQty = adjustType === 'ADD' ? qty : -qty;

    try {
      await api.pharmacy.adjustStock({
        medicine_id: adjustingMedId,
        quantity_change: finalQty
      });
      toast.success('Stock inventory adjusted successfully!');
      setAdjustingMedId(null);
      setAdjustQuantity('');
      fetchInventory();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to adjust stock');
    }
  };

  // Filtered meds
  const filteredMeds = medicines.filter(med => 
    med.name.toLowerCase().includes(search.toLowerCase()) || 
    med.manufacturer?.toLowerCase().includes(search.toLowerCase())
  );

  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.ceil(filteredMeds.length / ITEMS_PER_PAGE);
  const paginatedMeds = filteredMeds.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const totalMeds = medicines.length;
  const lowStockCount = medicines.filter(m => m.stock_quantity < 20).length;

  return (
    <div className="space-y-6">
      {/* Metric Cards summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Total Cataloged Drugs</p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">{totalMeds}</h3>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <Pill className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Low Stock Warnings</p>
              <h3 className="text-2xl font-extrabold text-rose-500">{lowStockCount}</h3>
            </div>
            <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Storage Capacity</p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">Normal</h3>
            </div>
            <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
              <Package className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Stock Table */}
      <Card className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Stock Inventory Ledger</CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-450">Review stock levels, safety buffer levels, and supplier logs</CardDescription>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-550" />
            <Input
              placeholder="Search catalog by drug name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs rounded-xl"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading && medicines.length === 0 ? (
            <div className="flex justify-center py-12">
              <Activity className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          ) : filteredMeds.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-450">
              No medicines found matching criteria.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-150 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Medication Name</th>
                    <th className="py-3 px-4">Manufacturer</th>
                    <th className="py-3 px-4">Dosage Form</th>
                    <th className="py-3 px-4">Stock Level</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {paginatedMeds.map((med) => (
                    <tr key={med.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{med.name}</td>
                      <td className="py-3.5 px-4 text-slate-655 dark:text-slate-350">{med.manufacturer || 'General Pharma'}</td>
                      <td className="py-3.5 px-4 text-slate-500">{med.dosage_form || 'Tablet'}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 font-bold ${med.stock_quantity < 20 ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {med.stock_quantity < 20 && <AlertTriangle className="w-3.5 h-3.5" />}
                          {med.stock_quantity}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          onClick={() => setAdjustingMedId(med.id)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] h-7 px-2.5 rounded-lg cursor-pointer"
                        >
                          Adjust Stock
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-150 dark:border-slate-800 text-xs">
                <span className="text-slate-500 dark:text-slate-450">
                  Showing <span className="font-bold text-slate-800 dark:text-slate-200">{Math.min(filteredMeds.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)}</span> to{' '}
                  <span className="font-bold text-slate-800 dark:text-slate-200">{Math.min(filteredMeds.length, currentPage * ITEMS_PER_PAGE)}</span> of{' '}
                  <span className="font-bold text-slate-800 dark:text-slate-200">{filteredMeds.length}</span> medicines
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-350 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPage(idx + 1)}
                      className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold cursor-pointer transition-all
                        ${currentPage === idx + 1
                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850'
                        }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-350 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
          )}
        </CardContent>
      </Card>

      {/* MODAL: ADJUST STOCK */}
      {adjustingMedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <Card className="w-full max-w-sm bg-slate-900 border-slate-800 rounded-2xl shadow-2xl relative">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">Adjust Stock Level</CardTitle>
              <CardDescription className="text-xs text-slate-400">Increase or decrease safety buffer levels</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdjustStockSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('ADD')}
                    className={`py-2 rounded-xl border text-center font-bold transition-all cursor-pointer
                      ${adjustType === 'ADD' 
                        ? 'bg-emerald-500 text-white border-emerald-500' 
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'}`}
                  >
                    Add Stock (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('SUBTRACT')}
                    className={`py-2 rounded-xl border text-center font-bold transition-all cursor-pointer
                      ${adjustType === 'SUBTRACT' 
                        ? 'bg-rose-500 text-white border-rose-500' 
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'}`}
                  >
                    Remove Stock (-)
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-350">Adjustment Quantity</label>
                  <Input
                    type="number"
                    placeholder="10"
                    value={adjustQuantity}
                    onChange={(e) => setAdjustQuantity(e.target.value)}
                    className="bg-slate-950/40 border-slate-800 text-white rounded-xl text-xs"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <Button 
                    type="button" 
                    onClick={() => setAdjustingMedId(null)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl py-2 cursor-pointer font-bold"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2 cursor-pointer font-bold shadow-lg shadow-emerald-500/10"
                  >
                    Save Changes
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
