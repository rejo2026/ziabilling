import React, { useState } from 'react';
import { Search, Plus, BarChart2, Boxes, AlertCircle } from 'lucide-react';
import type { Product } from '../types';
import { api } from '../api';

interface Props {
  products: Product[];
  categories: string[];
  brands: string[];
  units: string[];
  onRefresh: () => void;
}

export default function ProductsPage({ products, categories, brands, units, onRefresh }: Props) {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('Manual Count Correction');
  const [form, setForm] = useState({
    name: '', sku: '', barcode: '', category: 'Hardware', brand: 'Generic', unit: 'Pcs',
    purchasePrice: '', sellingPrice: '', taxRate: '18', stock: '10', minStock: '5', batch: 'B-01', expiry: 'N/A'
  });

  const filtered = products.filter(p => {
    const ms = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()) || (p.barcode || '').includes(search);
    const mc = catFilter === 'ALL' || p.category.toUpperCase() === catFilter;
    return ms && mc;
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/products', form);
    setShowAddModal(false);
    setForm({ name: '', sku: '', barcode: '', category: 'Hardware', brand: 'Generic', unit: 'Pcs', purchasePrice: '', sellingPrice: '', taxRate: '18', stock: '10', minStock: '5', batch: 'B-01', expiry: 'N/A' });
    onRefresh();
  };

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTarget) return;
    await api.patch(`/products/${adjustTarget.id}/stock`, { delta: parseInt(adjustQty, 10), reason: adjustReason });
    setShowAdjustModal(false);
    setAdjustTarget(null);
    setAdjustQty('');
    onRefresh();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await api.del(`/products/${id}`);
    onRefresh();
  };

  const totalValue = products.reduce((s, p) => s + p.purchasePrice * p.stock, 0);
  const lowStock = products.filter(p => p.stock <= p.minStock).length;

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 text-xs">
        <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700">
          <Boxes size={18} className="text-blue-400 mb-1" />
          <p className="text-slate-400">Total SKUs</p>
          <p className="text-xl font-bold text-white">{products.length}</p>
        </div>
        <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700">
          <BarChart2 size={18} className="text-emerald-400 mb-1" />
          <p className="text-slate-400">Inventory Value (Cost)</p>
          <p className="text-xl font-bold text-emerald-400">₹{totalValue.toLocaleString('en-IN')}</p>
        </div>
        <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700">
          <AlertCircle size={18} className="text-rose-400 mb-1" />
          <p className="text-slate-400">Low Stock Items</p>
          <p className="text-xl font-bold text-rose-400">{lowStock}</p>
        </div>
        <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700">
          <p className="text-slate-400">Categories Active</p>
          <p className="text-xl font-bold text-purple-400 mt-1">{categories.length}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search SKU, barcode, or name..."
            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500" />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300">
          <option value="ALL">All Categories</option>
          {categories.map((c, i) => <option key={i} value={c.toUpperCase()}>{c}</option>)}
        </select>
        <div className="flex-1" />
        <button onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold">
          <Plus size={15} /> Add Product Master
        </button>
      </div>

      {/* Products Table */}
      <div className="bg-slate-800/60 rounded-2xl border border-slate-700 overflow-x-auto">
        <table className="w-full text-xs min-w-[900px]">
          <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-700">
            <tr>
              <th className="p-3 text-left">SKU / Barcode</th>
              <th className="p-3 text-left">Product Name</th>
              <th className="p-3 text-left">Category / Brand</th>
              <th className="p-3 text-left">Unit</th>
              <th className="p-3 text-right">Purchase Cost</th>
              <th className="p-3 text-right">Selling Price</th>
              <th className="p-3 text-center">GST %</th>
              <th className="p-3 text-center">Stock</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-left">Batch / Expiry</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.length === 0 && (
              <tr><td colSpan={11} className="p-8 text-center text-slate-500">No products found. Add your first product SKU.</td></tr>
            )}
            {filtered.map(prod => (
              <tr key={prod.id} className="hover:bg-slate-800/50">
                <td className="p-3 font-mono">
                  <p className="font-bold text-slate-200">{prod.sku}</p>
                  <p className="text-[10px] text-slate-500">{prod.barcode}</p>
                </td>
                <td className="p-3 font-semibold text-slate-100">{prod.name}</td>
                <td className="p-3">
                  <span className="text-slate-300">{prod.category}</span>
                  <span className="text-slate-500"> / {prod.brand}</span>
                </td>
                <td className="p-3 text-slate-400">{prod.unit}</td>
                <td className="p-3 text-right font-mono text-slate-400">₹{prod.purchasePrice.toLocaleString('en-IN')}</td>
                <td className="p-3 text-right font-mono font-bold text-emerald-400">₹{prod.sellingPrice.toLocaleString('en-IN')}</td>
                <td className="p-3 text-center text-slate-300">{prod.taxRate}%</td>
                <td className="p-3 text-center font-bold text-white">{prod.stock}</td>
                <td className="p-3 text-center">
                  {prod.stock === 0 ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800">Out of Stock</span>
                  ) : prod.stock <= prod.minStock ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800">Low Stock</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400">In Stock</span>
                  )}
                </td>
                <td className="p-3 text-[11px] text-slate-400">{prod.batch} | {prod.expiry}</td>
                <td className="p-3 text-right space-x-1 whitespace-nowrap">
                  <button onClick={() => { setAdjustTarget(prod); setShowAdjustModal(true); }}
                    className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-[11px] text-white">
                    Adjust
                  </button>
                  <button onClick={() => handleDelete(prod.id, prod.name)}
                    className="px-2 py-1 bg-rose-900/60 hover:bg-rose-800 rounded text-[11px] text-rose-300">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── ADD PRODUCT MODAL ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-sm text-white">Register New Product Master</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white text-lg">×</button>
            </div>
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Product Name *</label>
                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="e.g. 80mm Thermal Printer" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">SKU Code</label>
                  <input value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} placeholder="HW-PRN-80"
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Barcode / EAN</label>
                  <input value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})} placeholder="8901234567890"
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white">
                    {categories.map((c,i) => <option key={i}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Brand</label>
                  <select value={form.brand} onChange={e => setForm({...form, brand: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white">
                    {brands.map((b,i) => <option key={i}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Unit of Measure</label>
                  <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white">
                    {units.map((u,i) => <option key={i}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Purchase Cost (₹)</label>
                  <input type="number" step="0.01" value={form.purchasePrice} onChange={e => setForm({...form, purchasePrice: e.target.value})}
                    placeholder="4500" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Selling Price (₹) *</label>
                  <input type="number" step="0.01" required value={form.sellingPrice} onChange={e => setForm({...form, sellingPrice: e.target.value})}
                    placeholder="6999" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-bold" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">GST Tax Rate %</label>
                  <select value={form.taxRate} onChange={e => setForm({...form, taxRate: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white">
                    {['0','5','12','18','28'].map(r => <option key={r} value={r}>{r}%</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Opening Stock</label>
                  <input type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Min Reorder Level</label>
                  <input type="number" value={form.minStock} onChange={e => setForm({...form, minStock: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Batch / Expiry</label>
                  <input value={form.batch} onChange={e => setForm({...form, batch: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-md">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── STOCK ADJUSTMENT MODAL ── */}
      {showAdjustModal && adjustTarget && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-5 shadow-2xl">
            <h3 className="font-bold text-sm text-white mb-1">Stock Adjustment</h3>
            <p className="text-xs text-slate-400 mb-3">{adjustTarget.name} — Current: <strong className="text-white">{adjustTarget.stock} {adjustTarget.unit}</strong></p>
            <form onSubmit={handleAdjust} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Quantity Change (use - to subtract)</label>
                <input type="number" required value={adjustQty} onChange={e => setAdjustQty(e.target.value)} placeholder="+10 or -5"
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-center font-mono text-sm font-bold" />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Reason for Adjustment</label>
                <select value={adjustReason} onChange={e => setAdjustReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white">
                  {['Manual Count Correction','Damaged / Expired Goods','Supplier Sample Receipt','Customer Return Restock','Warehouse Transfer'].map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button type="button" onClick={() => setShowAdjustModal(false)} className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white font-bold rounded">Apply Adjustment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
