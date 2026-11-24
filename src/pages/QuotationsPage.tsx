// ============================================================
// QuotationsPage — Quotation Management
// ============================================================
import React, { useState } from 'react';
import {
  FileText, Plus, Search, X, Trash2, ArrowRight,
  CheckCircle2, Clock, AlertCircle, XCircle, Eye
} from 'lucide-react';
import { Quotation, Product, InvoiceItem } from '../types';
import { api } from '../api';

interface QuotationsPageProps {
  quotations: Quotation[];
  products: Product[];
  onRefresh: () => void;
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-600/20 text-amber-400',
  ACCEPTED: 'bg-green-600/20 text-green-400',
  REJECTED: 'bg-red-600/20 text-red-400',
  CONVERTED: 'bg-indigo-600/20 text-indigo-400',
};
const statusIcons: Record<string, React.ReactNode> = {
  PENDING: <Clock className="w-3 h-3" />,
  ACCEPTED: <CheckCircle2 className="w-3 h-3" />,
  REJECTED: <XCircle className="w-3 h-3" />,
  CONVERTED: <ArrowRight className="w-3 h-3" />,
};

export default function QuotationsPage({ quotations, products, onRefresh }: QuotationsPageProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  // Form state
  const [formCustomer, setFormCustomer] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formExpiry, setFormExpiry] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [formDiscount, setFormDiscount] = useState('0');
  const [formItems, setFormItems] = useState<Array<{ productId: string; name: string; qty: string; price: string; taxRate: number }>>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const filtered = quotations.filter(q => {
    const matchSearch = q.customerName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  function addItem(product: Product) {
    setFormItems(prev => {
      if (prev.find(i => i.productId === product.id)) return prev;
      return [...prev, { productId: product.id, name: product.name, qty: '1', price: String(product.sellingPrice), taxRate: product.taxRate }];
    });
    setItemSearch('');
  }

  function removeItem(pid: string) {
    setFormItems(prev => prev.filter(i => i.productId !== pid));
  }

  const subtotal = formItems.reduce((s, i) => s + parseFloat(i.price || '0') * parseFloat(i.qty || '0'), 0);
  const tax = formItems.reduce((s, i) => s + parseFloat(i.price || '0') * parseFloat(i.qty || '0') * i.taxRate / 100, 0);
  const disc = parseFloat(formDiscount) || 0;
  const total = subtotal + tax - disc;

  async function handleCreate() {
    if (!formCustomer || formItems.length === 0) return;
    setFormLoading(true);
    try {
      await api.post('/quotations', {
        customerName: formCustomer,
        customerPhone: formPhone,
        expiryDate: formExpiry,
        items: formItems.map(i => ({
          name: i.name,
          quantity: parseFloat(i.qty),
          unitPrice: parseFloat(i.price),
          taxRate: i.taxRate,
          total: parseFloat(i.qty) * parseFloat(i.price) * (1 + i.taxRate / 100)
        })),
        subtotal, tax, discount: disc, total,
        status: 'PENDING'
      });
      onRefresh();
      setShowCreateModal(false);
      setFormCustomer(''); setFormPhone(''); setFormItems([]); setFormDiscount('0');
    } catch {
      alert('Failed to create quotation.');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleConvert(id: string) {
    if (!confirm('Convert this quotation to an invoice?')) return;
    setConvertingId(id);
    try {
      await api.post('/sales/convert', { quotationId: id });
      onRefresh();
    } catch {
      alert('Conversion failed.');
    } finally {
      setConvertingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this quotation?')) return;
    await api.del(`/quotations/${id}`);
    onRefresh();
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Quotations</h2>
          <p className="text-xs text-slate-400">{quotations.length} quotation{quotations.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" /> New Quotation
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            placeholder="Search by customer…"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All Statuses</option>
          <option>PENDING</option>
          <option>ACCEPTED</option>
          <option>REJECTED</option>
          <option>CONVERTED</option>
        </select>
      </div>

      {/* Table */}
      <div className="flex-1 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 sticky top-0">
              <tr>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Quotation #</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Customer</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Date</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Expiry</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium">Items</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium">Total</th>
                <th className="text-center px-4 py-3 text-slate-400 font-medium">Status</th>
                <th className="text-center px-4 py-3 text-slate-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filtered.map(q => (
                <tr key={q.id} className="hover:bg-slate-750 transition-colors">
                  <td className="px-4 py-3 text-indigo-400 font-mono text-xs">{q.id.slice(-8).toUpperCase()}</td>
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{q.customerName}</p>
                    {q.customerPhone && <p className="text-xs text-slate-400">{q.customerPhone}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-xs">{new Date(q.date).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className={new Date(q.expiryDate) < new Date() && q.status === 'PENDING' ? 'text-red-400' : 'text-slate-300'}>
                      {new Date(q.expiryDate).toLocaleDateString('en-IN')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300">{q.items.length}</td>
                  <td className="px-4 py-3 text-right text-white font-semibold">₹{q.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[q.status] || 'bg-slate-700 text-slate-300'}`}>
                      {statusIcons[q.status]} {q.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {q.status === 'PENDING' && (
                        <button
                          onClick={() => handleConvert(q.id)}
                          disabled={convertingId === q.id}
                          className="bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
                        >
                          <ArrowRight className="w-3 h-3" />
                          {convertingId === q.id ? '…' : 'To Invoice'}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(q.id)}
                        className="text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No quotations found</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="font-semibold text-white">New Quotation</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Customer */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Customer Name *</label>
                  <input className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    value={formCustomer} onChange={e => setFormCustomer(e.target.value)} placeholder="Customer name" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Phone</label>
                  <input className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="Phone number" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Expiry Date</label>
                  <input type="date" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    value={formExpiry} onChange={e => setFormExpiry(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Discount (₹)</label>
                  <input type="number" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    value={formDiscount} onChange={e => setFormDiscount(e.target.value)} min="0" />
                </div>
              </div>

              {/* Product Search */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Add Products</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    placeholder="Search product…" value={itemSearch} onChange={e => setItemSearch(e.target.value)} />
                </div>
                {itemSearch && (
                  <div className="bg-slate-900 border border-slate-600 rounded-lg mt-1 max-h-40 overflow-y-auto">
                    {filteredProducts.slice(0, 8).map(p => (
                      <button key={p.id} onClick={() => addItem(p)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-700 flex justify-between text-sm text-white transition-colors">
                        <span>{p.name}</span>
                        <span className="text-slate-400">₹{p.sellingPrice}</span>
                      </button>
                    ))}
                    {filteredProducts.length === 0 && <p className="text-center py-3 text-slate-400 text-sm">No products</p>}
                  </div>
                )}
              </div>

              {/* Items */}
              {formItems.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-400 font-medium">Items</p>
                  {formItems.map(item => (
                    <div key={item.productId} className="flex items-center gap-2 bg-slate-900 rounded-lg p-2">
                      <span className="flex-1 text-sm text-white">{item.name}</span>
                      <input type="number" min="1" value={item.qty}
                        onChange={e => setFormItems(prev => prev.map(i => i.productId === item.productId ? { ...i, qty: e.target.value } : i))}
                        className="w-16 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-center text-white text-sm focus:outline-none" />
                      <span className="text-slate-400 text-xs">×</span>
                      <input type="number" min="0" value={item.price}
                        onChange={e => setFormItems(prev => prev.map(i => i.productId === item.productId ? { ...i, price: e.target.value } : i))}
                        className="w-20 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-center text-white text-sm focus:outline-none" />
                      <span className="text-indigo-400 text-sm font-semibold w-20 text-right">
                        ₹{(parseFloat(item.qty || '0') * parseFloat(item.price || '0')).toFixed(2)}
                      </span>
                      <button onClick={() => removeItem(item.productId)} className="text-slate-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                  <div className="bg-slate-900 rounded-lg p-3 space-y-1 text-sm">
                    <div className="flex justify-between text-slate-400"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between text-slate-400"><span>Tax</span><span>₹{tax.toFixed(2)}</span></div>
                    <div className="flex justify-between text-slate-400"><span>Discount</span><span>-₹{disc.toFixed(2)}</span></div>
                    <div className="flex justify-between text-white font-bold border-t border-slate-700 pt-1"><span>Total</span><span>₹{total.toFixed(2)}</span></div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-700">
              <button
                onClick={handleCreate}
                disabled={formLoading || !formCustomer || formItems.length === 0}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl py-2.5 font-semibold transition-colors"
              >
                {formLoading ? 'Creating…' : 'Create Quotation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
