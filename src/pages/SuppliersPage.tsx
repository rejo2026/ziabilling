import React, { useState } from 'react';
import { Search, Plus, Building2, TrendingDown } from 'lucide-react';
import type { Supplier, Purchase, Product } from '../types';
import { api } from '../api';

interface Props {
  suppliers: Supplier[];
  purchases: Purchase[];
  products: Product[];
  onRefresh: () => void;
}

export default function SuppliersPage({ suppliers, purchases, products, onRefresh }: Props) {
  const [search, setSearch] = useState('');
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierForm, setSupplierForm] = useState({ name: '', phone: '', email: '', gstin: '', address: '' });
  const [purchaseForm, setPurchaseForm] = useState({
    supplierId: '', productId: '', quantity: '10', unitCost: '', taxRate: '18', paymentStatus: 'PAID'
  });

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) || s.phone.includes(search) || (s.gstin || '').includes(search.toUpperCase())
  );

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/suppliers', supplierForm);
    setShowSupplierModal(false);
    setSupplierForm({ name: '', phone: '', email: '', gstin: '', address: '' });
    onRefresh();
  };

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find(p => p.id === purchaseForm.productId);
    if (!prod) return;
    await api.post('/purchases', {
      supplierId: purchaseForm.supplierId,
      items: [{
        productId: prod.id,
        name: prod.name,
        quantity: parseInt(purchaseForm.quantity, 10),
        unitCost: parseFloat(purchaseForm.unitCost) || prod.purchasePrice,
        taxRate: parseFloat(purchaseForm.taxRate) || prod.taxRate
      }],
      paymentStatus: purchaseForm.paymentStatus
    });
    setShowPurchaseModal(false);
    setPurchaseForm({ supplierId: '', productId: '', quantity: '10', unitCost: '', taxRate: '18', paymentStatus: 'PAID' });
    onRefresh();
  };

  const totalPayables = suppliers.reduce((s, sup) => s + (sup.payables || 0), 0);
  const supplierPurchases = (id: string) => purchases.filter(p => p.supplierId === id);

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 text-xs">
        <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700">
          <Building2 size={16} className="text-amber-400 mb-1" />
          <p className="text-slate-400">Total Suppliers</p>
          <p className="text-xl font-bold text-white">{suppliers.length}</p>
        </div>
        <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700">
          <TrendingDown size={16} className="text-rose-400 mb-1" />
          <p className="text-slate-400">Total Payables</p>
          <p className="text-xl font-bold text-rose-400">₹{totalPayables.toLocaleString('en-IN')}</p>
        </div>
        <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700">
          <p className="text-slate-400">Total Purchase Orders</p>
          <p className="text-xl font-bold text-blue-400">{purchases.length}</p>
        </div>
        <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700">
          <p className="text-slate-400">Fully Paid Purchases</p>
          <p className="text-xl font-bold text-emerald-400">{purchases.filter(p=>p.paymentStatus==='PAID').length}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search supplier or GSTIN..."
            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500" />
        </div>
        <div className="flex-1" />
        <button onClick={() => setShowPurchaseModal(true)} className="flex items-center gap-2 px-4 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-lg text-xs font-bold">
          <Plus size={15} /> Record Inward Purchase
        </button>
        <button onClick={() => setShowSupplierModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold">
          <Plus size={15} /> Register Supplier
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Supplier List */}
        <div className="col-span-2 bg-slate-800/60 rounded-2xl border border-slate-700 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-700">
              <tr>
                <th className="p-3 text-left">Supplier / Vendor</th>
                <th className="p-3 text-left">Phone & Email</th>
                <th className="p-3 text-left">GSTIN</th>
                <th className="p-3 text-right">Payables Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500">No suppliers found.</td></tr>
              )}
              {filtered.map(s => (
                <tr key={s.id}
                  onClick={() => setSelectedSupplier(selectedSupplier?.id === s.id ? null : s)}
                  className={`cursor-pointer transition ${selectedSupplier?.id === s.id ? 'bg-amber-950/40 border-l-2 border-amber-500' : 'hover:bg-slate-800/50'}`}>
                  <td className="p-3">
                    <p className="font-bold text-slate-100">{s.name}</p>
                    <p className="text-[10px] text-slate-500">{s.id}</p>
                  </td>
                  <td className="p-3">
                    <p className="font-mono text-slate-300">{s.phone}</p>
                    <p className="text-[10px] text-slate-500">{s.email}</p>
                  </td>
                  <td className="p-3 font-mono text-slate-400 text-[11px]">{s.gstin || '—'}</td>
                  <td className="p-3 text-right font-bold font-mono">
                    <span className={(s.payables || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                      ₹{(s.payables || 0).toLocaleString('en-IN')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Supplier Profile Panel */}
        <div className="bg-slate-800/60 rounded-2xl border border-slate-700 p-4 space-y-3">
          {!selectedSupplier ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-slate-500 text-xs text-center">
              <Building2 size={32} className="mb-2 opacity-40" />
              <p>Click a supplier to see their purchase history and account details.</p>
            </div>
          ) : (
            <>
              <div className="pb-3 border-b border-slate-700">
                <h4 className="font-bold text-sm text-slate-100">{selectedSupplier.name}</h4>
                <p className="text-xs text-slate-400 font-mono">{selectedSupplier.gstin || 'GST Not Registered'}</p>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-400">Phone:</span><span className="font-mono">{selectedSupplier.phone}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Email:</span><span>{selectedSupplier.email || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Address:</span><span className="text-right max-w-[160px] text-slate-300">{selectedSupplier.address || '—'}</span></div>
              </div>
              <div className="pt-2 border-t border-slate-700">
                <p className="font-semibold text-xs text-slate-300 mb-1">Outstanding Payables</p>
                <p className={`text-xl font-bold font-mono ${(selectedSupplier.payables || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  ₹{(selectedSupplier.payables || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-700">
                <p className="font-semibold text-xs text-slate-300 mb-2">Recent Purchases</p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {supplierPurchases(selectedSupplier.id).length === 0 ? (
                    <p className="text-slate-500 text-[11px] text-center py-3">No purchases recorded.</p>
                  ) : supplierPurchases(selectedSupplier.id).slice(0, 6).map(pur => (
                    <div key={pur.id} className="flex justify-between items-center p-2 bg-slate-900 rounded">
                      <div>
                        <p className="font-mono text-[10px] text-amber-400 font-bold">{pur.id}</p>
                        <p className="text-[10px] text-slate-500">{pur.date} | {pur.items?.length} items</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-[11px] font-bold text-white">₹{pur.total.toLocaleString('en-IN')}</p>
                        <span className={`text-[9px] font-bold ${pur.paymentStatus === 'PAID' ? 'text-emerald-400' : 'text-rose-400'}`}>{pur.paymentStatus}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Purchase Orders Table ── */}
      <div className="bg-slate-800/60 rounded-2xl border border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-700 font-bold text-sm text-slate-200">All Purchase Orders / GRNs</div>
        <table className="w-full text-xs">
          <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-700">
            <tr>
              <th className="p-3 text-left">Purchase #</th>
              <th className="p-3 text-left">Supplier</th>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Line Items</th>
              <th className="p-3 text-right">Taxable</th>
              <th className="p-3 text-right">GST</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3 text-center">GRN Status</th>
              <th className="p-3 text-center">Payment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {purchases.length === 0 && (
              <tr><td colSpan={9} className="p-8 text-center text-slate-500">No purchases recorded yet.</td></tr>
            )}
            {purchases.map(pur => (
              <tr key={pur.id} className="hover:bg-slate-800/50">
                <td className="p-3 font-mono font-bold text-amber-400">{pur.id}</td>
                <td className="p-3 font-semibold text-slate-200">{pur.supplierName}</td>
                <td className="p-3 text-slate-400">{pur.date}</td>
                <td className="p-3 text-slate-300">{pur.items?.map((i:any) => i.name || '').join(', ').substring(0, 40)}</td>
                <td className="p-3 text-right font-mono text-slate-400">₹{(pur.subtotal || 0).toLocaleString('en-IN')}</td>
                <td className="p-3 text-right font-mono text-slate-400">₹{(pur.tax || 0).toLocaleString('en-IN')}</td>
                <td className="p-3 text-right font-bold text-white font-mono">₹{pur.total.toLocaleString('en-IN')}</td>
                <td className="p-3 text-center">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400">{pur.status}</span>
                </td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${pur.paymentStatus === 'PAID' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'}`}>
                    {pur.paymentStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── SUPPLIER MODAL ── */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-sm text-white">Register New Supplier</h3>
              <button onClick={() => setShowSupplierModal(false)} className="text-slate-400 hover:text-white text-lg">×</button>
            </div>
            <form onSubmit={handleSaveSupplier} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Supplier / Vendor Name *</label>
                <input required value={supplierForm.name} onChange={e => setSupplierForm({...supplierForm, name: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Phone *</label>
                  <input required value={supplierForm.phone} onChange={e => setSupplierForm({...supplierForm, phone: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Email</label>
                  <input value={supplierForm.email} onChange={e => setSupplierForm({...supplierForm, email: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" />
                </div>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">GSTIN</label>
                <input value={supplierForm.gstin} onChange={e => setSupplierForm({...supplierForm, gstin: e.target.value})}
                  placeholder="27AAACN1234K1Z2" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono" />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Business Address</label>
                <textarea rows={2} value={supplierForm.address} onChange={e => setSupplierForm({...supplierForm, address: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowSupplierModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg">Save Supplier</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── PURCHASE MODAL ── */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-sm text-white">Record Inward Stock Purchase</h3>
              <button onClick={() => setShowPurchaseModal(false)} className="text-slate-400 hover:text-white text-lg">×</button>
            </div>
            <form onSubmit={handleSavePurchase} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Supplier *</label>
                <select required value={purchaseForm.supplierId} onChange={e => setPurchaseForm({...purchaseForm, supplierId: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white">
                  <option value="">Select supplier...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Product Received *</label>
                <select required value={purchaseForm.productId} onChange={e => setPurchaseForm({...purchaseForm, productId: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white">
                  <option value="">Select product...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Qty Received</label>
                  <input type="number" required value={purchaseForm.quantity} onChange={e => setPurchaseForm({...purchaseForm, quantity: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Unit Cost (₹)</label>
                  <input type="number" step="0.01" value={purchaseForm.unitCost} onChange={e => setPurchaseForm({...purchaseForm, unitCost: e.target.value})}
                    placeholder="Auto from master" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Payment</label>
                  <select value={purchaseForm.paymentStatus} onChange={e => setPurchaseForm({...purchaseForm, paymentStatus: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white">
                    <option value="PAID">Paid</option>
                    <option value="UNPAID">On Credit</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowPurchaseModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-amber-700 hover:bg-amber-600 text-white font-bold rounded-lg">Record Purchase</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
