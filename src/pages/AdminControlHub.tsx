import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Layers, 
  Users, 
  Globe2, 
  KeyRound, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Trash2, 
  RefreshCw,
  Power,
  Lock,
  Sparkles,
  ArrowRight,
  Sliders,
  DollarSign,
  TrendingUp,
  MessageSquare,
  Mail,
  Share2
} from 'lucide-react';
import { SystemModuleConfig, UserRole, SystemUser, Branch, SubscriptionEntitlement } from '../types';

export default function AdminControlHub() {
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<'modules' | 'roles' | 'users' | 'branches' | 'localization' | 'marketing' | 'leads'>('modules');

  // Live Server States
  const [modules, setModules] = useState<SystemModuleConfig[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [entitlements, setEntitlements] = useState<SubscriptionEntitlement | null>(null);
  const [companySettings, setCompanySettings] = useState<any>({});
  const [marketingCampaigns, setMarketingCampaigns] = useState<any[]>([]);
  const [fbSyncSettings, setFbSyncSettings] = useState<any>(null);
  const [websiteVisitors, setWebsiteVisitors] = useState<any[]>([]);
  const [websiteLeads, setWebsiteLeads] = useState<any[]>([]);

  // Status Alerts
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // New Custom Module Modal / State
  const [showAddModuleModal, setShowAddModuleModal] = useState(false);
  const [newModuleForm, setNewModuleForm] = useState({ id: '', name: '', category: 'OPERATIONS', description: '', iconName: 'Boxes' });

  // New Custom Role State
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [newRoleForm, setNewRoleForm] = useState({ roleKey: '', displayName: '', permissions: { pos: ['create', 'read'], inventory: ['read'] } });

  // Load All Admin Configurations
  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [mRes, rRes, uRes, bRes, eRes, sRes, mktRes, fbRes, visRes, leadRes] = await Promise.all([
        fetch('http://localhost:4200/api/admin/modules').then(r => r.json()).catch(() => []),
        fetch('http://localhost:4200/api/roles').then(r => r.json()).catch(() => []),
        fetch('http://localhost:4200/api/users').then(r => r.json()).catch(() => []),
        fetch('http://localhost:4200/api/branches').then(r => r.json()).catch(() => []),
        fetch('http://localhost:4200/api/entitlements').then(r => r.json()).catch(() => null),
        fetch('http://localhost:4200/api/settings/company').then(r => r.json()).catch(() => ({})),
        fetch('http://localhost:4200/api/marketing/campaigns').then(r => r.json()).catch(() => []),
        fetch('http://localhost:4200/api/marketing/facebook/sync-status').then(r => r.json()).catch(() => null),
        fetch('http://localhost:4200/api/lead-generation/visitors').then(r => r.json()).catch(() => []),
        fetch('http://localhost:4200/api/lead-generation/leads').then(r => r.json()).catch(() => [])
      ]);

      if (Array.isArray(mRes)) setModules(mRes);
      if (Array.isArray(rRes)) setRoles(rRes);
      if (Array.isArray(uRes)) setUsers(uRes);
      if (Array.isArray(bRes)) setBranches(bRes);
      if (eRes) setEntitlements(eRes);
      if (sRes) setCompanySettings(sRes);
      if (Array.isArray(mktRes)) setMarketingCampaigns(mktRes);
      if (fbRes) setFbSyncSettings(fbRes);
      if (Array.isArray(visRes)) setWebsiteVisitors(visRes);
      if (Array.isArray(leadRes)) setWebsiteLeads(leadRes);
    } catch (e) {
      console.error('Failed to load admin configurations:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Handle Module Enable / Disable Toggle
  const handleToggleModule = async (moduleId: string, currentEnabled: boolean) => {
    try {
      const res = await fetch(`http://localhost:4200/api/admin/modules/${moduleId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: !currentEnabled })
      });
      const data = await res.json();
      if (!res.ok) {
        setAlertMsg({ type: 'error', text: data.error || 'Failed to toggle module' });
      } else {
        setAlertMsg({ type: 'success', text: data.message });
        setModules(prev => prev.map(m => m.id === moduleId ? { ...m, isEnabled: !currentEnabled } : m));
      }
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.message });
    }
  };

  // Handle Module Uninstall
  const handleUninstallModule = async (moduleId: string, moduleName: string) => {
    if (!confirm(`Are you sure you want to remove the '${moduleName}' module from the system?`)) return;
    try {
      const res = await fetch(`http://localhost:4200/api/admin/modules/${moduleId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setAlertMsg({ type: 'error', text: data.error || 'Failed to uninstall module' });
      } else {
        setAlertMsg({ type: 'success', text: data.message });
        setModules(prev => prev.filter(m => m.id !== moduleId));
      }
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.message });
    }
  };

  // Switch Active Country (India vs UAE)
  const handleSwitchCountry = async (countryCode: 'IN' | 'AE') => {
    try {
      const res = await fetch('http://localhost:4200/api/localization/switch-country', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countryCode })
      });
      const data = await res.json();
      if (res.ok) {
        setAlertMsg({ type: 'success', text: data.message });
        setCompanySettings(data.companySettings);
      } else {
        setAlertMsg({ type: 'error', text: data.error });
      }
    } catch (e: any) {
      setAlertMsg({ type: 'error', text: e.message });
    }
  };

  // Trigger Facebook Catalog Sync
  const handleTriggerFbSync = async () => {
    try {
      const res = await fetch('http://localhost:4200/api/marketing/facebook/sync-catalog', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setAlertMsg({ type: 'success', text: data.message });
        setFbSyncSettings(data.syncSettings);
      }
    } catch (e: any) {
      setAlertMsg({ type: 'error', text: e.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold">
              <Sliders size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Enterprise Admin Control Hub
                <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-medium border border-indigo-500/30">
                  Tier: {entitlements?.tier || 'MULTI_BRANCH'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">Configure system modules, dynamic roles, permission matrices, and regional localization</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={loadAdminData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-all"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh Configuration
          </button>
        </div>
      </div>

      {/* Notifications */}
      {alertMsg && (
        <div className={`p-3 rounded-lg text-xs flex items-center justify-between ${alertMsg.type === 'success' ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300' : 'bg-rose-950/60 border border-rose-800 text-rose-300'}`}>
          <div className="flex items-center gap-2">
            {alertMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{alertMsg.text}</span>
          </div>
          <button onClick={() => setAlertMsg(null)} className="text-slate-400 hover:text-white">&times;</button>
        </div>
      )}

      {/* Sub Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveAdminSubTab('modules')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${activeAdminSubTab === 'modules' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'text-slate-400 hover:bg-slate-900'}`}
        >
          <Layers size={14} /> 1. Modules Registry ({modules.filter(m => m.isEnabled).length}/{modules.length})
        </button>
        <button
          onClick={() => setActiveAdminSubTab('roles')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${activeAdminSubTab === 'roles' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'text-slate-400 hover:bg-slate-900'}`}
        >
          <KeyRound size={14} /> 2. Roles & Permissions ({roles.length})
        </button>
        <button
          onClick={() => setActiveAdminSubTab('users')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${activeAdminSubTab === 'users' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'text-slate-400 hover:bg-slate-900'}`}
        >
          <Users size={14} /> 3. Users & Cashiers ({users.length})
        </button>
        <button
          onClick={() => setActiveAdminSubTab('branches')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${activeAdminSubTab === 'branches' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'text-slate-400 hover:bg-slate-900'}`}
        >
          <Building2 size={14} /> 4. Multi-Branch Hierarchy ({branches.length})
        </button>
        <button
          onClick={() => setActiveAdminSubTab('localization')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${activeAdminSubTab === 'localization' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'text-slate-400 hover:bg-slate-900'}`}
        >
          <Globe2 size={14} /> 5. Regional Setup (India / UAE)
        </button>
        <button
          onClick={() => setActiveAdminSubTab('marketing')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${activeAdminSubTab === 'marketing' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'text-slate-400 hover:bg-slate-900'}`}
        >
          <Share2 size={14} /> 6. Marketing Hub (WA / Email / Meta)
        </button>
        <button
          onClick={() => setActiveAdminSubTab('leads')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${activeAdminSubTab === 'leads' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'text-slate-400 hover:bg-slate-900'}`}
        >
          <Globe2 size={14} /> 7. Web Visitors & Leads ({websiteLeads.length})
        </button>
      </div>

      {/* SUB-TAB 1: DYNAMIC MODULES REGISTRY */}
      {activeAdminSubTab === 'modules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Dynamic Modular System Engine</h3>
              <p className="text-xs text-slate-400">Toggle operational features on/off or uninstall non-core extensions in real time.</p>
            </div>
            <button 
              onClick={() => setShowAddModuleModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm"
            >
              <Plus size={14} /> Install Custom Module
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {modules.map(mod => (
              <div 
                key={mod.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${mod.isEnabled ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-950/60 border-slate-900 opacity-60'}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        {mod.category}
                      </span>
                      <h4 className="font-bold text-white text-sm mt-1.5">{mod.name}</h4>
                    </div>
                    <button
                      onClick={() => handleToggleModule(mod.id, mod.isEnabled)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-full transition-all flex items-center gap-1.5 ${
                        mod.isEnabled 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30' 
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30'
                      }`}
                    >
                      <Power size={11} /> {mod.isEnabled ? 'ACTIVE' : 'OFF'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mb-3 leading-relaxed">{mod.description}</p>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                  <span>ID: <code className="text-slate-300">{mod.id}</code></span>
                  {mod.isRemovable ? (
                    <button 
                      onClick={() => handleUninstallModule(mod.id, mod.name)}
                      className="text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 hover:underline"
                    >
                      <Trash2 size={12} /> Uninstall
                    </button>
                  ) : (
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <Lock size={11} /> Protected Core
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: ROLES & PERMISSION MATRIX */}
      {activeAdminSubTab === 'roles' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Role-Based Access Control (RBAC) Matrix</h3>
              <p className="text-xs text-slate-400">Configure permission scopes (CRUD + Approve/Export/Override) for each organizational role.</p>
            </div>
            <button 
              onClick={() => setShowAddRoleModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm"
            >
              <Plus size={14} /> Define Custom Role
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roles.map(r => (
              <div key={r.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h4 className="font-bold text-white text-sm">{r.displayName}</h4>
                    <span className="text-[10px] text-indigo-400 font-mono">{r.roleKey}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${r.isSystemRole ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'}`}>
                    {r.isSystemRole ? 'System Standard' : 'Custom Profile'}
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Granted Permission Matrix:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(r.permissions).map(([mod, perms]) => (
                      <span key={mod} className="text-[11px] bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-md text-slate-300">
                        <strong className="text-indigo-400">{mod}:</strong> {Array.isArray(perms) ? perms.join(', ') : String(perms)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: USERS & CASHIERS */}
      {activeAdminSubTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">System Users & POS Cashier Counter Roster</h3>
              <p className="text-xs text-slate-400">Assign users to physical store branches, assign RBAC roles, and set supervisor PIN codes.</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">User ID</th>
                  <th className="p-3">Full Name</th>
                  <th className="p-3">Role Authority</th>
                  <th className="p-3">Assigned Branch</th>
                  <th className="p-3">Contact Email/Phone</th>
                  <th className="p-3">Supervisor PIN</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-850">
                    <td className="p-3 font-mono text-indigo-400 font-semibold">{u.id}</td>
                    <td className="p-3 font-bold text-white">{u.name}</td>
                    <td className="p-3"><span className="bg-slate-800 px-2 py-0.5 rounded text-slate-200">{u.role}</span></td>
                    <td className="p-3 text-slate-300">{u.branchName || 'Head Office'}</td>
                    <td className="p-3 text-slate-400">{u.email}<br/><span className="text-[10px] text-slate-500">{u.phone}</span></td>
                    <td className="p-3 font-mono text-amber-400">{u.pinCode ? '•••• (' + u.pinCode + ')' : 'None'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {u.active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: MULTI-BRANCH HIERARCHY */}
      {activeAdminSubTab === 'branches' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Multi-Branch Hierarchy & Regional Clusters</h3>
              <p className="text-xs text-slate-400">Head Office, Regional Zones, Central Warehouses, and Retail POS Store Branches.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {branches.map(b => (
              <div key={b.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    {b.nodeType}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-400">{b.branchCode}</span>
                </div>
                <h4 className="font-bold text-white text-sm">{b.name}</h4>
                <p className="text-xs text-slate-400">{b.address}, {b.city}, {b.state} ({b.stateCode})</p>
                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Tax ID: <strong className="text-slate-200">{b.gstin || 'Default HQ'}</strong></span>
                  <span className="text-emerald-400 font-semibold">Online</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 5: REGIONAL LOCALIZATION SETUP */}
      {activeAdminSubTab === 'localization' && (
        <div className="space-y-5">
          <div>
            <h3 className="text-sm font-bold text-white">Regional Profiles & Tax Engine Switcher</h3>
            <p className="text-xs text-slate-400">Seamlessly switch currencies, tax schemas (GST vs VAT), timezones, and RTL language orientations.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* India Profile Card */}
            <div className={`p-5 rounded-xl border transition-all ${companySettings.countryCode === 'IN' ? 'bg-indigo-950/30 border-indigo-500 shadow-lg shadow-indigo-600/10' : 'bg-slate-900 border-slate-800'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">🇮🇳</span>
                  <div>
                    <h4 className="font-bold text-white text-base">India Localization</h4>
                    <p className="text-xs text-slate-400">GST System (CGST/SGST/IGST), NIC E-Invoicing & E-Way Bills</p>
                  </div>
                </div>
                {companySettings.countryCode === 'IN' && (
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full font-bold border border-emerald-500/30">ACTIVE</span>
                )}
              </div>

              <div className="space-y-1.5 text-xs text-slate-300 py-3 border-y border-slate-800">
                <p><strong>Currency:</strong> INR (₹) - Indian Rupee</p>
                <p><strong>Tax Engine:</strong> GSTIN (15-character statutory format)</p>
                <p><strong>Timezone:</strong> Asia/Kolkata (IST, UTC+05:30)</p>
                <p><strong>Tax Rates:</strong> 0%, 5%, 12%, 18%, 28%</p>
              </div>

              <button
                onClick={() => handleSwitchCountry('IN')}
                disabled={companySettings.countryCode === 'IN'}
                className="mt-4 w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-xs rounded-lg transition-all"
              >
                {companySettings.countryCode === 'IN' ? 'Currently Active' : 'Switch Platform to India (GST)'}
              </button>
            </div>

            {/* UAE Profile Card */}
            <div className={`p-5 rounded-xl border transition-all ${companySettings.countryCode === 'AE' ? 'bg-indigo-950/30 border-indigo-500 shadow-lg shadow-indigo-600/10' : 'bg-slate-900 border-slate-800'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">🇦🇪</span>
                  <div>
                    <h4 className="font-bold text-white text-base">United Arab Emirates (UAE)</h4>
                    <p className="text-xs text-slate-400">Federal Tax Authority (FTA) 5% VAT & Bilingual Arabic/English</p>
                  </div>
                </div>
                {companySettings.countryCode === 'AE' && (
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full font-bold border border-emerald-500/30">ACTIVE</span>
                )}
              </div>

              <div className="space-y-1.5 text-xs text-slate-300 py-3 border-y border-slate-800">
                <p><strong>Currency:</strong> AED (د.إ) - UAE Dirham</p>
                <p><strong>Tax Engine:</strong> 15-digit TRN (Tax Registration Number)</p>
                <p><strong>Timezone:</strong> Asia/Dubai (GST, UTC+04:00)</p>
                <p><strong>Bilingual Receipts:</strong> English + Arabic with Right-to-Left (RTL)</p>
              </div>

              <button
                onClick={() => handleSwitchCountry('AE')}
                disabled={companySettings.countryCode === 'AE'}
                className="mt-4 w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-xs rounded-lg transition-all"
              >
                {companySettings.countryCode === 'AE' ? 'Currently Active' : 'Switch Platform to UAE (VAT)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 6: MARKETING HUB */}
      {activeAdminSubTab === 'marketing' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Multi-Channel Marketing & Social Commerce Hub</h3>
              <p className="text-xs text-slate-400">Broadcast campaigns via WhatsApp Cloud API, Email newsletters, and Facebook Catalog feeds.</p>
            </div>
            <button
              onClick={handleTriggerFbSync}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm"
            >
              <Share2 size={14} /> Sync Facebook Catalog Now
            </button>
          </div>

          {/* Facebook Sync Status Bar */}
          {fbSyncSettings && (
            <div className="p-3.5 bg-blue-950/40 border border-blue-800/60 rounded-xl flex items-center justify-between text-xs text-blue-200">
              <div className="flex items-center gap-2">
                <Share2 size={16} className="text-blue-400" />
                <span>Meta Commerce Catalog Feed: <strong>{fbSyncSettings.productsSynced} products synchronized</strong></span>
              </div>
              <span className="text-[11px] text-blue-300">Last Sync: {new Date(fbSyncSettings.lastSyncAt).toLocaleTimeString()}</span>
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">Campaign ID</th>
                  <th className="p-3">Channel</th>
                  <th className="p-3">Campaign Title</th>
                  <th className="p-3">Target Audience</th>
                  <th className="p-3">Sent / Delivered</th>
                  <th className="p-3">Clicks / Conversions</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {marketingCampaigns.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-850">
                    <td className="p-3 font-mono text-indigo-400 font-semibold">{c.id}</td>
                    <td className="p-3 font-bold">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        c.channel === 'WHATSAPP' ? 'bg-emerald-500/20 text-emerald-400' :
                        c.channel === 'EMAIL' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {c.channel}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-white">{c.title}</td>
                    <td className="p-3 text-slate-300">{c.targetAudience}</td>
                    <td className="p-3">{c.deliveredCount} / {c.recipientCount}</td>
                    <td className="p-3"><strong className="text-emerald-400">{c.clickedCount}</strong> clicks ({c.conversionCount} sales)</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-semibold">{c.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 7: WEBSITE VISITORS & LEAD GENERATION */}
      {activeAdminSubTab === 'leads' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Website Visitor Tracking & Inbound Lead Generation</h3>
              <p className="text-xs text-slate-400">Real-time IP geolocation, browsing depth tracking, high-intent lead scoring, and 1-click CRM customer conversion.</p>
            </div>
            <button
              onClick={loadAdminData}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm"
            >
              <RefreshCw size={13} /> Refresh Leads
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Visitors</span>
              <p className="text-2xl font-bold text-white mt-1">{websiteVisitors.length}</p>
              <span className="text-[11px] text-emerald-400 font-semibold">Active Web Sessions</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Inbound Captured Leads</span>
              <p className="text-2xl font-bold text-indigo-400 mt-1">{websiteLeads.length}</p>
              <span className="text-[11px] text-slate-400">High-intent inquiries</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Average Lead Score</span>
              <p className="text-2xl font-bold text-emerald-400 mt-1">91 / 100</p>
              <span className="text-[11px] text-emerald-400">High Purchase Intent</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Lead Conversion Rate</span>
              <p className="text-2xl font-bold text-amber-400 mt-1">
                {websiteVisitors.length > 0 ? Math.round((websiteLeads.length / websiteVisitors.length) * 100) : 0}%
              </p>
              <span className="text-[11px] text-slate-400">Visitor to Lead Pipeline</span>
            </div>
          </div>

          {/* Captured Leads Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Qualified Inbound Leads</h4>
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3">Lead ID & Date</th>
                    <th className="p-3">Lead Contact</th>
                    <th className="p-3">Company / Chain</th>
                    <th className="p-3">Interest / Product Inquiry</th>
                    <th className="p-3">Location & IP</th>
                    <th className="p-3">Source & Score</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {websiteLeads.map((lead: any) => (
                    <tr key={lead.id} className="hover:bg-slate-850">
                      <td className="p-3 font-mono text-indigo-400 font-semibold">
                        {lead.id}
                        <br />
                        <span className="text-[10px] text-slate-500 font-sans">{new Date(lead.createdAt).toLocaleDateString()}</span>
                      </td>
                      <td className="p-3">
                        <strong className="text-white text-sm">{lead.name}</strong>
                        <div className="text-[11px] text-slate-400">{lead.phone}</div>
                        <div className="text-[10px] text-slate-500">{lead.email}</div>
                      </td>
                      <td className="p-3 font-semibold text-slate-200">{lead.companyName || 'Individual Trader'}</td>
                      <td className="p-3 text-slate-300">
                        <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px] text-slate-200">{lead.interestCategory}</span>
                        <div className="text-[10px] text-slate-400 mt-1 italic">{lead.notes}</div>
                      </td>
                      <td className="p-3 text-slate-300">
                        {lead.city}, {lead.country}
                        <br />
                        <span className="text-[10px] text-slate-500 font-mono">{lead.ipAddress}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          {lead.source}
                        </span>
                        <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                          Score: {lead.leadScore}/100
                        </div>
                      </td>
                      <td className="p-3">
                        {lead.status === 'CONVERTED_CUSTOMER' ? (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 size={12} /> Converted Customer
                          </span>
                        ) : (
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch(`http://localhost:4200/api/lead-generation/leads/${lead.id}/convert-to-customer`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ group: lead.companyName ? 'Wholesale' : 'Retail', creditLimit: 50000 })
                                });
                                const data = await res.json();
                                if (res.ok) {
                                  setAlertMsg({ type: 'success', text: `Lead ${lead.name} successfully converted to CRM Customer #${data.customer.id}` });
                                  loadAdminData();
                                }
                              } catch (e: any) {
                                setAlertMsg({ type: 'error', text: e.message });
                              }
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg shadow-sm flex items-center gap-1"
                          >
                            <Plus size={12} /> Convert to Customer
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Live Visitor Sessions Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Live Website Visitor Sessions</h4>
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3">Visitor ID</th>
                    <th className="p-3">IP & Location</th>
                    <th className="p-3">Device & Browser</th>
                    <th className="p-3">Pages Viewed</th>
                    <th className="p-3">Referral Source</th>
                    <th className="p-3">Time On Site</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {websiteVisitors.map((v: any) => (
                    <tr key={v.id} className="hover:bg-slate-850">
                      <td className="p-3 font-mono text-indigo-400 font-semibold">{v.id}</td>
                      <td className="p-3 font-mono text-slate-300">
                        {v.ipAddress}
                        <br />
                        <span className="text-[10px] text-slate-400 font-sans">{v.city}, {v.country}</span>
                      </td>
                      <td className="p-3 text-slate-300">
                        {v.deviceType} ({v.operatingSystem})
                        <br />
                        <span className="text-[10px] text-slate-500">{v.browser}</span>
                      </td>
                      <td className="p-3">
                        <strong className="text-white">{v.pageViews} views</strong>
                        <div className="text-[10px] text-slate-400">{v.visitedPages.join(', ')}</div>
                      </td>
                      <td className="p-3 text-slate-400 text-[11px] truncate max-w-[200px]">{v.referralUrl}</td>
                      <td className="p-3 font-mono text-slate-300">{Math.floor(v.durationSeconds / 60)}m {v.durationSeconds % 60}s</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          v.isIdentified ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {v.isIdentified ? 'Identified Lead' : 'Browsing'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
