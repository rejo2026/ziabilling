import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  FormInput, 
  Save, 
  X,
  Layers
} from 'lucide-react';
import { DynamicCustomField } from '../types';

interface DynamicFieldManagerProps {
  isRTL: boolean;
}

export default function DynamicFieldManagerPage({ isRTL }: DynamicFieldManagerProps) {
  const [fields, setFields] = useState<DynamicCustomField[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<'products' | 'customers' | 'invoices' | 'suppliers'>('products');

  const [newField, setNewField] = useState({
    targetEntity: 'products' as const,
    fieldKey: '',
    fieldLabel: '',
    fieldType: 'text' as const,
    isRequired: false,
    isVisible: true,
    optionsText: ''
  });

  const loadFields = () => {
    fetch('http://localhost:4200/api/settings/fields')
      .then(res => res.json())
      .then(d => {
        if (Array.isArray(d)) setFields(d);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadFields();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        targetEntity: newField.targetEntity,
        fieldKey: newField.fieldKey,
        fieldLabel: newField.fieldLabel,
        fieldType: newField.fieldType,
        isRequired: newField.isRequired,
        isVisible: newField.isVisible,
        options: newField.optionsText ? newField.optionsText.split(',').map(s => s.trim()) : []
      };

      const res = await fetch('http://localhost:4200/api/settings/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewField({
          targetEntity: 'products',
          fieldKey: '',
          fieldLabel: '',
          fieldType: 'text',
          isRequired: false,
          isVisible: true,
          optionsText: ''
        });
        loadFields();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`http://localhost:4200/api/settings/fields/${id}`, {
        method: 'DELETE'
      });
      loadFields();
    } catch (e) {
      console.error(e);
    }
  };

  const entityFilteredFields = fields.filter(f => f.targetEntity === selectedEntity);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sliders className="w-6 h-6 text-blue-500" />
            <span>{isRTL ? 'إدارة الحقول المخصصة الديناميكية' : 'Dynamic Field Manager'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isRTL
              ? 'إضافة وتعديل حقول إضافية للمنتجات، العملاء، والفواتير بدون تعديل الكود البرمجي وحفظها بأمان'
              : 'Add, reorder and configure custom business fields on entities with schema-safe JSON storage.'}
          </p>
        </div>

        <button
          onClick={() => {
            setNewField({ ...newField, targetEntity: selectedEntity });
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-semibold text-xs transition-colors shadow-lg shadow-blue-600/30 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{isRTL ? 'إضافة حقل مخصص جديد' : 'Add Custom Field'}</span>
        </button>
      </div>

      {/* Entity Selector Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2 text-xs font-semibold">
        {[
          { id: 'products', label: isRTL ? 'قطع الغيار (Products)' : 'Automotive Products' },
          { id: 'customers', label: isRTL ? 'العملاء والورش (Customers)' : 'Customers & Garages' },
          { id: 'invoices', label: isRTL ? 'فواتير المبيعات (Invoices)' : 'Sales Invoices' },
          { id: 'suppliers', label: isRTL ? 'الموردين (Suppliers)' : 'Parts Suppliers' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedEntity(tab.id as any)}
            className={`px-4 py-2 rounded-xl transition-colors cursor-pointer ${
              selectedEntity === tab.id 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' 
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Fields Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
            <tr>
              <th className="p-3.5">{isRTL ? 'اسم الحقل' : 'Field Label'}</th>
              <th className="p-3.5">{isRTL ? 'المفتاح الفريد' : 'Key Identifier'}</th>
              <th className="p-3.5">{isRTL ? 'نوع الإدخال' : 'Input Type'}</th>
              <th className="p-3.5">{isRTL ? 'إلزامي' : 'Required'}</th>
              <th className="p-3.5">{isRTL ? 'الحالة' : 'Visibility'}</th>
              <th className="p-3.5 text-right">{isRTL ? 'الإجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {entityFilteredFields && entityFilteredFields.length > 0 ? (
              entityFilteredFields.map(f => (
                <tr key={f.id} className="hover:bg-slate-800/40">
                  <td className="p-3.5 font-bold text-white">{f.fieldLabel}</td>
                  <td className="p-3.5 font-mono text-blue-400">{f.fieldKey}</td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      {f.fieldType}
                    </span>
                  </td>
                  <td className="p-3.5">
                    {f.isRequired ? (
                      <span className="text-amber-400 font-semibold">Yes</span>
                    ) : (
                      <span className="text-slate-500">Optional</span>
                    )}
                  </td>
                  <td className="p-3.5">
                    {f.isVisible ? (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <Eye className="w-3.5 h-3.5" /> Visible
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-500">
                        <EyeOff className="w-3.5 h-3.5" /> Hidden
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => handleDelete(f.id)}
                      className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-950/40 border border-rose-900 rounded-lg hover:bg-rose-900 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  {isRTL ? 'لا توجد حقول مخصصة لهذا الكيان.' : 'No dynamic custom fields configured for this entity yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Custom Field Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 text-white space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-500" />
                <span>{isRTL ? 'إضافة حقل ديناميكي جديد' : 'New Dynamic Field Definition'}</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Target Entity</label>
                <select
                  value={newField.targetEntity}
                  onChange={e => setNewField({ ...newField, targetEntity: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  <option value="products">Automotive Products</option>
                  <option value="customers">Customers & Garages</option>
                  <option value="invoices">Sales Invoices</option>
                  <option value="suppliers">Parts Suppliers</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Field Display Label *</label>
                <input
                  type="text"
                  required
                  value={newField.fieldLabel}
                  onChange={e => setNewField({
                    ...newField, 
                    fieldLabel: e.target.value,
                    fieldKey: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_')
                  })}
                  placeholder="e.g. Workshop Registration #"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Unique Field Key *</label>
                <input
                  type="text"
                  required
                  value={newField.fieldKey}
                  onChange={e => setNewField({ ...newField, fieldKey: e.target.value })}
                  placeholder="e.g. workshop_reg_no"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Field Type</label>
                <select
                  value={newField.fieldType}
                  onChange={e => setNewField({ ...newField, fieldType: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  <option value="text">Text (Single Line)</option>
                  <option value="number">Numeric</option>
                  <option value="currency">Currency Amount (AED)</option>
                  <option value="date">Date</option>
                  <option value="dropdown">Dropdown Selection</option>
                  <option value="toggle">Toggle (Yes/No)</option>
                </select>
              </div>

              {newField.fieldType === 'dropdown' && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Options (Comma separated)</label>
                  <input
                    type="text"
                    value={newField.optionsText}
                    onChange={e => setNewField({ ...newField, optionsText: e.target.value })}
                    placeholder="Option 1, Option 2, Option 3"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              )}

              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newField.isRequired}
                    onChange={e => setNewField({ ...newField, isRequired: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-700 text-blue-600"
                  />
                  <span>Required field</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newField.isVisible}
                    onChange={e => setNewField({ ...newField, isVisible: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-700 text-blue-600"
                  />
                  <span>Visible in UI</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-300 bg-slate-800 hover:bg-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-white bg-blue-600 hover:bg-blue-500 font-bold cursor-pointer"
                >
                  Save Dynamic Field
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
