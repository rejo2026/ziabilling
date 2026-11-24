// ============================================================
// InventoryPage — Stock Valuation & Adjustment
// ============================================================
import React, { useState } from 'react';
import {
  Boxes, Search, TrendingDown, AlertTriangle, Package,
  ArrowUpDown, Plus, Minus, X, Save, Filter
} from 'lucide-react';
import { Product } from '../types';
import { api } from '../api';

interface InventoryPageProps {
  products: Product[];
  onRefresh: () => void;
}

export default function InventoryPage({ products, onRefresh }: InventoryPageProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [showLowOnly, setShowLowOnly] = useState(false);
  const [adjustItem, setAdjustItem] = useState<Product | null>(null);
  const [adjustDelta, setAdjustDelta] = useState('0');
  const [adjustReason, setAdjustReason] = useState('Inventory Restock');
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [sortCol, setSortCol] = useState<'name' | 'stock' | 'value' | 'category'>('name');
  const [sortAsc, setSortAsc] = useState(true);

  const categories = ['ALL', ...Array.from(new Set(products.map(p => p.category)))];

  const totalValue = products.reduce((s, p) => s + p.purchasePrice * p.stock, 0);
  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;
  const outOfStock = products.filter(p => p.stock === 0).length;

  let filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'ALL' || p.category === categoryFilter;
    const matchLow = !showLowOnly || p.stock <= p.minStock;
    return matchSearch && matchCat && matchLow;
  });

  filtered = [...filtered].sort((a, b) => {
    let va: any = a[sortCol === 'value' ? 'stock' : sortCol];
    let vb: any = b[sortCol === 'value' ? 'stock' : sortCol];
    if (sortCol === 'value') { va = a.purchasePrice * a.stock; vb = b.purchasePrice * b.stock; }
    if (typeof va === 'string') return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    return sortAsc ? va - vb : vb - va;
  });

  function toggleSort(col: typeof sortCol) {
    if (sortCol === col) setSortAsc(s => !s);
    else { setSortCol(col); setSortAsc(true); }
  }

  async function handleAdjust() {
    if (!adjustItem) return;
    const delta = parseInt(adjustDelta);
    if (isNaN(delta)) return;
    setAdjustLoading(true);
    try {
      await api.patch(`/products/${adjustItem.id}/stock`, { delta, reason: adjustReason });
      onRefresh();
      setAdjustItem(null);
    } catch {
      alert('Adjustment failed.');
    } finally {
      setAdjustLoading(false);
    }
  }

  const SortIcon = ({ col }: { col: typeof sortCol }) => (
    <ArrowUpDown className={`w-3 h-3 inline ml-1 ${sortCol === col ? 'text-indigo-400' : 'text-slate-500'}`} />
  );

  return (
    <div className="flex flex-col h-full gap-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/20 rounded-lg"><Boxes className="w-5 h-5 text-indigo-400" /></div>
            <div>
              <p className="text-xs text-slate-400">Total Inventory Value</p>
              <p className="text-xl font-bold text-white">₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-600/20 rounded-lg"><AlertTriangle className="w-5 h-5 text-amber-400" /></div>
            <div>
              <p className="text-xs text-slate-400">Low Stock Items</p>
              <p className="text-xl font-bold text-white">{lowStockCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-600/20 rounded-lg"><TrendingDown className="w-5 h-5 text-red-400" /></div>
            <div>
              <p className="text-xs text-slate-400">Out of Stock</p>
              <p className="text-xl font-bold text-white">{outOfStock}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            placeholder="Search products…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
        >
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
        <button
          onClick={() => setShowLowOnly(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${showLowOnly ? 'bg-amber-600/20 border-amber-600 text-amber-400' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
        >
          <Filter className="w-4 h-4" />
          Low Stock Only
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 sticky top-0">
              <tr>
                <th className="text-left px-4 py-3 text-slate-400 font-medium cursor-pointer hover:text-white" onClick={() => toggleSort('name')}>
                  Product <SortIcon col="name" />
                </th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium cursor-pointer hover:text-white" onClick={() => toggleSort('category')}>
                  Category <SortIcon col="category" />
                </th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium">Purchase Cost</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium">Selling Price</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium cursor-pointer hover:text-white" onClick={() => toggleSort('stock')}>
                  Stock <SortIcon col="stock" />
                </th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium">Min Stock</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium cursor-pointer hover:text-white" onClick={() => toggleSort('value')}>
                  Inventory Value <SortIcon col="value" />
                </th>
                <th className="text-center px-4 py-3 text-slate-400 font-medium">Status</th>
                <th className="text-center px-4 py-3 text-slate-400 font-medium">Adjust</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filtered.map(p => {
                const value = p.purchasePrice * p.stock;
                const isLow = p.stock <= p.minStock;
                const isOut = p.stock === 0;
                return (
                  <tr key={p.id} className={`hover:bg-slate-750 transition-colors ${isLow ? 'bg-amber-900/5' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.sku} {p.batch ? `• ${p.batch}` : ''}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{p.category}</td>
                    <td className="px-4 py-3 text-right text-slate-300">₹{p.purchasePrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-slate-300">₹{p.sellingPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      <span className={isOut ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-white'}>
                        {p.stock} {p.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400">{p.minStock}</td>
                    <td className="px-4 py-3 text-right text-indigo-400 font-semibold">
                      ₹{value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isOut ? (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-red-600/20 text-red-400 font-medium">Out of Stock</span>
                      ) : isLow ? (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-amber-600/20 text-amber-400 font-medium">Low Stock</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-green-600/20 text-green-400 font-medium">OK</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => { setAdjustItem(p); setAdjustDelta('0'); setAdjustReason('Inventory Restock'); }}
                        className="bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No products found</p>
            </div>
          )}
        </div>
        <div className="px-4 py-2 border-t border-slate-700 text-xs text-slate-400">
          Showing {filtered.length} of {products.length} products
        </div>
      </div>

      {/* Adjust Modal */}
      {adjustItem && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="font-semibold text-white">Adjust Stock</h3>
              <button onClick={() => setAdjustItem(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <p className="text-sm font-semibold text-white">{adjustItem.name}</p>
                <p className="text-xs text-slate-400">Current stock: <span className="text-white font-medium">{adjustItem.stock} {adjustItem.unit}</span></p>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Adjustment (+ to add, - to reduce)</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setAdjustDelta(v => String(parseInt(v || '0') - 1))} className="bg-slate-700 hover:bg-red-600 text-white rounded-lg p-2 transition-colors">
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-center text-white text-lg font-bold focus:outline-none focus:border-indigo-500"
                    type="number"
                    value={adjustDelta}
                    onChange={e => setAdjustDelta(e.target.value)}
                  />
                  <button onClick={() => setAdjustDelta(v => String(parseInt(v || '0') + 1))} className="bg-slate-700 hover:bg-green-600 text-white rounded-lg p-2 transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1 text-center">
                  New stock: <span className={`font-bold ${adjustItem.stock + (parseInt(adjustDelta) || 0) < 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {adjustItem.stock + (parseInt(adjustDelta) || 0)} {adjustItem.unit}
                  </span>
                </p>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Reason</label>
                <select
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                >
                  {['Inventory Restock', 'Damage/Expiry', 'Return from Customer', 'Physical Count Correction', 'Sample/Demo', 'Other'].map(r => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleAdjust}
                disabled={adjustLoading || adjustDelta === '0' || adjustDelta === ''}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl py-2.5 font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Save className="w-4 h-4" />
                {adjustLoading ? 'Saving…' : 'Save Adjustment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
