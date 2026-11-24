import React, { useState } from 'react';
import { Plus, DollarSign, TrendingDown } from 'lucide-react';
import type { Expense } from '../types';
import { api } from '../api';

interface Props {
  expenses: Expense[];
  expenseCategories: string[];
  onRefresh: () => void;
}

export default function ExpensesPage({ expenses, expenseCategories, onRefresh }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [form, setForm] = useState({
    category: expenseCategories[0] || 'Rent',
    amount: '', paymentMethod: 'Cash', paidTo: '', note: ''
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/expenses', form);
    setShowModal(false);
    setForm({ category: expenseCategories[0] || 'Rent', amount: '', paymentMethod: 'Cash', paidTo: '', note: '' });
    onRefresh();
  };

  const filtered = categoryFilter === 'ALL' ? expenses : expenses.filter(e => e.category === categoryFilter);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const todayTotal = expenses.filter(e => e.date === new Date().toISOString().slice(0, 10)).reduce((s, e) => s + e.amount, 0);

  // Category breakdown
  const byCat: Record<string, number> = {};
  expenses.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });
  const catList = Object.entries(byCat).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 text-xs">
        <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700">
          <DollarSign size={16} className="text-rose-400 mb-1" />
          <p className="text-slate-400">Total Expenses</p>
          <p className="text-xl font-bold text-rose-400">₹{totalExpenses.toLocaleString('en-IN')}</p>
        </div>
        <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700">
          <p className="text-slate-400">Today's Expenses</p>
          <p className="text-xl font-bold text-amber-400">₹{todayTotal.toLocaleString('en-IN')}</p>
        </div>
        <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700">
          <p className="text-slate-400">No. of Entries</p>
          <p className="text-xl font-bold text-white">{expenses.length}</p>
        </div>
        <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700">
          <p className="text-slate-400">Top Category</p>
          <p className="text-sm font-bold text-purple-400 mt-0.5 truncate">{catList[0]?.[0] || '—'}</p>
          <p className="text-[11px] text-slate-400">₹{(catList[0]?.[1] || 0).toLocaleString('en-IN')}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Category Breakdown */}
        <div className="bg-slate-800/60 rounded-2xl border border-slate-700 p-5">
          <h3 className="font-bold text-sm text-slate-200 mb-3 flex items-center gap-2">
            <TrendingDown size={16} className="text-rose-400" /> By Category
          </h3>
          <div className="space-y-2 text-xs">
            {catList.map(([cat, amt]) => {
              const pct = Math.round((amt / totalExpenses) * 100) || 0;
              return (
                <div key={cat}>
                  <div className="flex justify-between text-[11px] text-slate-300 mb-0.5">
                    <span>{cat}</span>
                    <span className="font-mono font-bold">₹{amt.toLocaleString('en-IN')} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full">
                    <div className="h-1.5 bg-rose-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expense Ledger Table */}
        <div className="col-span-2 space-y-3">
          <div className="flex items-center gap-3">
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300">
              <option value="ALL">All Categories</option>
              {expenseCategories.map((c, i) => <option key={i}>{c}</option>)}
            </select>
            <div className="flex-1" />
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold">
              <Plus size={15} /> Add Expense
            </button>
          </div>

          <div className="bg-slate-800/60 rounded-2xl border border-slate-700 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="p-3 text-left">ID</th>
                  <th className="p-3 text-left">Category</th>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Paid To</th>
                  <th className="p-3 text-left">Mode</th>
                  <th className="p-3 text-left">Note</th>
                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-500">No expenses found.</td></tr>
                )}
                {filtered.map(exp => (
                  <tr key={exp.id} className="hover:bg-slate-800/50">
                    <td className="p-3 font-mono text-slate-500">{exp.id}</td>
                    <td className="p-3 font-semibold text-slate-200">{exp.category}</td>
                    <td className="p-3 text-slate-400">{exp.date}</td>
                    <td className="p-3 text-slate-300">{exp.paidTo}</td>
                    <td className="p-3"><span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300 text-[10px]">{exp.paymentMethod}</span></td>
                    <td className="p-3 text-slate-400">{exp.note || '—'}</td>
                    <td className="p-3 text-right font-bold font-mono text-rose-400">₹{exp.amount.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── ADD EXPENSE MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-sm text-white">Record Daily Business Expense</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white text-lg">×</button>
            </div>
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Expense Category *</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white">
                  {expenseCategories.map((c, i) => <option key={i}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Amount (₹) *</label>
                <input type="number" step="0.01" required value={form.amount} onChange={e => setForm({...form, amount: e.target.value})}
                  placeholder="1500.00" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-bold text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Paid To / Vendor</label>
                  <input value={form.paidTo} onChange={e => setForm({...form, paidTo: e.target.value})} placeholder="e.g. BESCOM"
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Payment Method</label>
                  <select value={form.paymentMethod} onChange={e => setForm({...form, paymentMethod: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white">
                    {['Cash','UPI','Bank Transfer','Card'].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Remarks / Note</label>
                <input value={form.note} onChange={e => setForm({...form, note: e.target.value})}
                  placeholder="Description of this expense..." className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-rose-700 hover:bg-rose-600 text-white font-bold rounded-lg">Record Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
