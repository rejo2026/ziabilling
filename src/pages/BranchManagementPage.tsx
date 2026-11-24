import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Plus, 
  CheckCircle2, 
  Warehouse, 
  Layers, 
  Receipt, 
  Save, 
  X,
  ShieldCheck,
  Edit2
} from 'lucide-react';

interface BranchManagementProps {
  branches: any[];
  onRefresh: () => void;
  isRTL: boolean;
}

export default function BranchManagementPage({ branches, onRefresh, isRTL }: BranchManagementProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any | null>(null);
  const [warehouses, setWarehouses] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    branchCode: '',
    emirate: 'Dubai',
    city: 'Dubai',
    address: '',
    phone: '',
    email: '',
    trn: '100482910400003',
    invoicePrefix: 'INV-DXB-',
    isActive: true
  });

  const emiratesList = [
    'Abu Dhabi',
    'Dubai',
    'Sharjah',
    'Ajman',
    'Umm Al Quwain',
    'Ras Al Khaimah',
    'Fujairah'
  ];

  const loadWarehouses = () => {
    fetch('http://localhost:4200/api/inventory/warehouses')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setWarehouses(data);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const endpoint = editingBranch 
        ? `http://localhost:4200/api/branches/${editingBranch.id}` 
        : 'http://localhost:4200/api/branches';
      
      const method = editingBranch ? 'PATCH' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setShowAddModal(false);
        setEditingBranch(null);
        setFormData({
          name: '',
          branchCode: '',
          emirate: 'Dubai',
          city: 'Dubai',
          address: '',
          phone: '',
          email: '',
          trn: '100482910400003',
          invoicePrefix: 'INV-DXB-',
          isActive: true
        });
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-500" />
            <span>{isRTL ? 'إدارة فروع ومستودعات دولة الإمارات' : 'UAE Multi-Branch & Store Network'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isRTL 
              ? 'تكوين متاجر ومستودعات قطع الغيار عبر كافة إمارات الدولة مع ترقيم فواتير مخصص'
              : 'Configure physical auto parts retail outlets, warehouse locations, and branch-specific TRN numbering.'}
          </p>
        </div>

        <button
          onClick={() => {
            setEditingBranch(null);
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-semibold text-xs transition-colors shadow-lg shadow-blue-600/30 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{isRTL ? 'إضافة فرع جديد' : 'Register New Branch'}</span>
        </button>
      </div>

      {/* Branch Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {branches && branches.length > 0 ? (
          branches.map((b) => (
            <div 
              key={b.id} 
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all rounded-2xl p-5 shadow-sm space-y-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-950 text-blue-400 border border-blue-800">
                    {b.emirate || 'Dubai'}
                  </span>
                  <h3 className="text-base font-bold text-white mt-1.5">{b.name}</h3>
                  <p className="text-xs text-slate-400 font-mono">{b.branchCode || b.id}</p>
                </div>
                <button
                  onClick={() => {
                    setEditingBranch(b);
                    setFormData({
                      name: b.name,
                      branchCode: b.branchCode || '',
                      emirate: b.emirate || 'Dubai',
                      city: b.city || '',
                      address: b.address || '',
                      phone: b.phone || '',
                      email: b.email || '',
                      trn: b.trn || '100482910400003',
                      invoicePrefix: b.invoicePrefix || 'INV-',
                      isActive: b.isActive !== false
                    });
                    setShowAddModal(true);
                  }}
                  className="p-1.5 text-slate-400 hover:text-blue-400 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">{b.address || 'Industrial Area'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>{b.phone || '+971 4 000 0000'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Receipt className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Prefix: <strong className="text-white font-mono">{b.invoicePrefix || 'INV-'}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>TRN: <strong className="text-emerald-300 font-mono">{b.trn || '100482910400003'}</strong></span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isRTL ? 'تشغيلي ونشط' : 'Active Outlet'}</span>
                </span>
                <span className="text-slate-500">
                  {warehouses.filter(w => w.branchId === b.id).length || 1} {isRTL ? 'مستودع' : 'Warehouse'}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400">
            {isRTL ? 'لا توجد فروع مسجلة حالياً.' : 'No branches configured.'}
          </div>
        )}
      </div>

      {/* Add / Edit Branch Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 text-white space-y-5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-500" />
                <span>{editingBranch ? (isRTL ? 'تعديل الفرع' : 'Edit Branch') : (isRTL ? 'إضافة فرع جديد' : 'New Branch Setup')}</span>
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {isRTL ? 'اسم الفرع' : 'Branch Name'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Al Quoz Main Hub"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {isRTL ? 'كود الفرع' : 'Branch Code'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.branchCode}
                    onChange={(e) => setFormData({ ...formData, branchCode: e.target.value })}
                    placeholder="e.g. DXB-ALQ"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {isRTL ? 'الإمارة' : 'Emirate'} *
                  </label>
                  <select
                    value={formData.emirate}
                    onChange={(e) => setFormData({ ...formData, emirate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  >
                    {emiratesList.map((em) => (
                      <option key={em} value={em} className="bg-slate-900 text-white">{em}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {isRTL ? 'بادئة الفواتير' : 'Invoice Prefix'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.invoicePrefix}
                    onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value })}
                    placeholder="INV-DXB-"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {isRTL ? 'العنوان الفعلي' : 'Physical Address'}
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street, Industrial Area / City"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {isRTL ? 'الهاتف' : 'Phone'}
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+971 4 000 0000"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {isRTL ? 'رقم التسجيل الضريبي TRN' : 'Tax TRN (15 Digits)'}
                  </label>
                  <input
                    type="text"
                    value={formData.trn}
                    onChange={(e) => setFormData({ ...formData, trn: e.target.value })}
                    placeholder="100482910400003"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-300 bg-slate-800 hover:bg-slate-700 text-xs font-semibold cursor-pointer"
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white bg-blue-600 hover:bg-blue-500 text-xs font-bold cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isRTL ? 'حفظ الفرع' : 'Save Branch'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
