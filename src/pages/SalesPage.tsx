import React, { useState } from 'react';
import { Search, Plus, Printer, CheckCircle2, FileSpreadsheet, FileText, FileDown } from 'lucide-react';
import type { Invoice, Product, Customer } from '../types';
import { api } from '../api';
import { exportToCSV, exportToExcel, exportToPDF, fmtDate, fmtCurrency } from '../utils/exportUtils';

interface Props {
  invoices: Invoice[];
  products: Product[];
  customers: Customer[];
  onRefresh: () => void;
  onViewInvoice: (inv: Invoice) => void;
  companySettings: any;
}

export default function SalesPage({ invoices, products, customers, onRefresh, onViewInvoice, companySettings }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    customerName: '', customerPhone: '', customerGstin: '',
    customerId: '', discount: '0', paymentMethod: 'UPI',
    selectedProductId: '', quantity: '1',
    items: [] as { id: string; name: string; quantity: number; unitPrice: number; taxRate: number; total: number }[]
  });

  const filtered = invoices.filter(inv => {
    const matchSearch = inv.customerName.toLowerCase().includes(search.toLowerCase()) || inv.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    const matchType = typeFilter === 'ALL' || inv.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const handleAddItem = () => {
    const prod = products.find(p => p.id === form.selectedProductId);
    if (!prod) return;
    const qty = parseInt(form.quantity, 10) || 1;
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { id: prod.id, name: prod.name, quantity: qty, unitPrice: prod.sellingPrice, taxRate: prod.taxRate, total: qty * prod.sellingPrice }],
      selectedProductId: '', quantity: '1'
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName || !form.items.length) { alert('Customer name and at least one item required.'); return; }
    await api.post('/invoices', {
      type: 'INVOICE',
      customerId: form.customerId || null,
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      customerGstin: form.customerGstin,
      items: form.items,
      discount: parseFloat(form.discount) || 0,
      paymentMethod: form.paymentMethod,
    });
    setShowModal(false);
    setForm({ customerName: '', customerPhone: '', customerGstin: '', customerId: '', discount: '0', paymentMethod: 'UPI', selectedProductId: '', quantity: '1', items: [] });
    onRefresh();
  };

  const handleMarkPaid = async (id: string) => {
    await api.patch(`/invoices/${id}/status`, { status: 'PAID' });
    onRefresh();
  };

  // ── Export Handlers ──────────────────────────────────────────────────────
  const buildExportRows = () =>
    filtered.map(inv => ({
      'Invoice #': inv.id,
      'Type': inv.type,
      'Customer': inv.customerName,
      'Phone': inv.customerPhone || '',
      'GSTIN': inv.customerGstin || '',
      'Date': fmtDate(inv.date),
      'Due Date': fmtDate(inv.dueDate),
      'Payment Mode': inv.paymentMethod || 'Cash',
      'Subtotal': fmtCurrency(inv.subtotal),
      'Tax': fmtCurrency(inv.taxAmount),
      'Discount': fmtCurrency(inv.discount),
      'Total': fmtCurrency(inv.total),
      'Status': inv.status,
    }));

  const handleExportCSV = () => exportToCSV('sales-register', buildExportRows());

  const handleExportExcel = () =>
    exportToExcel('sales-register', [
      { name: 'Sales Register', data: buildExportRows() },
      {
        name: 'Summary',
        data: [
          { Metric: 'Total Invoices', Value: invoices.length },
          { Metric: 'Total Revenue (Paid)', Value: fmtCurrency(invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + i.total, 0)) },
          { Metric: 'Pending Amount', Value: fmtCurrency(invoices.filter(i => i.status === 'PENDING').reduce((s, i) => s + i.total, 0)) },
          { Metric: 'POS Bills', Value: invoices.filter(i => i.type === 'POS').length },
          { Metric: 'Export Date', Value: new Date().toLocaleString('en-IN') },
        ],
      },
    ]);

  const handleExportPDF = () =>
    exportToPDF('sales-register', {
      title: 'Sales Register — Invoice List',
      subtitle: `${filtered.length} records · As of ${new Date().toLocaleDateString('en-IN')}`,
      columns: ['Invoice #', 'Customer', 'Date', 'Payment', 'Total', 'Status'],
      rows: filtered.map(inv => [
        inv.id, inv.customerName, fmtDate(inv.date),
        inv.paymentMethod || 'Cash', fmtCurrency(inv.total), inv.status,
      ]),
      companyInfo: {
        name: companySettings?.name || 'Zia Billing',
        gstin: companySettings?.gstin || '',
        address: companySettings?.address || '',
      },
    });

  const invoiceSubtotal = form.items.reduce((s, i) => s + i.total, 0);
  const invoiceTax = form.items.reduce((s, i) => s + i.total * (i.taxRate / 100), 0);
  const invoiceTotal = Math.max(0, invoiceSubtotal + invoiceTax - (parseFloat(form.discount) || 0));

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Filters Row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search invoice # or customer..."
            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500"
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300">
          <option value="ALL">All Statuses</option>
          <option value="PAID">Paid</option>
          <option value="PENDING">Pending</option>
          <option value="REFUNDED">Refunded</option>
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300">
          <option value="ALL">All Types</option>
          <option value="INVOICE">B2B Invoice</option>
          <option value="POS">POS Bill</option>
        </select>
        <div className="flex-1" />
        {/* Export Buttons */}
        <button onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold">
          <FileDown size={13} /> CSV
        </button>
        <button onClick={handleExportExcel}
          className="flex items-center gap-1.5 px-3 py-2 bg-teal-700 hover:bg-teal-600 text-white rounded-lg text-xs font-bold">
          <FileSpreadsheet size={13} /> Excel
        </button>
        <button onClick={handleExportPDF}
          className="flex items-center gap-1.5 px-3 py-2 bg-rose-700 hover:bg-rose-600 text-white rounded-lg text-xs font-bold">
          <FileText size={13} /> PDF
        </button>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-md">
          <Plus size={15} /> Create Tax Invoice
        </button>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-4 gap-3 text-xs">
        {[
          { label: 'Total Invoices', val: invoices.length, col: 'text-blue-400' },
          { label: 'Total Revenue', val: '₹' + invoices.filter(i=>i.status==='PAID').reduce((s,i)=>s+i.total,0).toLocaleString('en-IN'), col: 'text-emerald-400' },
          { label: 'Pending Amount', val: '₹' + invoices.filter(i=>i.status==='PENDING').reduce((s,i)=>s+i.total,0).toLocaleString('en-IN'), col: 'text-amber-400' },
          { label: 'POS Bills Today', val: invoices.filter(i=>i.type==='POS').length, col: 'text-purple-400' },
        ].map(c => (
          <div key={c.label} className="p-3 bg-slate-800/60 rounded-xl border border-slate-700">
            <span className="text-slate-400 block">{c.label}</span>
            <strong className={`text-base font-mono ${c.col}`}>{c.val}</strong>
          </div>
        ))}
      </div>

      {/* Invoices Table */}
      <div className="bg-slate-800/60 rounded-2xl border border-slate-700 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-700">
            <tr>
              <th className="p-3 text-left">Invoice #</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-left">Customer</th>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Due Date</th>
              <th className="p-3 text-left">Mode</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="p-8 text-center text-slate-500">No invoices found.</td></tr>
            )}
            {filtered.map(inv => (
              <tr key={inv.id} className="hover:bg-slate-800/50">
                <td className="p-3 font-mono font-bold text-blue-400">{inv.id}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${inv.type === 'POS' ? 'bg-emerald-950 text-emerald-400' : 'bg-indigo-950 text-indigo-400'}`}>
                    {inv.type}
                  </span>
                </td>
                <td className="p-3">
                  <p className="font-semibold text-slate-200">{inv.customerName}</p>
                  {inv.customerPhone && <p className="text-[10px] text-slate-400 font-mono">{inv.customerPhone}</p>}
                  {inv.customerGstin && <p className="text-[10px] text-slate-500 font-mono">{inv.customerGstin}</p>}
                </td>
                <td className="p-3 text-slate-300">{inv.date}</td>
                <td className="p-3 text-slate-400">{inv.dueDate || '—'}</td>
                <td className="p-3 text-slate-300">{inv.paymentMethod || 'Cash'}</td>
                <td className="p-3 text-right font-bold text-white">₹{inv.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td className="p-3 text-center">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    inv.status === 'PAID' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                    inv.status === 'REFUNDED' ? 'bg-slate-800 text-slate-300' :
                    'bg-amber-950 text-amber-400 border border-amber-800'
                  }`}>{inv.status}</span>
                </td>
                <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                  <button onClick={() => onViewInvoice(inv)} className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded text-[11px] text-white inline-flex items-center gap-1">
                    <Printer size={12} /> Print
                  </button>
                  {inv.status === 'PENDING' && (
                    <button onClick={() => handleMarkPaid(inv.id)} className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 rounded text-[11px] text-white font-bold inline-flex items-center gap-1">
                      <CheckCircle2 size={12} /> Paid
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── CREATE INVOICE MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white">Create New Tax Invoice</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white text-lg leading-none">×</button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 py-4 text-xs">
              {/* Customer selector */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 mb-1 block">Customer Name *</label>
                  <input required value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })}
                    list="customer-list" placeholder="Select or type customer..."
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" />
                  <datalist id="customer-list">
                    {customers.map(c => <option key={c.id} value={c.name} />)}
                  </datalist>
                </div>
                <div>
                  <label className="text-slate-400 mb-1 block">Phone</label>
                  <input value={form.customerPhone} onChange={e => setForm({ ...form, customerPhone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 mb-1 block">GSTIN (optional)</label>
                  <input value={form.customerGstin} onChange={e => setForm({ ...form, customerGstin: e.target.value })}
                    placeholder="29ABCDE1234F1Z5"
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono" />
                </div>
                <div>
                  <label className="text-slate-400 mb-1 block">Payment Method</label>
                  <select value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white">
                    {['Cash', 'UPI', 'Card', 'Bank Transfer', 'Credit'].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* Add Products */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <p className="font-semibold text-slate-300 mb-2">Add Line Items</p>
                <div className="flex gap-2 mb-3">
                  <select value={form.selectedProductId} onChange={e => setForm({ ...form, selectedProductId: e.target.value })}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-xs text-slate-200">
                    <option value="">Select product...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} — ₹{p.sellingPrice} (Stock: {p.stock})</option>)}
                  </select>
                  <input type="number" min="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })}
                    className="w-16 bg-slate-900 border border-slate-700 rounded p-2 text-xs text-center text-white" />
                  <button type="button" onClick={handleAddItem}
                    className="px-3 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold">
                    + Add
                  </button>
                </div>
                {form.items.length > 0 && (
                  <table className="w-full text-[11px]">
                    <thead><tr className="text-slate-400 border-b border-slate-800">
                      <th className="pb-1 text-left">Item</th>
                      <th className="pb-1 text-center">Qty</th>
                      <th className="pb-1 text-right">Price</th>
                      <th className="pb-1 text-right">GST</th>
                      <th className="pb-1 text-right">Total</th>
                      <th></th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {form.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-1 font-medium">{item.name}</td>
                          <td className="py-1 text-center">{item.quantity}</td>
                          <td className="py-1 text-right font-mono">₹{item.unitPrice}</td>
                          <td className="py-1 text-right">{item.taxRate}%</td>
                          <td className="py-1 text-right font-bold font-mono">₹{item.total.toLocaleString('en-IN')}</td>
                          <td className="py-1 text-right">
                            <button type="button" onClick={() => setForm(prev => ({ ...prev, items: prev.items.filter((_,i)=>i!==idx) }))}
                              className="text-rose-400 hover:text-rose-300 font-bold">×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Totals */}
              <div className="flex justify-between items-center text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Discount (₹)</label>
                  <input type="number" value={form.discount} onChange={e => setForm({ ...form, discount: e.target.value })}
                    className="w-28 bg-slate-950 border border-slate-700 rounded p-2 text-white" />
                </div>
                <div className="text-right space-y-1">
                  <p className="text-slate-400">Subtotal: <span className="font-mono text-slate-200">₹{invoiceSubtotal.toFixed(2)}</span></p>
                  <p className="text-slate-400">GST: <span className="font-mono text-slate-200">₹{invoiceTax.toFixed(2)}</span></p>
                  <p className="text-base font-black text-white">Total: <span className="text-emerald-400 font-mono">₹{invoiceTotal.toFixed(2)}</span></p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs shadow-md">
                  Generate & Save Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
