import React from 'react';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import type { DashboardStats, Invoice, Product } from '../types';

interface Props {
  stats: DashboardStats;
  invoices: Invoice[];
  onNavigate: (tab: string) => void;
}

const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 0 });
const fmtCur = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2 });

export default function DashboardPage({ stats, invoices, onNavigate }: Props) {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* ── Row 1: KPI Cards ── */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Today's Sales" value={fmtCur(stats.todaySales || 0)} sub={`${stats.todayInvoicesCount || 0} bills today`} color="emerald" />
        <KpiCard label="Total Revenue" value={fmtCur(stats.totalRevenue || 0)} sub={`${stats.totalInvoices || 0} total invoices`} color="blue" />
        <KpiCard label="Outstanding Receivables" value={fmtCur(stats.outstandingPayments || 0)} sub="Customer balances due" color="amber" />
        <KpiCard label="Low-Stock Warnings" value={`${stats.lowStockCount || 0} Items`} sub="Below minimum threshold" color="rose" />
      </div>

      {/* ── Row 2: Payment Method Breakdown ── */}
      <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700">
        <h3 className="font-bold text-sm text-slate-100 mb-4">Sales by Payment Method</h3>
        <div className="grid grid-cols-4 gap-4 text-xs">
          {[
            { label: 'Cash In Hand', key: 'Cash', col: 'text-emerald-400' },
            { label: 'UPI / QR Code', key: 'UPI', col: 'text-blue-400' },
            { label: 'Card Swipe (POS)', key: 'Card', col: 'text-purple-400' },
            { label: 'Bank NEFT/RTGS', key: 'Bank', col: 'text-amber-400' },
          ].map(m => (
            <div key={m.key} className="p-4 bg-slate-900 rounded-xl border border-slate-800 text-center">
              <span className="text-slate-400 block mb-1">{m.label}</span>
              <strong className={`text-lg font-mono ${m.col}`}>
                ₹{fmt((stats.paymentSplit as any)?.[m.key] || 0)}
              </strong>
            </div>
          ))}
        </div>
      </div>

      {/* ── Row 3: Top Products + Low Stock Alerts ── */}
      <div className="grid grid-cols-2 gap-5">
        {/* Top Selling */}
        <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-400" /> Top-Selling Products
            </h3>
            <button onClick={() => onNavigate('reports')} className="text-[11px] text-blue-400 hover:underline flex items-center gap-1">
              View Reports <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-2 text-xs">
            {stats.topProducts?.length ? stats.topProducts.map((p, idx) => (
              <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-900/60 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-950 text-blue-400 text-[10px] font-bold flex items-center justify-center">{idx+1}</span>
                  <span className="font-medium text-slate-200 truncate max-w-[180px]">{p.name}</span>
                </div>
                <span className="bg-blue-950 text-blue-400 border border-blue-800 px-2 py-0.5 rounded font-mono font-bold text-[11px]">{p.qty} sold</span>
              </div>
            )) : <p className="text-slate-500 text-center py-4">No sales recorded yet.</p>}
          </div>
        </div>

        {/* Low Stock */}
        <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-rose-300 flex items-center gap-2">
              <AlertCircle size={16} /> Urgent Low-Stock Alerts
            </h3>
            <button onClick={() => onNavigate('inventory')} className="text-[11px] text-blue-400 hover:underline flex items-center gap-1">
              Restock <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-2 text-xs">
            {stats.lowStockAlerts?.length ? stats.lowStockAlerts.map((prod) => (
              <div key={prod.id} className="flex justify-between items-center p-2.5 bg-slate-900/60 rounded-lg">
                <div>
                  <span className="font-semibold text-slate-200">{prod.name}</span>
                  <span className="text-[10px] text-slate-500 block font-mono">{prod.sku}</span>
                </div>
                <span className="bg-rose-950 text-rose-400 border border-rose-800 px-2 py-0.5 rounded font-bold">{prod.stock} {prod.unit}</span>
              </div>
            )) : <p className="text-emerald-400 text-center py-4 flex items-center justify-center gap-2"><CheckCircle2 size={15}/> All products adequately stocked.</p>}
          </div>
        </div>
      </div>

      {/* ── Row 4: Recent Invoices Table ── */}
      <div className="bg-slate-800/60 rounded-2xl border border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-100">Recent Transactions</h3>
          <button onClick={() => onNavigate('sales')} className="text-[11px] text-blue-400 hover:underline flex items-center gap-1">
            All Invoices <ArrowRight size={12} />
          </button>
        </div>
        <table className="w-full text-xs">
          <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-700">
            <tr>
              <th className="p-3 text-left">Invoice #</th>
              <th className="p-3 text-left">Customer</th>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Mode</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {invoices.slice(0, 6).map(inv => (
              <tr key={inv.id} className="hover:bg-slate-800/60">
                <td className="p-3 font-mono font-bold text-blue-400">{inv.id}</td>
                <td className="p-3 font-semibold text-slate-200">{inv.customerName}</td>
                <td className="p-3 text-slate-400">{inv.date}</td>
                <td className="p-3 text-slate-300">{inv.paymentMethod || 'Cash'}</td>
                <td className="p-3 text-right font-bold text-white">₹{inv.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    inv.status === 'PAID' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                    inv.status === 'REFUNDED' ? 'bg-slate-800 text-slate-400' :
                    'bg-amber-950 text-amber-400 border border-amber-800'
                  }`}>{inv.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  const colorClass = {
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    amber: 'text-amber-400',
    rose: 'text-rose-400',
  }[color] ?? 'text-white';

  return (
    <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 shadow-sm">
      <p className="text-xs font-medium text-slate-400 mb-1">{label}</p>
      <p className={`text-2xl font-black mt-1 ${colorClass}`}>{value}</p>
      <span className="text-[11px] text-slate-500 mt-1 block">{sub}</span>
    </div>
  );
}
