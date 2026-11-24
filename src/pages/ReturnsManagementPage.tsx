import React, { useState, useEffect } from 'react';
import { 
  RotateCcw, 
  Search, 
  Plus, 
  Receipt, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  FileText, 
  X,
  Truck,
  ShieldAlert
} from 'lucide-react';
import { SalesReturn } from '../types';

interface ReturnsManagementProps {
  isRTL: boolean;
  branches: any[];
  onRefresh: () => void;
}

export default function ReturnsManagementPage({ isRTL, branches, onRefresh }: ReturnsManagementProps) {
  const [activeTab, setActiveTab] = useState<'sales' | 'purchases'>('sales');
  const [salesReturns, setSalesReturns] = useState<SalesReturn[]>([]);
  const [purchaseReturns, setPurchaseReturns] = useState<any[]>([]);
  const [showAddSalesReturn, setShowAddSalesReturn] = useState(false);

  const [newReturn, setNewReturn] = useState({
    originalInvoiceId: '',
    customerName: 'Walk-in Customer',
    partName: '',
    productId: '',
    quantity: '1',
    unitPrice: '',
    taxRate: '5',
    returnReason: 'WRONG_FITMENT',
    restockCondition: 'RESALABLE' as const,
    refundMethod: 'CASH' as const,
    notes: ''
  });

  const loadReturns = () => {
    fetch('http://localhost:4200/api/sales/returns')
      .then(r => r.json())
      .then(d => Array.isArray(d) && setSalesReturns(d))
      .catch(() => {});

    fetch('http://localhost:4200/api/purchases/returns')
      .then(r => r.json())
      .then(d => Array.isArray(d) && setPurchaseReturns(d))
      .catch(() => {});
  };

  useEffect(() => {
    loadReturns();
  }, []);

  const handleCreateSalesReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        originalInvoiceId: newReturn.originalInvoiceId || `INV-${Date.now().toString().slice(-4)}`,
        customerName: newReturn.customerName,
        items: [
          {
            name: newReturn.partName,
            productId: newReturn.productId || undefined,
            quantity: Number(newReturn.quantity) || 1,
            unitPrice: Number(newReturn.unitPrice) || 0,
            taxRate: Number(newReturn.taxRate) || 5
          }
        ],
        returnReason: newReturn.returnReason,
        restockCondition: newReturn.restockCondition,
        refundMethod: newReturn.refundMethod,
        notes: newReturn.notes
      };

      const res = await fetch('http://localhost:4200/api/sales/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowAddSalesReturn(false);
        setNewReturn({
          originalInvoiceId: '',
          customerName: 'Walk-in Customer',
          partName: '',
          productId: '',
          quantity: '1',
          unitPrice: '',
          taxRate: '5',
          returnReason: 'WRONG_FITMENT',
          restockCondition: 'RESALABLE',
          refundMethod: 'CASH',
          notes: ''
        });
        loadReturns();
        onRefresh();
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
            <RotateCcw className="w-6 h-6 text-amber-500" />
            <span>{isRTL ? 'إدارة المرتجعات والإشعارات الدائنة والمدينة' : 'Returns, Credit Notes & Debit Notes'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isRTL 
              ? 'معالجة إرجاع قطع الغيار غير المطابقة وإصدار إشعارات دائنة ضريبية مع فحص حالة إعادة المخزون'
              : 'Process wrong-fitment customer spare parts returns with FTA Credit Notes and restocking logic.'}
          </p>
        </div>

        <button
          onClick={() => setShowAddSalesReturn(true)}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2.5 rounded-xl font-semibold text-xs transition-colors shadow-lg shadow-amber-600/30 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{isRTL ? 'إصدار إشعار دائن (مرتجع مبيعات)' : 'Issue Sales Credit Note'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('sales')}
          className={`px-4 py-2 rounded-xl transition-colors cursor-pointer ${
            activeTab === 'sales'
              ? 'bg-amber-600 text-white'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          {isRTL ? 'مرتجعات مبيعات العملاء (Credit Notes)' : 'Customer Sales Returns (Credit Notes)'}
        </button>
        <button
          onClick={() => setActiveTab('purchases')}
          className={`px-4 py-2 rounded-xl transition-colors cursor-pointer ${
            activeTab === 'purchases'
              ? 'bg-amber-600 text-white'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          {isRTL ? 'مرتجعات الموردين (Debit Notes)' : 'Supplier Purchase Returns (Debit Notes)'}
        </button>
      </div>

      {/* Tables */}
      {activeTab === 'sales' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3.5">{isRTL ? 'رقم الإشعار الدائن' : 'Credit Note #'}</th>
                <th className="p-3.5">{isRTL ? 'الفاتورة الأصلية' : 'Original Invoice'}</th>
                <th className="p-3.5">{isRTL ? 'العميل' : 'Customer'}</th>
                <th className="p-3.5">{isRTL ? 'القطع المسترجعة' : 'Returned Parts'}</th>
                <th className="p-3.5">{isRTL ? 'سبب الإرجاع' : 'Reason'}</th>
                <th className="p-3.5">{isRTL ? 'حالة إعادة الإدخال' : 'Restock Decision'}</th>
                <th className="p-3.5 text-right">{isRTL ? 'قيمة الاسترداد' : 'Refund Total (AED)'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {salesReturns && salesReturns.length > 0 ? (
                salesReturns.map(r => (
                  <tr key={r.id} className="hover:bg-slate-800/40">
                    <td className="p-3.5 font-mono text-amber-400 font-bold">{r.creditNoteNo}</td>
                    <td className="p-3.5 font-mono text-slate-400">{r.originalInvoiceId}</td>
                    <td className="p-3.5 font-semibold text-white">{r.customerName}</td>
                    <td className="p-3.5">
                      {(r.items || []).map((it, idx) => (
                        <span key={idx} className="block text-slate-200">
                          {it.quantity}x {it.name}
                        </span>
                      ))}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
                        {r.returnReason}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.restockCondition === 'RESALABLE'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}>
                        {r.restockCondition}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-mono text-white font-bold">
                      AED {Number(r.grandTotalRefund || 0).toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    {isRTL ? 'لا توجد مرتجعات مبيعات مسجلة.' : 'No sales returns logged yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3.5">{isRTL ? 'رقم الإشعار المدين' : 'Debit Note #'}</th>
                <th className="p-3.5">{isRTL ? 'المورد' : 'Supplier'}</th>
                <th className="p-3.5">{isRTL ? 'سبب الإرجاع للمورد' : 'Reason'}</th>
                <th className="p-3.5 text-right">{isRTL ? 'القيمة الإجمالية' : 'Total Amount (AED)'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {purchaseReturns && purchaseReturns.length > 0 ? (
                purchaseReturns.map(p => (
                  <tr key={p.id} className="hover:bg-slate-800/40">
                    <td className="p-3.5 font-mono text-blue-400 font-bold">{p.debitNoteNo}</td>
                    <td className="p-3.5 font-semibold text-white">{p.supplierName}</td>
                    <td className="p-3.5 text-slate-400">{p.returnReason}</td>
                    <td className="p-3.5 text-right font-mono text-white font-bold">
                      AED {Number(p.totalAmount || 0).toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    {isRTL ? 'لا توجد مرتجعات مشتريات للموردين.' : 'No purchase returns logged yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* New Return Modal */}
      {showAddSalesReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 text-white space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-500" />
                <span>Issue Customer Credit Note (Sales Return)</span>
              </h3>
              <button onClick={() => setShowAddSalesReturn(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateSalesReturn} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Original Invoice #</label>
                  <input
                    type="text"
                    value={newReturn.originalInvoiceId}
                    onChange={e => setNewReturn({ ...newReturn, originalInvoiceId: e.target.value })}
                    placeholder="e.g. POS-2026-001"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={newReturn.customerName}
                    onChange={e => setNewReturn({ ...newReturn, customerName: e.target.value })}
                    placeholder="Walk-in / Garage Name"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Returned Part Name *</label>
                <input
                  type="text"
                  required
                  value={newReturn.partName}
                  onChange={e => setNewReturn({ ...newReturn, partName: e.target.value })}
                  placeholder="e.g. Front Ceramic Brake Pads Set"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Quantity Returned *</label>
                  <input
                    type="number"
                    required
                    value={newReturn.quantity}
                    onChange={e => setNewReturn({ ...newReturn, quantity: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Unit Price Paid (AED) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newReturn.unitPrice}
                    onChange={e => setNewReturn({ ...newReturn, unitPrice: e.target.value })}
                    placeholder="280.00"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Return Reason</label>
                  <select
                    value={newReturn.returnReason}
                    onChange={e => setNewReturn({ ...newReturn, returnReason: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    <option value="WRONG_FITMENT">Wrong Vehicle Fitment (خطأ بالمقاس)</option>
                    <option value="DEFECTIVE_PART">Defective / Damaged Part (عطل مصنعي)</option>
                    <option value="CUSTOMER_MIND">Customer Changed Mind (تراجع العميل)</option>
                    <option value="EXCESS_ORDER">Excess Workshop Stock (فائض طلب ورشة)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Restock Condition</label>
                  <select
                    value={newReturn.restockCondition}
                    onChange={e => setNewReturn({ ...newReturn, restockCondition: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    <option value="RESALABLE">Resalable (Return to Available Stock)</option>
                    <option value="DAMAGED">Damaged (Send to Quarantine / Scrap)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddSalesReturn(false)}
                  className="px-4 py-2 rounded-xl text-slate-300 bg-slate-800 hover:bg-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-white bg-amber-600 hover:bg-amber-500 text-xs font-bold cursor-pointer"
                >
                  Confirm Return & Issue Credit Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
