import React, { useState, useEffect } from 'react';
import { 
  Boxes, 
  Search, 
  Filter, 
  Plus, 
  RotateCcw, 
  Layers, 
  Tag, 
  Car, 
  Printer, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Eye,
  FileSpreadsheet
} from 'lucide-react';
import { AutomotiveProduct, VehicleMake, VehicleModel } from '../types';

interface AutoCatalogueProps {
  products: AutomotiveProduct[];
  onRefresh: () => void;
  isRTL: boolean;
  onSelectForPos?: (product: AutomotiveProduct) => void;
}

export default function AutoCataloguePage({
  products,
  onRefresh,
  isRTL,
  onSelectForPos
}: AutoCatalogueProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMake, setSelectedMake] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL'); // GENUINE, OEM, AFTERMARKET
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [makes, setMakes] = useState<VehicleMake[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPartDetails, setSelectedPartDetails] = useState<AutomotiveProduct | null>(null);

  // Form State for New Automotive Part
  const [newPart, setNewPart] = useState({
    name: '',
    sku: '',
    oemNumber: '',
    manufacturerPartNo: '',
    altPartNumbers: '',
    barcode: '',
    category: 'Braking System',
    brand: 'Toyota Genuine Parts',
    partType: 'GENUINE',
    unit: 'Set',
    purchasePrice: '',
    sellingPrice: '',
    wholesalePrice: '',
    dealerPrice: '',
    minSellingPrice: '',
    taxRate: '5',
    stock: '15',
    minStock: '5',
    rack: 'RACK-01',
    bin: 'BIN-01',
    countryOfOrigin: 'Japan',
    warrantyMonths: '12',
    // Compatibility fields
    compatMake: 'Toyota',
    compatModel: 'Land Cruiser (V8 / GR / LC300)',
    compatYearFrom: '2015',
    compatYearTo: '2024',
    compatPosition: 'Front'
  });

  useEffect(() => {
    fetch('http://localhost:4200/api/vehicles/makes')
      .then(r => r.json())
      .then(d => Array.isArray(d) && setMakes(d))
      .catch(() => {});

    fetch('http://localhost:4200/api/vehicles/models')
      .then(r => r.json())
      .then(d => Array.isArray(d) && setModels(d))
      .catch(() => {});
  }, []);

  const handleCreatePart = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: newPart.name,
        sku: newPart.sku,
        oemNumber: newPart.oemNumber,
        manufacturerPartNo: newPart.manufacturerPartNo,
        altPartNumbers: newPart.altPartNumbers ? newPart.altPartNumbers.split(',').map(s => s.trim()) : [],
        barcode: newPart.barcode || `6291${Date.now().toString().slice(-8)}`,
        category: newPart.category,
        brand: newPart.brand,
        partType: newPart.partType,
        unit: newPart.unit,
        purchasePrice: Number(newPart.purchasePrice) || 0,
        sellingPrice: Number(newPart.sellingPrice) || 0,
        wholesalePrice: Number(newPart.wholesalePrice) || Number(newPart.sellingPrice) * 0.85,
        dealerPrice: Number(newPart.dealerPrice) || Number(newPart.sellingPrice) * 0.8,
        minSellingPrice: Number(newPart.minSellingPrice) || Number(newPart.sellingPrice) * 0.75,
        taxRate: Number(newPart.taxRate) || 5,
        stock: Number(newPart.stock) || 0,
        minStock: Number(newPart.minStock) || 5,
        rack: newPart.rack,
        bin: newPart.bin,
        countryOfOrigin: newPart.countryOfOrigin,
        warrantyMonths: Number(newPart.warrantyMonths) || 12,
        compatibility: [
          {
            make: newPart.compatMake,
            model: newPart.compatModel,
            yearFrom: Number(newPart.compatYearFrom) || 2015,
            yearTo: Number(newPart.compatYearTo) || 2026,
            position: newPart.compatPosition
          }
        ]
      };

      const res = await fetch('http://localhost:4200/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowAddModal(false);
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filter products by search, vehicle make, part type and category
  const filteredParts = products.filter(p => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !searchTerm || (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.oemNumber && p.oemNumber.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.includes(q)) ||
      (Array.isArray(p.altPartNumbers) && p.altPartNumbers.some(a => a.toLowerCase().includes(q)))
    );

    const matchType = selectedType === 'ALL' || p.partType === selectedType;
    const matchCat = selectedCategory === 'ALL' || p.category === selectedCategory;

    const matchMake = selectedMake === 'ALL' || (
      Array.isArray(p.compatibility) && p.compatibility.some(c => c.make === selectedMake)
    );

    return matchSearch && matchType && matchCat && matchMake;
  });

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Car className="w-6 h-6 text-blue-500" />
            <span>{isRTL ? 'كتالوج قطع غيار السيارات ومطابقة التوافق' : 'Automotive Spare Parts Catalogue & Fitment Matrix'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isRTL 
              ? 'البحث المتقدم برقم القطعة الأصلي OEM، كود الصانع، والموديل المتوافق وتصنيف الأصلي والتجاري'
              : 'Search and cross-reference auto parts by OEM #, Manufacturer Part #, Vehicle Fitment and Genuine/OEM/Aftermarket grades.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-semibold text-xs transition-colors shadow-lg shadow-blue-600/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isRTL ? 'إضافة قطعة غيار جديدة' : 'Add Automotive Part'}</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl text-xs">
        {/* Search Input */}
        <div className="relative md:col-span-1">
          <Search className={`w-4 h-4 text-slate-400 absolute top-3 ${isRTL ? 'right-3' : 'left-3'}`} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isRTL ? 'بحث بالاسم، رقم OEM، SKU أو الباركود...' : 'Search by Name, OEM #, SKU, Barcode...'}
            className={`w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 ${isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'}`}
          />
        </div>

        {/* Vehicle Make Filter */}
        <div>
          <select
            value={selectedMake}
            onChange={(e) => setSelectedMake(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">{isRTL ? 'جميع صانعي المركبات (All Makes)' : 'All Vehicle Makes'}</option>
            {makes.map(m => (
              <option key={m.id} value={m.name}>{m.name} ({m.country || 'Auto'})</option>
            ))}
          </select>
        </div>

        {/* Part Grade / Type Filter */}
        <div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">{isRTL ? 'كافة تصنيفات القطع (All Grades)' : 'All Grades (Genuine / OEM / Aftermarket)'}</option>
            <option value="GENUINE">{isRTL ? 'أصلي وكالة (Genuine)' : 'Genuine Agency Parts'}</option>
            <option value="OEM">{isRTL ? 'صانع أصلي (OEM Tier-1)' : 'Original Equipment Manufacturer (OEM)'}</option>
            <option value="AFTERMARKET">{isRTL ? 'تجاري معتمد (Aftermarket)' : 'Certified Aftermarket'}</option>
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">{isRTL ? 'كافة فئات القطع' : 'All Categories'}</option>
            <option value="Braking System">Braking System (فحمات / أقراص)</option>
            <option value="Filters & Lubrication">Filters & Lubrication (فلاتر وزيوت)</option>
            <option value="Ignition System">Ignition System (بواجي / كويلات)</option>
            <option value="Suspension & Steering">Suspension & Steering (مساعدات / مقصات)</option>
            <option value="Engine Parts">Engine Parts (أجزاء المحرك)</option>
            <option value="Cooling System">Cooling System (راديتر / طرمبات)</option>
          </select>
        </div>
      </div>

      {/* Parts Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3.5">{isRTL ? 'القطعة ورقم OEM' : 'Part & OEM Number'}</th>
                <th className="p-3.5">{isRTL ? 'التصنيف والمصنع' : 'Grade & Brand'}</th>
                <th className="p-3.5">{isRTL ? 'المركبات المتوافقة' : 'Compatible Vehicles'}</th>
                <th className="p-3.5">{isRTL ? 'الموقع بالمستودع' : 'Warehouse Location'}</th>
                <th className="p-3.5">{isRTL ? 'سعر البيع (AED)' : 'Selling Price'}</th>
                <th className="p-3.5">{isRTL ? 'المخزون المتاح' : 'Stock Status'}</th>
                <th className="p-3.5 text-right">{isRTL ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredParts && filteredParts.length > 0 ? (
                filteredParts.map((part) => {
                  const isLow = (part.stock || 0) <= (part.minStock || 5);
                  const isOut = (part.stock || 0) <= 0;

                  return (
                    <tr key={part.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-white text-sm">{part.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono text-blue-400 font-semibold">
                            OEM: {part.oemNumber || part.sku}
                          </span>
                          {part.manufacturerPartNo && (
                            <span className="text-slate-500 font-mono text-[11px]">
                              MPN: {part.manufacturerPartNo}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1 ${
                          part.partType === 'GENUINE' 
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : part.partType === 'OEM'
                            ? 'bg-blue-950 text-blue-400 border border-blue-800'
                            : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        }`}>
                          {part.partType || 'AFTERMARKET'}
                        </span>
                        <div className="text-slate-400">{part.brand || 'Generic'}</div>
                      </td>

                      <td className="p-3.5 max-w-xs">
                        {Array.isArray(part.compatibility) && part.compatibility.length > 0 ? (
                          <div className="space-y-1">
                            {part.compatibility.slice(0, 2).map((c, i) => (
                              <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                                <Car className="w-3 h-3 text-slate-500 shrink-0" />
                                <span>{c.make} {c.model} ({c.yearFrom}-{c.yearTo})</span>
                              </div>
                            ))}
                            {part.compatibility.length > 2 && (
                              <span className="text-[10px] text-blue-400">
                                +{part.compatibility.length - 2} more models
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Universal fitment</span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 font-mono text-slate-300">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          <span>{part.rack || 'RACK-01'} / {part.bin || 'BIN-01'}</span>
                        </div>
                        <span className="text-[10px] text-slate-500">{part.countryOfOrigin || 'Japan'}</span>
                      </td>

                      <td className="p-3.5">
                        <div className="text-white font-bold text-sm">
                          AED {Number(part.sellingPrice || 0).toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          WS: AED {Number(part.wholesalePrice || part.sellingPrice || 0).toFixed(2)}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${isOut ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                          <span className="font-bold text-white">{part.stock || 0} {part.unit || 'Pcs'}</span>
                        </div>
                        {isLow && !isOut && (
                          <span className="text-[10px] text-amber-400 block mt-0.5">Low Stock</span>
                        )}
                        {isOut && (
                          <span className="text-[10px] text-rose-400 block mt-0.5">Out of Stock</span>
                        )}
                      </td>

                      <td className="p-3.5 text-right space-x-2">
                        <button
                          onClick={() => setSelectedPartDetails(part)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 inline mr-1" />
                          {isRTL ? 'تفاصيل' : 'Details'}
                        </button>

                        {onSelectForPos && (
                          <button
                            onClick={() => onSelectForPos(part)}
                            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                          >
                            {isRTL ? '+ نقطة البيع' : '+ POS'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    {isRTL ? 'لا توجد قطع غيار مطابقة للبحث.' : 'No automotive parts matched the current search criteria.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Automotive Part Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl p-6 text-white space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Car className="w-5 h-5 text-blue-500" />
                <span>{isRTL ? 'تسجيل قطعة غيار سيارات جديدة' : 'New Automotive Spare Part Registry'}</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreatePart} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">
                    {isRTL ? 'اسم قطعة الغيار' : 'Part Name / Description'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPart.name}
                    onChange={e => setNewPart({ ...newPart, name: e.target.value })}
                    placeholder="e.g. Front Ceramic Brake Pads Set"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {isRTL ? 'رقم القطعة الأصلي (OEM #)' : 'OEM Part Number'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPart.oemNumber}
                    onChange={e => setNewPart({ ...newPart, oemNumber: e.target.value, sku: e.target.value })}
                    placeholder="e.g. 04465-60320"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {isRTL ? 'كود المصنع (MPN)' : 'Manufacturer Part #'}
                  </label>
                  <input
                    type="text"
                    value={newPart.manufacturerPartNo}
                    onChange={e => setNewPart({ ...newPart, manufacturerPartNo: e.target.value })}
                    placeholder="e.g. D1303-8415"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {isRTL ? 'درجة وتصنيف القطعة' : 'Part Grade'} *
                  </label>
                  <select
                    value={newPart.partType}
                    onChange={e => setNewPart({ ...newPart, partType: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    <option value="GENUINE">Genuine Agency (أصلي وكالة)</option>
                    <option value="OEM">Tier-1 OEM (مصنع أصلي)</option>
                    <option value="AFTERMARKET">Aftermarket (تجاري معتمد)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {isRTL ? 'العلامة التجارية / الصانع' : 'Brand Name'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPart.brand}
                    onChange={e => setNewPart({ ...newPart, brand: e.target.value })}
                    placeholder="Toyota, Denso, NGK, KYB..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>

                {/* Pricing Fields */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {isRTL ? 'سعر الشراء (AED)' : 'Purchase Cost (AED)'} *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newPart.purchasePrice}
                    onChange={e => setNewPart({ ...newPart, purchasePrice: e.target.value })}
                    placeholder="150.00"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {isRTL ? 'سعر البيع للعميل (AED)' : 'Retail Selling Price (AED)'} *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newPart.sellingPrice}
                    onChange={e => setNewPart({ ...newPart, sellingPrice: e.target.value })}
                    placeholder="250.00"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {isRTL ? 'سعر الجملة للورش (AED)' : 'Wholesale / Garage Price (AED)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPart.wholesalePrice}
                    onChange={e => setNewPart({ ...newPart, wholesalePrice: e.target.value })}
                    placeholder="200.00"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {isRTL ? 'الكمية الافتتاحية' : 'Initial Stock Qty'}
                  </label>
                  <input
                    type="number"
                    value={newPart.stock}
                    onChange={e => setNewPart({ ...newPart, stock: e.target.value })}
                    placeholder="20"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              {/* Vehicle Fitment Section */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <span className="font-bold text-blue-400 block">
                  {isRTL ? 'توافق المركبات المبدئي (Initial Fitment Compatibility)' : 'Initial Vehicle Compatibility'}
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-slate-400 text-[10px]">Make</label>
                    <select
                      value={newPart.compatMake}
                      onChange={e => setNewPart({ ...newPart, compatMake: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                    >
                      {makes.map(m => (
                        <option key={m.id} value={m.name}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 text-[10px]">Model</label>
                    <input
                      type="text"
                      value={newPart.compatModel}
                      onChange={e => setNewPart({ ...newPart, compatModel: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-[10px]">Years (From - To)</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        value={newPart.compatYearFrom}
                        onChange={e => setNewPart({ ...newPart, compatYearFrom: e.target.value })}
                        className="w-1/2 bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                      />
                      <input
                        type="number"
                        value={newPart.compatYearTo}
                        onChange={e => setNewPart({ ...newPart, compatYearTo: e.target.value })}
                        className="w-1/2 bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                      />
                    </div>
                  </div>
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
                  className="px-4 py-2 rounded-xl text-white bg-blue-600 hover:bg-blue-500 text-xs font-bold cursor-pointer"
                >
                  {isRTL ? 'حفظ وإضافة القطعة' : 'Save Automotive Part'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Part Details Modal */}
      {selectedPartDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 text-white space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-white">{selectedPartDetails.name}</h3>
                <p className="text-xs text-blue-400 font-mono">OEM: {selectedPartDetails.oemNumber || selectedPartDetails.sku}</p>
              </div>
              <button onClick={() => setSelectedPartDetails(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div>Brand: <strong className="text-white">{selectedPartDetails.brand}</strong></div>
                <div>Grade: <strong className="text-amber-400">{selectedPartDetails.partType}</strong></div>
                <div>Retail Price: <strong className="text-emerald-400">AED {Number(selectedPartDetails.sellingPrice).toFixed(2)}</strong></div>
                <div>Wholesale: <strong className="text-blue-400">AED {Number(selectedPartDetails.wholesalePrice || selectedPartDetails.sellingPrice).toFixed(2)}</strong></div>
                <div>Warehouse Rack: <strong className="text-white">{selectedPartDetails.rack || 'RACK-01'}</strong></div>
                <div>Bin: <strong className="text-white">{selectedPartDetails.bin || 'BIN-01'}</strong></div>
                <div>Warranty: <strong className="text-white">{selectedPartDetails.warrantyMonths || 12} Months</strong></div>
                <div>Origin: <strong className="text-white">{selectedPartDetails.countryOfOrigin || 'Japan'}</strong></div>
              </div>

              <div>
                <h4 className="font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Car className="w-4 h-4 text-blue-400" />
                  <span>Vehicle Fitment Matrix</span>
                </h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {Array.isArray(selectedPartDetails.compatibility) && selectedPartDetails.compatibility.length > 0 ? (
                    selectedPartDetails.compatibility.map((c, i) => (
                      <div key={i} className="p-2 bg-slate-950 rounded-lg border border-slate-800/80 flex justify-between items-center">
                        <span className="font-semibold text-white">{c.make} {c.model}</span>
                        <span className="text-slate-400 font-mono">({c.yearFrom} - {c.yearTo}) • {c.position || 'Any'}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500">Universal Fitment.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedPartDetails(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
