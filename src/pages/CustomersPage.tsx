import React, { useState } from 'react';
import { Search, Plus, Users, CreditCard, FileDown, FileSpreadsheet, FileText } from 'lucide-react';
import type { Customer, Invoice } from '../types';
import { api } from '../api';
import { exportToCSV, exportToExcel, exportToPDF, fmtDate, fmtCurrency } from '../utils/exportUtils';

interface Props {
  customers: Customer[];
  invoices: Invoice[];
  onRefresh: () => void;
  onViewInvoice: (inv: Invoice) => void;
}

export default function CustomersPage({ customers, invoices, onRefresh, onViewInvoice }: Props) {
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', gstin: '', address: '', group: 'Retail', creditLimit: '25000'
  });

  const filtered = customers.filter(c => {
    const ms = c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search) || (c.gstin || '').includes(search.toUpperCase());
    const mg = groupFilter === 'ALL' || c.group === groupFilter;
    return ms && mg;
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/customers', form);
    setShowModal(false);
    setForm({ name: '', phone: '', email: '', gstin: '', address: '', group: 'Retail', creditLimit: '25000' });
    onRefresh();
  };

  const customerInvoices = (id: string) => invoices.filter(i => i.customerId === id || i.customerName === customers.find(c => c.id === id)?.name);

  const totalReceivables = customers.reduce((s, c) => s + (c.outstandingBalance || 0), 0);

  // ── Export Handlers ──────────────────────────────────────────────────────
  const buildCustomerRows = () =>
    filtered.map(c => ({
      'ID': c.id,
      'Name': c.name,
      'Phone': c.phone,
      'Email': c.email || '',
      'GSTIN': c.gstin || '',
      'Group': c.group,
      'Address': c.address || '',
      'Credit Limit': fmtCurrency(c.creditLimit),
      'Outstanding Balance': fmtCurrency(c.outstandingBalance || 0),
      'Loyalty Points': c.loyaltyPoints || 0,
      'Total Invoices': customerInvoices(c.id).length,
      'Joined': fmtDate(c.createdAt),
    }));

  const handleExportCSV = () => exportToCSV('customers-list', buildCustomerRows());

  const handleExportExcel = () =>
    exportToExcel('customers-report', [
      { name: 'Customers', data: buildCustomerRows() },
      {
        name: 'Receivables Summary',
        data: customers.map(c => ({
          'Customer': c.name,
          'Group': c.group,
          'Outstanding': fmtCurrency(c.outstandingBalance || 0),
          'Credit Limit': fmtCurrency(c.creditLimit),
        })),
      },
    ]);

  const handleExportPDF = () =>
    exportToPDF('customers-list', {
      title: 'Customer Master List',
      subtitle: `${filtered.length} records · ${new Date().toLocaleDateString('en-IN')}`,
      columns: ['Name', 'Phone', 'Group', 'Outstanding', 'Credit Limit', 'Invoices'],
      rows: filtered.map(c => [
        c.name, c.phone, c.group,
        fmtCurrency(c.outstandingBalance || 0),
        fmtCurrency(c.creditLimit),
        customerInvoices(c.id).length,
      ]),
    });

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 text-xs">
        <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700">
          <Users size={16} className="text-blue-400 mb-1" />
          <p className="text-slate-400">Total Customers</p>
          <p className="text-xl font-bold text-white">{customers.length}</p>
        </div>
        <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700">
          <p className="text-slate-400">Total Receivables</p>
          <p className="text-xl font-bold text-amber-400">₹{totalReceivables.toLocaleString('en-IN')}</p>
        </div>
        <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700">
          <p className="text-slate-400">Wholesale Accounts</p>
          <p className="text-xl font-bold text-blue-400">{customers.filter(c=>c.group==='Wholesale').length}</p>
        </div>
        <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700">
          <p className="text-slate-400">Retail Walk-In</p>
          <p className="text-xl font-bold text-emerald-400">{customers.filter(c=>c.group==='Retail').length}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone, or GSTIN..."
            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500" />
        </div>
        <select value={groupFilter} onChange={e => setGroupFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300">
          <option value="ALL">All Groups</option>
          <option value="Retail">Retail</option>
          <option value="Wholesale">Wholesale</option>
          <option value="VIP">VIP</option>
        </select>
        <div className="flex-1" />
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold">
          <Plus size={15} /> Add Customer
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Customer List */}
        <div className="col-span-2 bg-slate-800/60 rounded-2xl border border-slate-700 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-700">
              <tr>
                <th className="p-3 text-left">Customer</th>
                <th className="p-3 text-left">Contact</th>
                <th className="p-3 text-left">GSTIN</th>
                <th className="p-3 text-left">Group</th>
                <th className="p-3 text-right">Credit Limit</th>
                <th className="p-3 text-right">Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">No customers found.</td></tr>
              )}
              {filtered.map(c => (
                <tr key={c.id}
                  onClick={() => setSelectedCustomer(selectedCustomer?.id === c.id ? null : c)}
                  className={`cursor-pointer transition ${selectedCustomer?.id === c.id ? 'bg-blue-950/40 border-l-2 border-blue-500' : 'hover:bg-slate-800/50'}`}>
                  <td className="p-3">
                    <p className="font-bold text-slate-100">{c.name}</p>
                    <p className="text-[10px] text-slate-500">{c.id}</p>
                  </td>
                  <td className="p-3">
                    <p className="font-mono text-slate-300">{c.phone}</p>
                    <p className="text-[10px] text-slate-500">{c.email}</p>
                  </td>
                  <td className="p-3 font-mono text-slate-400 text-[11px]">{c.gstin || 'Unregistered'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      c.group === 'VIP' ? 'bg-amber-950 text-amber-400' :
                      c.group === 'Wholesale' ? 'bg-indigo-950 text-indigo-400' :
                      'bg-slate-700 text-slate-300'
                    }`}>{c.group}</span>
                  </td>
                  <td className="p-3 text-right font-mono text-slate-300">₹{(c.creditLimit || 0).toLocaleString('en-IN')}</td>
                  <td className="p-3 text-right font-bold font-mono">
                    <span className={(c.outstandingBalance || 0) > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                      ₹{(c.outstandingBalance || 0).toLocaleString('en-IN')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Customer Detail Panel */}
        <div className="bg-slate-800/60 rounded-2xl border border-slate-700 p-4 space-y-3">
          {!selectedCustomer ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-slate-500 text-xs text-center">
              <Users size={32} className="mb-2 opacity-40" />
              <p>Click any customer to view their profile, purchase history, and balances.</p>
            </div>
          ) : (
            <>
              <div className="pb-3 border-b border-slate-700">
                <h4 className="font-bold text-sm text-slate-100">{selectedCustomer.name}</h4>
                <p className="text-xs text-slate-400">{selectedCustomer.group} Account</p>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-400">Phone:</span><span className="font-mono text-slate-200">{selectedCustomer.phone}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Email:</span><span className="text-slate-300">{selectedCustomer.email || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">GSTIN:</span><span className="font-mono text-slate-300">{selectedCustomer.gstin || 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Address:</span><span className="text-slate-300 text-right max-w-[160px]">{selectedCustomer.address || '—'}</span></div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700">
                <div className="p-2 bg-slate-900 rounded text-center">
                  <p className="text-[10px] text-slate-400">Credit Limit</p>
                  <p className="text-sm font-bold text-blue-400 font-mono">₹{(selectedCustomer.creditLimit || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="p-2 bg-slate-900 rounded text-center">
                  <p className="text-[10px] text-slate-400">Outstanding</p>
                  <p className={`text-sm font-bold font-mono ${(selectedCustomer.outstandingBalance || 0) > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    ₹{(selectedCustomer.outstandingBalance || 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
              {/* Purchase History */}
              <div className="pt-2 border-t border-slate-700">
                <p className="font-semibold text-xs text-slate-300 mb-2">Recent Purchases</p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {customerInvoices(selectedCustomer.id).length === 0 ? (
                    <p className="text-slate-500 text-[11px] text-center py-3">No invoices found.</p>
                  ) : (
                    customerInvoices(selectedCustomer.id).slice(0, 8).map(inv => (
                      <div key={inv.id} onClick={() => onViewInvoice(inv)}
                        className="flex justify-between items-center p-2 bg-slate-900 rounded cursor-pointer hover:bg-slate-800 transition">
                        <div>
                          <p className="font-mono text-[10px] text-blue-400 font-bold">{inv.id}</p>
                          <p className="text-[10px] text-slate-500">{inv.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-[11px] font-bold text-white">₹{inv.total.toLocaleString('en-IN')}</p>
                          <span className={`text-[9px] font-bold ${inv.status === 'PAID' ? 'text-emerald-400' : 'text-amber-400'}`}>{inv.status}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── ADD CUSTOMER MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-sm text-white">Add New Customer Profile</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white text-lg">×</button>
            </div>
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Customer / Org Name *</label>
                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Phone Number *</label>
                  <input required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">GSTIN</label>
                  <input value={form.gstin} onChange={e => setForm({...form, gstin: e.target.value})} placeholder="29ABCDE1234F1Z5"
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Customer Group</label>
                  <select value={form.group} onChange={e => setForm({...form, group: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white">
                    <option>Retail</option>
                    <option>Wholesale</option>
                    <option>VIP</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Full Delivery Address</label>
                <textarea rows={2} value={form.address} onChange={e => setForm({...form, address: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Credit Limit (₹)</label>
                <input type="number" value={form.creditLimit} onChange={e => setForm({...form, creditLimit: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg">Save Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
