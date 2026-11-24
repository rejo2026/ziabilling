import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Unlock, 
  Receipt, 
  Printer, 
  FileText,
  RotateCcw
} from 'lucide-react';
import { CashRegisterShift } from '../types';

interface CashRegisterPageProps {
  isRTL: boolean;
  currentUserId?: string;
  currentUserName?: string;
  selectedBranchId?: string;
}

export default function CashRegisterPage({
  isRTL,
  currentUserId = 'USR-001',
  currentUserName = 'Sales Cashier',
  selectedBranchId = 'BR-DXB-01'
}: CashRegisterPageProps) {
  const [activeShift, setActiveShift] = useState<CashRegisterShift | null>(null);
  const [openingFloat, setOpeningFloat] = useState('500');
  const [closingCash, setClosingCash] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [loading, setLoading] = useState(true);

  const loadRegisterStatus = () => {
    setLoading(true);
    fetch(`http://localhost:4200/api/pos/register/status?branchId=${selectedBranchId}`)
      .then(res => res.json())
      .then(d => {
        setActiveShift(d.shift || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadRegisterStatus();
  }, [selectedBranchId]);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:4200/api/pos/register/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: selectedBranchId,
          openingFloat: Number(openingFloat) || 0,
          userId: currentUserId,
          cashierName: currentUserName
        })
      });
      if (res.ok) {
        loadRegisterStatus();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;
    try {
      const res = await fetch('http://localhost:4200/api/pos/register/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId: activeShift.id,
          closingCountedCash: Number(closingCash) || 0,
          notes: closingNotes
        })
      });
      if (res.ok) {
        setClosingCash('');
        setClosingNotes('');
        loadRegisterStatus();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-500" />
            <span>{isRTL ? 'إدارة صندوق النقدية وورديات المحاسب' : 'Cash Register Shifts & Drawer Reconciliation'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isRTL 
              ? 'فتح الوردية بعهدة نقدية افتتاحية، تتبع مبيعات نقطة البيع النقدية، وإغلاق الوردية بمطابقة العجز والفائض'
              : 'Open cashier shift with opening cash float, track drawer transactions, and reconcile variances on shift close.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeShift ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Shift Active ({activeShift.id})</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs font-bold">
              <Lock className="w-3.5 h-3.5" />
              <span>Register Closed</span>
            </span>
          )}
        </div>
      </div>

      {!activeShift ? (
        /* Open Shift Card */
        <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 rounded-2xl bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400 mx-auto mb-2">
              <Unlock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">
              {isRTL ? 'فتح وردية صندوق جديدة' : 'Start New Cashier Shift'}
            </h3>
            <p className="text-xs text-slate-400">
              {isRTL ? 'أدخل العهدة النقدية الافتتاحية في درج الكاشير' : 'Count physical cash float present in drawer to begin checkout.'}
            </p>
          </div>

          <form onSubmit={handleOpenShift} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                {isRTL ? 'المحاسب المسؤول' : 'Assigned Cashier'}
              </label>
              <input
                type="text"
                disabled
                value={currentUserName}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-400 font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                {isRTL ? 'العهدة النقدية الافتتاحية (AED)' : 'Opening Cash Float (AED)'} *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={openingFloat}
                onChange={e => setOpeningFloat(e.target.value)}
                placeholder="500.00"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono text-base focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold cursor-pointer transition-all shadow-lg shadow-emerald-600/30"
            >
              {isRTL ? 'تأكيد وفتح الصندوق' : 'Confirm & Open Register Shift'}
            </button>
          </form>
        </div>
      ) : (
        /* Active Shift Dashboard & Close Shift Form */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            {/* Live Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <span className="text-[11px] text-slate-400 font-medium block">Opening Float</span>
                <div className="text-lg font-bold text-white mt-1 font-mono">
                  AED {Number(activeShift.openingFloatCash || 0).toFixed(2)}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <span className="text-[11px] text-slate-400 font-medium block">Total Cash Sales</span>
                <div className="text-lg font-bold text-emerald-400 mt-1 font-mono">
                  AED {Number(activeShift.cashSales || 0).toFixed(2)}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <span className="text-[11px] text-slate-400 font-medium block">Expected Drawer Cash</span>
                <div className="text-lg font-bold text-blue-400 mt-1 font-mono">
                  AED {((Number(activeShift.openingFloatCash) || 0) + (Number(activeShift.cashSales) || 0) - (Number(activeShift.cashExpenses) || 0)).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Shift Timeline */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 text-xs text-slate-300">
              <h4 className="font-bold text-sm text-white">Shift Information</h4>
              <div className="flex justify-between border-b border-slate-800 py-2">
                <span className="text-slate-400">Shift ID:</span>
                <span className="font-mono text-white">{activeShift.id}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 py-2">
                <span className="text-slate-400">Cashier:</span>
                <span className="font-semibold text-white">{activeShift.cashierName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 py-2">
                <span className="text-slate-400">Opened At:</span>
                <span className="font-mono text-slate-300">{new Date(activeShift.openedAt).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Close Shift Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-rose-500" />
              <span>{isRTL ? 'إغلاق الوردية والمطابقة' : 'Reconcile & Close Shift'}</span>
            </h3>
            <p className="text-xs text-slate-400">
              Count actual physical currency in drawer. System will calculate any cash variance automatically.
            </p>

            <form onSubmit={handleCloseShift} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {isRTL ? 'النقد المحسوب فعلياً بالدرج (AED)' : 'Physical Counted Cash (AED)'} *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={closingCash}
                  onChange={e => setClosingCash(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono text-base focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {isRTL ? 'ملاحظات المحاسب / سبب الفارق' : 'Reconciliation Notes'}
                </label>
                <textarea
                  value={closingNotes}
                  onChange={e => setClosingNotes(e.target.value)}
                  placeholder="e.g. Exact match with daily counter sales"
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold cursor-pointer transition-all shadow-lg shadow-rose-600/30"
              >
                {isRTL ? 'إغلاق الوردية وطباعة التقرير' : 'Close Shift & Print Summary'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
