// ============================================================
// SubscriptionsPage — Zoho-Billing-style recurring plans,
// customer subscriptions, coupons & add-ons
// ============================================================
import React, { useState, useEffect } from 'react';
import {
  Repeat, Plus, Search, X, Trash2, Pause, Play, Ban, RotateCcw,
  CheckCircle2, PauseCircle, XCircle, Zap, Tag, Package, BarChart3, ArrowUpDown
} from 'lucide-react';
import { RecurringPlan, CustomerSubscription, Coupon, AddOn, Customer } from '../types';
import { api } from '../api';

interface SubscriptionsPageProps {
  plans: RecurringPlan[];
  subscriptions: CustomerSubscription[];
  coupons: Coupon[];
  addOns: AddOn[];
  customers: Customer[];
  onRefresh: () => void;
}

const subStatusColors: Record<string, string> = {
  ACTIVE: 'bg-green-600/20 text-green-400',
  PAUSED: 'bg-amber-600/20 text-amber-400',
  CANCELLED: 'bg-red-600/20 text-red-400',
};
const subStatusIcons: Record<string, React.ReactNode> = {
  ACTIVE: <CheckCircle2 className="w-3 h-3" />,
  PAUSED: <PauseCircle className="w-3 h-3" />,
  CANCELLED: <XCircle className="w-3 h-3" />,
};

type InnerTab = 'subscriptions' | 'plans' | 'coupons' | 'analytics';

interface Analytics {
  mrr: number;
  statusCounts: { ACTIVE: number; PAUSED: number; CANCELLED: number };
  churnRate: number;
  totalSubscriptions: number;
}

export default function SubscriptionsPage({ plans, subscriptions, coupons, addOns, customers, onRefresh }: SubscriptionsPageProps) {
  const [innerTab, setInnerTab] = useState<InnerTab>('subscriptions');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [runningCycle, setRunningCycle] = useState(false);

  const [showSubModal, setShowSubModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [showAddOnModal, setShowAddOnModal] = useState(false);

  const [changePlanSub, setChangePlanSub] = useState<CustomerSubscription | null>(null);
  const [changePlanNewId, setChangePlanNewId] = useState('');
  const [changePlanPreview, setChangePlanPreview] = useState<{ remainingDays: number; credit: number; charge: number; netProration: number } | null>(null);
  const [changePlanLoading, setChangePlanLoading] = useState(false);

  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  useEffect(() => {
    if (innerTab === 'analytics') {
      api.get<Analytics>('/subscriptions/analytics').then(setAnalytics).catch(() => {});
    }
  }, [innerTab]);

  // New subscription form
  const [subCustomerId, setSubCustomerId] = useState('');
  const [subPlanId, setSubPlanId] = useState('');
  const [subCoupon, setSubCoupon] = useState('');
  const [subAddOnIds, setSubAddOnIds] = useState<string[]>([]);
  const [subLoading, setSubLoading] = useState(false);

  // New plan form
  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [planAmount, setPlanAmount] = useState('');
  const [planCycle, setPlanCycle] = useState<'MONTHLY' | 'QUARTERLY' | 'YEARLY'>('MONTHLY');
  const [planTaxRate, setPlanTaxRate] = useState('18');
  const [planLoading, setPlanLoading] = useState(false);

  // New coupon form
  const [couponCode, setCouponCode] = useState('');
  const [couponType, setCouponType] = useState<'PERCENT' | 'FLAT'>('PERCENT');
  const [couponValue, setCouponValue] = useState('');
  const [couponExpiry, setCouponExpiry] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  // New add-on form
  const [addOnName, setAddOnName] = useState('');
  const [addOnAmount, setAddOnAmount] = useState('');
  const [addOnLoading, setAddOnLoading] = useState(false);

  const filteredSubs = subscriptions.filter(s => s.customerName.toLowerCase().includes(search.toLowerCase()));

  async function handleCreateSubscription() {
    if (!subCustomerId || !subPlanId) return;
    setSubLoading(true);
    try {
      await api.post('/subscriptions', { customerId: subCustomerId, planId: subPlanId, couponCode: subCoupon || null, addOnIds: subAddOnIds });
      onRefresh();
      setShowSubModal(false);
      setSubCustomerId(''); setSubPlanId(''); setSubCoupon(''); setSubAddOnIds([]);
    } catch {
      alert('Failed to create subscription.');
    } finally {
      setSubLoading(false);
    }
  }

  async function handleTransition(id: string, action: 'pause' | 'resume' | 'cancel' | 'reactivate') {
    setBusyId(id);
    try {
      await api.post(`/subscriptions/${id}/${action}`, {});
      onRefresh();
    } catch {
      alert(`Failed to ${action} subscription.`);
    } finally {
      setBusyId(null);
    }
  }

  function cycleDays(billingCycle: string) {
    if (billingCycle === 'YEARLY') return 365;
    if (billingCycle === 'QUARTERLY') return 91;
    return 30;
  }

  function previewProration(sub: CustomerSubscription, newPlanId: string) {
    const oldPlan = plans.find(p => p.id === sub.planId);
    const newPlan = plans.find(p => p.id === newPlanId);
    if (!newPlan) return null;
    const totalDays = cycleDays(oldPlan ? oldPlan.billingCycle : 'MONTHLY');
    const cycleStart = new Date(new Date(sub.nextBillingDate).getTime() - totalDays * 86400000);
    const daysElapsed = Math.max(0, Math.min(totalDays, Math.round((Date.now() - cycleStart.getTime()) / 86400000)));
    const remainingDays = Math.max(0, totalDays - daysElapsed);
    const oldDailyRate = oldPlan ? oldPlan.amount / cycleDays(oldPlan.billingCycle) : 0;
    const newDailyRate = newPlan.amount / cycleDays(newPlan.billingCycle);
    const credit = Math.round(oldDailyRate * remainingDays * 100) / 100;
    const charge = Math.round(newDailyRate * remainingDays * 100) / 100;
    return { remainingDays, credit, charge, netProration: Math.round((charge - credit) * 100) / 100 };
  }

  function openChangePlan(sub: CustomerSubscription) {
    setChangePlanSub(sub);
    setChangePlanNewId('');
    setChangePlanPreview(null);
  }

  function selectNewPlan(newPlanId: string) {
    setChangePlanNewId(newPlanId);
    if (changePlanSub) setChangePlanPreview(previewProration(changePlanSub, newPlanId));
  }

  async function handleConfirmChangePlan() {
    if (!changePlanSub || !changePlanNewId) return;
    setChangePlanLoading(true);
    try {
      await api.post(`/subscriptions/${changePlanSub.id}/change-plan`, { newPlanId: changePlanNewId });
      onRefresh();
      setChangePlanSub(null);
    } catch {
      alert('Failed to change plan.');
    } finally {
      setChangePlanLoading(false);
    }
  }

  async function handleRunBillingCycle() {
    setRunningCycle(true);
    try {
      const result = await api.post<{ generatedCount: number }>('/subscriptions/run-billing-cycle', {});
      onRefresh();
      alert(`Billing cycle complete. ${result.generatedCount} invoice(s) generated.`);
    } catch {
      alert('Billing cycle failed.');
    } finally {
      setRunningCycle(false);
    }
  }

  async function handleCreatePlan() {
    if (!planName || !planAmount) return;
    setPlanLoading(true);
    try {
      await api.post('/subscriptions/plans', { name: planName, description: planDescription, amount: parseFloat(planAmount), billingCycle: planCycle, taxRate: parseFloat(planTaxRate) || 0 });
      onRefresh();
      setShowPlanModal(false);
      setPlanName(''); setPlanDescription(''); setPlanAmount(''); setPlanCycle('MONTHLY'); setPlanTaxRate('18');
    } catch {
      alert('Failed to create plan.');
    } finally {
      setPlanLoading(false);
    }
  }

  async function handleTogglePlan(plan: RecurringPlan) {
    await api.patch(`/subscriptions/plans/${plan.id}`, { isActive: !plan.isActive });
    onRefresh();
  }

  async function handleCreateCoupon() {
    if (!couponCode || !couponValue) return;
    setCouponLoading(true);
    try {
      await api.post('/subscriptions/coupons', { code: couponCode, type: couponType, value: parseFloat(couponValue), expiresAt: couponExpiry || null });
      onRefresh();
      setShowCouponModal(false);
      setCouponCode(''); setCouponValue(''); setCouponExpiry('');
    } catch {
      alert('Failed to create coupon.');
    } finally {
      setCouponLoading(false);
    }
  }

  async function handleCreateAddOn() {
    if (!addOnName || !addOnAmount) return;
    setAddOnLoading(true);
    try {
      await api.post('/subscriptions/addons', { name: addOnName, amount: parseFloat(addOnAmount) });
      onRefresh();
      setShowAddOnModal(false);
      setAddOnName(''); setAddOnAmount('');
    } catch {
      alert('Failed to create add-on.');
    } finally {
      setAddOnLoading(false);
    }
  }

  function toggleAddOnSelection(id: string) {
    setSubAddOnIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2"><Repeat className="w-5 h-5" /> Subscription Billing</h2>
          <p className="text-xs text-slate-400">Recurring plans, customer subscriptions, coupons & add-ons</p>
        </div>
        <button
          onClick={handleRunBillingCycle}
          disabled={runningCycle}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
        >
          <Zap className="w-4 h-4" /> {runningCycle ? 'Running…' : 'Run Billing Cycle Now'}
        </button>
      </div>

      {/* Inner tabs */}
      <div className="flex gap-2 border-b border-slate-700">
        {([
          { key: 'subscriptions', label: `Active Subscriptions (${subscriptions.length})` },
          { key: 'plans', label: `Plans (${plans.length})` },
          { key: 'coupons', label: `Coupons & Add-ons (${coupons.length + addOns.length})` },
          { key: 'analytics', label: 'Analytics' },
        ] as { key: InnerTab; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setInnerTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${innerTab === t.key ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* --- Subscriptions tab --- */}
      {innerTab === 'subscriptions' && (
        <div className="flex flex-col gap-3 flex-1">
          <div className="flex gap-2 flex-wrap items-center justify-between">
            <div className="relative flex-1 min-w-48 max-w-sm">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                placeholder="Search by customer…"
                value={search} onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowSubModal(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" /> New Subscription
            </button>
          </div>

          <div className="flex-1 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden flex flex-col">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-sm">
                <thead className="bg-slate-900 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Subscription #</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Customer</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Plan</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Next Billing</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Amount</th>
                    <th className="text-center px-4 py-3 text-slate-400 font-medium">Status</th>
                    <th className="text-center px-4 py-3 text-slate-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filteredSubs.map(s => (
                    <tr key={s.id} className="hover:bg-slate-750 transition-colors">
                      <td className="px-4 py-3 text-indigo-400 font-mono text-xs">{s.id}</td>
                      <td className="px-4 py-3 text-white font-medium">{s.customerName}</td>
                      <td className="px-4 py-3 text-slate-300">{s.planName}</td>
                      <td className="px-4 py-3 text-slate-300 text-xs">{new Date(s.nextBillingDate).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-3 text-right text-white font-semibold">₹{s.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${subStatusColors[s.status] || 'bg-slate-700 text-slate-300'}`}>
                          {subStatusIcons[s.status]} {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {s.status === 'ACTIVE' && (
                            <button onClick={() => openChangePlan(s)} title="Change Plan"
                              className="text-sky-400 hover:text-sky-300"><ArrowUpDown className="w-4 h-4" /></button>
                          )}
                          {s.status === 'ACTIVE' && (
                            <button disabled={busyId === s.id} onClick={() => handleTransition(s.id, 'pause')} title="Pause"
                              className="text-amber-400 hover:text-amber-300 disabled:opacity-40"><Pause className="w-4 h-4" /></button>
                          )}
                          {s.status === 'PAUSED' && (
                            <button disabled={busyId === s.id} onClick={() => handleTransition(s.id, 'resume')} title="Resume"
                              className="text-green-400 hover:text-green-300 disabled:opacity-40"><Play className="w-4 h-4" /></button>
                          )}
                          {(s.status === 'ACTIVE' || s.status === 'PAUSED') && (
                            <button disabled={busyId === s.id} onClick={() => handleTransition(s.id, 'cancel')} title="Cancel"
                              className="text-red-400 hover:text-red-300 disabled:opacity-40"><Ban className="w-4 h-4" /></button>
                          )}
                          {s.status === 'CANCELLED' && (
                            <button disabled={busyId === s.id} onClick={() => handleTransition(s.id, 'reactivate')} title="Reactivate"
                              className="text-indigo-400 hover:text-indigo-300 disabled:opacity-40"><RotateCcw className="w-4 h-4" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredSubs.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <Repeat className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>No subscriptions found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- Plans tab --- */}
      {innerTab === 'plans' && (
        <div className="flex flex-col gap-3 flex-1">
          <div className="flex justify-end">
            <button onClick={() => setShowPlanModal(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
              <Plus className="w-4 h-4" /> New Plan
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {plans.map(p => (
              <div key={p.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold">{p.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.isActive ? 'bg-green-600/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>{p.isActive ? 'Active' : 'Inactive'}</span>
                </div>
                <p className="text-xs text-slate-400">{p.description}</p>
                <p className="text-2xl font-bold text-white">₹{p.amount.toLocaleString('en-IN')}<span className="text-xs text-slate-400 font-normal"> / {p.billingCycle.toLowerCase()}</span></p>
                <p className="text-xs text-slate-400">Tax: {p.taxRate}%</p>
                <button onClick={() => handleTogglePlan(p)} className="mt-2 text-xs text-indigo-400 hover:underline self-start">
                  {p.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- Analytics tab --- */}
      {innerTab === 'analytics' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-xs text-slate-400 flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5" /> Monthly Recurring Revenue</p>
            <p className="text-2xl font-bold text-white mt-1">₹{(analytics?.mrr ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-xs text-slate-400">Active Subscriptions</p>
            <p className="text-2xl font-bold text-green-400 mt-1">{analytics?.statusCounts.ACTIVE ?? 0}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-xs text-slate-400">Paused / Cancelled</p>
            <p className="text-2xl font-bold text-white mt-1">{analytics?.statusCounts.PAUSED ?? 0} / {analytics?.statusCounts.CANCELLED ?? 0}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-xs text-slate-400">30-Day Churn Rate</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{analytics?.churnRate ?? 0}%</p>
          </div>
        </div>
      )}

      {/* --- Coupons & Add-ons tab --- */}
      {innerTab === 'coupons' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold flex items-center gap-2"><Tag className="w-4 h-4" /> Coupons</h3>
              <button onClick={() => setShowCouponModal(true)} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors">
                <Plus className="w-3.5 h-3.5" /> New
              </button>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl divide-y divide-slate-700">
              {coupons.map(c => (
                <div key={c.id} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-white font-mono font-semibold">{c.code}</p>
                    <p className="text-xs text-slate-400">{c.type === 'PERCENT' ? `${c.value}% off` : `₹${c.value} off`} · used {c.timesRedeemed}{c.maxRedemptions ? `/${c.maxRedemptions}` : ''}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.isActive ? 'bg-green-600/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>{c.isActive ? 'Active' : 'Inactive'}</span>
                </div>
              ))}
              {coupons.length === 0 && <p className="text-center py-8 text-slate-400 text-sm">No coupons yet</p>}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold flex items-center gap-2"><Package className="w-4 h-4" /> Add-ons</h3>
              <button onClick={() => setShowAddOnModal(true)} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors">
                <Plus className="w-3.5 h-3.5" /> New
              </button>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl divide-y divide-slate-700">
              {addOns.map(a => (
                <div key={a.id} className="p-3 flex items-center justify-between">
                  <p className="text-white font-medium">{a.name}</p>
                  <p className="text-indigo-400 font-semibold">₹{a.amount.toLocaleString('en-IN')}</p>
                </div>
              ))}
              {addOns.length === 0 && <p className="text-center py-8 text-slate-400 text-sm">No add-ons yet</p>}
            </div>
          </div>
        </div>
      )}

      {/* New Subscription Modal */}
      {showSubModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="font-semibold text-white">New Subscription</h3>
              <button onClick={() => setShowSubModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Customer *</label>
                <select className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  value={subCustomerId} onChange={e => setSubCustomerId(e.target.value)}>
                  <option value="">Select customer…</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Plan *</label>
                <select className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  value={subPlanId} onChange={e => setSubPlanId(e.target.value)}>
                  <option value="">Select plan…</option>
                  {plans.filter(p => p.isActive).map(p => <option key={p.id} value={p.id}>{p.name} — ₹{p.amount}/{p.billingCycle.toLowerCase()}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Coupon Code (optional)</label>
                <select className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  value={subCoupon} onChange={e => setSubCoupon(e.target.value)}>
                  <option value="">None</option>
                  {coupons.filter(c => c.isActive).map(c => <option key={c.id} value={c.code}>{c.code}</option>)}
                </select>
              </div>
              {addOns.length > 0 && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Add-ons</label>
                  <div className="space-y-1">
                    {addOns.map(a => (
                      <label key={a.id} className="flex items-center gap-2 text-sm text-white">
                        <input type="checkbox" checked={subAddOnIds.includes(a.id)} onChange={() => toggleAddOnSelection(a.id)} />
                        {a.name} (₹{a.amount})
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-700">
              <button onClick={handleCreateSubscription} disabled={subLoading || !subCustomerId || !subPlanId}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl py-2.5 font-semibold transition-colors">
                {subLoading ? 'Creating…' : 'Create Subscription'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="font-semibold text-white">New Plan</h3>
              <button onClick={() => setShowPlanModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              <input className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                placeholder="Plan name" value={planName} onChange={e => setPlanName(e.target.value)} />
              <input className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                placeholder="Description" value={planDescription} onChange={e => setPlanDescription(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Amount (₹)" value={planAmount} onChange={e => setPlanAmount(e.target.value)} />
                <select className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  value={planCycle} onChange={e => setPlanCycle(e.target.value as any)}>
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>
              <input type="number" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                placeholder="Tax rate (%)" value={planTaxRate} onChange={e => setPlanTaxRate(e.target.value)} />
            </div>
            <div className="p-4 border-t border-slate-700">
              <button onClick={handleCreatePlan} disabled={planLoading || !planName || !planAmount}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl py-2.5 font-semibold transition-colors">
                {planLoading ? 'Creating…' : 'Create Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Coupon Modal */}
      {showCouponModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="font-semibold text-white">New Coupon</h3>
              <button onClick={() => setShowCouponModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              <input className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white uppercase focus:outline-none focus:border-indigo-500"
                placeholder="Coupon code" value={couponCode} onChange={e => setCouponCode(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <select className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  value={couponType} onChange={e => setCouponType(e.target.value as any)}>
                  <option value="PERCENT">% Percent</option>
                  <option value="FLAT">₹ Flat</option>
                </select>
                <input type="number" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Value" value={couponValue} onChange={e => setCouponValue(e.target.value)} />
              </div>
              <input type="date" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                value={couponExpiry} onChange={e => setCouponExpiry(e.target.value)} />
            </div>
            <div className="p-4 border-t border-slate-700">
              <button onClick={handleCreateCoupon} disabled={couponLoading || !couponCode || !couponValue}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl py-2.5 font-semibold transition-colors">
                {couponLoading ? 'Creating…' : 'Create Coupon'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Add-on Modal */}
      {showAddOnModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="font-semibold text-white">New Add-on</h3>
              <button onClick={() => setShowAddOnModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              <input className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                placeholder="Add-on name" value={addOnName} onChange={e => setAddOnName(e.target.value)} />
              <input type="number" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                placeholder="Amount (₹)" value={addOnAmount} onChange={e => setAddOnAmount(e.target.value)} />
            </div>
            <div className="p-4 border-t border-slate-700">
              <button onClick={handleCreateAddOn} disabled={addOnLoading || !addOnName || !addOnAmount}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl py-2.5 font-semibold transition-colors">
                {addOnLoading ? 'Creating…' : 'Create Add-on'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Plan Modal */}
      {changePlanSub && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="font-semibold text-white">Change Plan — {changePlanSub.id}</h3>
              <button onClick={() => setChangePlanSub(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-slate-400">Current: {changePlanSub.planName} (₹{changePlanSub.amount})</p>
              <select className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                value={changePlanNewId} onChange={e => selectNewPlan(e.target.value)}>
                <option value="">Select new plan…</option>
                {plans.filter(p => p.isActive && p.id !== changePlanSub.planId).map(p => (
                  <option key={p.id} value={p.id}>{p.name} — ₹{p.amount}/{p.billingCycle.toLowerCase()}</option>
                ))}
              </select>
              {changePlanPreview && (
                <div className="bg-slate-900 rounded-lg p-3 space-y-1 text-sm">
                  <div className="flex justify-between text-slate-400"><span>Remaining days in cycle</span><span>{changePlanPreview.remainingDays}</span></div>
                  <div className="flex justify-between text-slate-400"><span>Credit for unused old plan</span><span>-₹{changePlanPreview.credit.toFixed(2)}</span></div>
                  <div className="flex justify-between text-slate-400"><span>Charge for new plan (remainder)</span><span>₹{changePlanPreview.charge.toFixed(2)}</span></div>
                  <div className="flex justify-between text-white font-bold border-t border-slate-700 pt-1">
                    <span>Net {changePlanPreview.netProration >= 0 ? 'charge' : 'credit'}</span>
                    <span>₹{Math.abs(changePlanPreview.netProration).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-700">
              <button onClick={handleConfirmChangePlan} disabled={changePlanLoading || !changePlanNewId}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl py-2.5 font-semibold transition-colors">
                {changePlanLoading ? 'Changing…' : 'Confirm Plan Change'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
