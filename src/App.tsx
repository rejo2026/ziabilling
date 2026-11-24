import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart,
  Receipt, 
  Package, 
  Truck,
  Users,
  Building2,
  Boxes,
  DollarSign,
  TrendingUp,
  FileText, 
  KeyRound, 
  RotateCcw, 
  Headphones, 
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  Trash2,
  Printer,
  X,
  RefreshCw,
  Clock,
  Sparkles,
  ArrowRight,
  CreditCard,
  QrCode,
  Save,
  Download,
  Upload,
  Settings,
  Pause,
  Play,
  Sliders,
  Layers,
  ExternalLink
} from 'lucide-react';
import AdminControlHub from './pages/AdminControlHub';
import SubscriptionsPage from './pages/SubscriptionsPage';
import LoginPage from './pages/LoginPage';
import AutoCataloguePage from './pages/AutoCataloguePage';
import BranchManagementPage from './pages/BranchManagementPage';
import UaeVat201Page from './pages/UaeVat201Page';
import DynamicFieldManagerPage from './pages/DynamicFieldManagerPage';
import ThemeSettingsPage from './pages/ThemeSettingsPage';
import CashRegisterPage from './pages/CashRegisterPage';
import ReturnsManagementPage from './pages/ReturnsManagementPage';
import { TRANSLATIONS } from './localization';

export default function App() {
  const [session, setSession] = useState<any | null>(null);
  const [currentLang, setCurrentLang] = useState<'en' | 'ar'>('en');
  const [themeTokens, setThemeTokens] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [systemId, setSystemId] = useState('ZB-CALCULATING...');
  const [isActivated, setIsActivated] = useState(false);
  const [licenseData, setLicenseData] = useState<any>(null);
  const [inputKey, setInputKey] = useState('');
  const [activationMsg, setActivationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Core Data
  const [dashboardStats, setDashboardStats] = useState<any>({});
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [heldBills, setHeldBills] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [addOns, setAddOns] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<string[]>([]);
  const [reports, setReports] = useState<any>({});
  const [companySettings, setCompanySettings] = useState<any>({});
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // POS / Quick Billing State
  const [posSearch, setPosSearch] = useState('');
  const [posCategoryFilter, setPosCategoryFilter] = useState('ALL');
  const [posCart, setPosCart] = useState<any[]>([]);
  const [posCustomerName, setPosCustomerName] = useState('Walk-in Customer');
  const [posCustomerPhone, setPosCustomerPhone] = useState('');
  const [posDiscount, setPosDiscount] = useState('0');
  const [posPaymentMethod, setPosPaymentMethod] = useState<'Cash' | 'UPI' | 'Card' | 'Credit'>('Cash');
  const [showHeldBillsModal, setShowHeldBillsModal] = useState(false);

  // Search & Filter States
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('ALL');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');

  // Modals
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showStockAdjustModal, setShowStockAdjustModal] = useState(false);
  const [stockAdjustItem, setStockAdjustItem] = useState<any>(null);
  const [stockAdjustDelta, setStockAdjustDelta] = useState('1');
  const [stockAdjustReason, setStockAdjustReason] = useState('Inventory Restock');

  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<any | null>(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showAddPurchaseModal, setShowAddPurchaseModal] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);

  // Form States
  const [newProduct, setNewProduct] = useState({
    name: '', sku: '', barcode: '', hsnCode: '', category: 'Hardware', brand: 'Generic', unit: 'Pcs',
    purchasePrice: '', sellingPrice: '', taxRate: '18', stock: '10', minStock: '5', batch: 'B-01', expiry: 'N/A'
  });

  const [newCustomer, setNewCustomer] = useState({
    name: '', phone: '', email: '', gstin: '', address: '', group: 'Retail', creditLimit: '25000'
  });

  const [newSupplier, setNewSupplier] = useState({
    name: '', phone: '', email: '', gstin: '', address: ''
  });

  const [newPurchase, setNewPurchase] = useState({
    supplierId: '', productId: '', quantity: '10', unitCost: '', taxRate: '18', paymentStatus: 'PAID'
  });

  const [newExpense, setNewExpense] = useState({
    category: 'Electricity & Utilities', amount: '', paymentMethod: 'Cash', paidTo: '', note: ''
  });

  const [newInvoiceData, setNewInvoiceData] = useState({
    customerName: '', customerPhone: '', customerGstin: '', discount: '0', paymentMethod: 'UPI',
    selectedProductId: '', quantity: '1', items: [] as any[]
  });

  // Load All System Data
  const loadAllData = () => {
    fetch('http://localhost:4200/api/license/system-id')
      .then(res => res.json())
      .then(d => { setSystemId(d.systemId); setIsActivated(d.activated); setLicenseData(d.license); })
      .catch(() => setSystemId('ZB-9F82-4C1A-8E23'));

    fetch('http://localhost:4200/api/dashboard/stats').then(r => r.json()).then(d => setDashboardStats(d)).catch(() => {});
    fetch('http://localhost:4200/api/products').then(r => r.json()).then(d => Array.isArray(d) && setProducts(d)).catch(() => {});
    fetch('http://localhost:4200/api/products/categories').then(r => r.json()).then(d => Array.isArray(d) && setCategories(d)).catch(() => {});
    fetch('http://localhost:4200/api/products/brands').then(r => r.json()).then(d => Array.isArray(d) && setBrands(d)).catch(() => {});
    fetch('http://localhost:4200/api/products/units').then(r => r.json()).then(d => Array.isArray(d) && setUnits(d)).catch(() => {});
    fetch('http://localhost:4200/api/invoices').then(r => r.json()).then(d => Array.isArray(d) && setInvoices(d)).catch(() => {});
    fetch('http://localhost:4200/api/pos/held').then(r => r.json()).then(d => Array.isArray(d) && setHeldBills(d)).catch(() => {});
    fetch('http://localhost:4200/api/quotations').then(r => r.json()).then(d => Array.isArray(d) && setQuotations(d)).catch(() => {});
    fetch('http://localhost:4200/api/subscriptions/plans').then(r => r.json()).then(d => Array.isArray(d) && setPlans(d)).catch(() => {});
    fetch('http://localhost:4200/api/subscriptions').then(r => r.json()).then(d => Array.isArray(d) && setSubscriptions(d)).catch(() => {});
    fetch('http://localhost:4200/api/subscriptions/coupons').then(r => r.json()).then(d => Array.isArray(d) && setCoupons(d)).catch(() => {});
    fetch('http://localhost:4200/api/subscriptions/addons').then(r => r.json()).then(d => Array.isArray(d) && setAddOns(d)).catch(() => {});
    fetch('http://localhost:4200/api/customers').then(r => r.json()).then(d => Array.isArray(d) && setCustomers(d)).catch(() => {});
    fetch('http://localhost:4200/api/suppliers').then(r => r.json()).then(d => Array.isArray(d) && setSuppliers(d)).catch(() => {});
    fetch('http://localhost:4200/api/purchases').then(r => r.json()).then(d => Array.isArray(d) && setPurchases(d)).catch(() => {});
    fetch('http://localhost:4200/api/expenses').then(r => r.json()).then(d => Array.isArray(d) && setExpenses(d)).catch(() => {});
    fetch('http://localhost:4200/api/expenses/categories').then(r => r.json()).then(d => Array.isArray(d) && setExpenseCategories(d)).catch(() => {});
    fetch('http://localhost:4200/api/reports/summary').then(r => r.json()).then(d => setReports(d)).catch(() => {});
    fetch('http://localhost:4200/api/settings/company').then(r => r.json()).then(d => setCompanySettings(d)).catch(() => {});
    fetch('http://localhost:4200/api/users').then(r => r.json()).then(d => Array.isArray(d) && setUsers(d)).catch(() => {});
    fetch('http://localhost:4200/api/branches').then(r => r.json()).then(d => Array.isArray(d) && setBranches(d)).catch(() => {});
    fetch('http://localhost:4200/api/settings/theme').then(r => r.json()).then(d => d && setThemeTokens(d)).catch(() => {});
    fetch('http://localhost:4200/api/security/audit-logs').then(r => r.json()).then(d => Array.isArray(d) && setAuditLogs(d)).catch(() => {});
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // --- Handlers: POS Quick Billing ---
  const handleAddToCart = (product: any) => {
    setPosCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.sellingPrice } : item);
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        sku: product.sku,
        sellingPrice: product.sellingPrice,
        taxRate: product.taxRate,
        quantity: 1,
        total: product.sellingPrice
      }];
    });
  };

  const handleUpdateCartQty = (id: string, delta: number) => {
    setPosCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty, total: newQty * item.sellingPrice };
      }
      return item;
    }));
  };

  const handleRemoveFromCart = (id: string) => {
    setPosCart(prev => prev.filter(item => item.id !== id));
  };

  const posSubtotal = posCart.reduce((sum, item) => sum + item.total, 0);
  const posTaxTotal = posCart.reduce((sum, item) => sum + (item.total * (item.taxRate / 100)), 0);
  const posDiscountVal = parseFloat(posDiscount) || 0;
  const posGrandTotal = Math.max(0, posSubtotal + posTaxTotal - posDiscountVal);

  const handleCompletePosBill = () => {
    if (!posCart.length) {
      alert('Cart is empty. Please add items to checkout.');
      return;
    }

    fetch('http://localhost:4200/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'POS',
        customerName: posCustomerName || 'Walk-in Customer',
        customerPhone: posCustomerPhone,
        items: posCart.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.sellingPrice,
          taxRate: item.taxRate
        })),
        discount: posDiscountVal,
        paymentMethod: posPaymentMethod
      })
    })
      .then(res => res.json())
      .then(created => {
        setSelectedInvoiceForView(created);
        setPosCart([]);
        setPosDiscount('0');
        setPosCustomerName('Walk-in Customer');
        setPosCustomerPhone('');
        loadAllData();
      })
      .catch(err => alert('Failed to create POS bill: ' + err.message));
  };

  const handleHoldBill = () => {
    if (!posCart.length) return;
    fetch('http://localhost:4200/api/pos/hold', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: posCustomerName, items: posCart, total: posGrandTotal })
    })
      .then(res => res.json())
      .then(held => {
        setHeldBills(prev => [held, ...prev]);
        setPosCart([]);
        setPosCustomerName('Walk-in Customer');
      });
  };

  const handleResumeBill = (held: any) => {
    setPosCart(held.items);
    setPosCustomerName(held.customerName);
    fetch(`http://localhost:4200/api/pos/held/${held.id}`, { method: 'DELETE' })
      .then(() => setHeldBills(prev => prev.filter(h => h.id !== held.id)));
    setShowHeldBillsModal(false);
  };

  // --- Handlers: Products ---
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    fetch('http://localhost:4200/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProduct)
    })
      .then(r => r.json())
      .then(created => {
        setProducts(prev => [created, ...prev]);
        setShowAddProductModal(false);
        setNewProduct({ name: '', sku: '', barcode: '', hsnCode: '', category: 'Hardware', brand: 'Generic', unit: 'Pcs', purchasePrice: '', sellingPrice: '', taxRate: '18', stock: '10', minStock: '5', batch: 'B-01', expiry: 'N/A' });
        loadAllData();
      });
  };

  const handleStockAdjustmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockAdjustItem) return;
    const delta = parseInt(stockAdjustDelta, 10);
    fetch(`http://localhost:4200/api/products/${stockAdjustItem.id}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta, reason: stockAdjustReason })
    })
      .then(r => r.json())
      .then(() => {
        setShowStockAdjustModal(false);
        loadAllData();
      });
  };

  // --- Handlers: Purchases ---
  const handleSavePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find(p => p.id === newPurchase.productId);
    if (!prod) return;
    fetch('http://localhost:4200/api/purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierId: newPurchase.supplierId,
        items: [{ productId: prod.id, name: prod.name, quantity: parseInt(newPurchase.quantity, 10), unitCost: parseFloat(newPurchase.unitCost || prod.purchasePrice), taxRate: prod.taxRate }],
        paymentStatus: newPurchase.paymentStatus
      })
    })
      .then(r => r.json())
      .then(() => {
        setShowAddPurchaseModal(false);
        loadAllData();
      });
  };

  // --- Handlers: Customers & Suppliers ---
  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    fetch('http://localhost:4200/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCustomer)
    })
      .then(r => r.json())
      .then(() => { setShowAddCustomerModal(false); loadAllData(); });
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    fetch('http://localhost:4200/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSupplier)
    })
      .then(r => r.json())
      .then(() => { setShowAddSupplierModal(false); loadAllData(); });
  };

  // --- Handlers: Expenses ---
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    fetch('http://localhost:4200/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newExpense)
    })
      .then(r => r.json())
      .then(() => { setShowAddExpenseModal(false); loadAllData(); });
  };

  // --- Handlers: Company Settings ---
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    fetch('http://localhost:4200/api/settings/company', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(companySettings)
    })
      .then(r => r.json())
      .then(() => alert('Company profile & tax configurations updated successfully!'));
  };

  // --- Handlers: Licensing ---
  const handleActivate = () => {
    if (!inputKey.trim()) return;
    fetch('http://localhost:4200/api/license/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey: inputKey.trim() })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) setActivationMsg({ type: 'error', text: data.error });
        else { setIsActivated(true); setLicenseData(data.license); setActivationMsg({ type: 'success', text: data.message }); }
      });
  };

  const handleGenerateDemoLicense = () => {
    fetch('http://localhost:4200/api/license/dev-generate', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data.licenseKey) setInputKey(data.licenseKey);
        else setActivationMsg({ type: 'error', text: data.error || 'No local signing key available on this machine.' });
      })
      .catch(() => setActivationMsg({ type: 'error', text: 'Could not reach the license service.' }));
  };

  // Filtered Lists
  const filteredProducts = products.filter(p => {
    const matchesCategory = productCategoryFilter === 'ALL' || p.category.toUpperCase() === productCategoryFilter;
    return matchesCategory;
  });

  const filteredPosProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(posSearch.toLowerCase()) || p.sku.toLowerCase().includes(posSearch.toLowerCase()) || p.barcode?.includes(posSearch);
    const matchesCategory = posCategoryFilter === 'ALL' || p.category.toUpperCase() === posCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const isRTL = currentLang === 'ar';
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  if (!session) {
    return (
      <LoginPage
        onLoginSuccess={(s) => setSession(s)}
        branches={branches}
        currentLang={currentLang}
        onLanguageChange={(l) => setCurrentLang(l as any)}
      />
    );
  }

  return (
    <div 
      className={`flex h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden ${isRTL ? 'rtl' : 'ltr'}`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* 1. LEFT SIDEBAR */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col select-none">
        {/* Brand Header */}
        <div className="p-4 flex items-center gap-3 border-b border-slate-800 bg-slate-950">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center font-black text-xl text-white shadow-lg shadow-blue-900/50">
            Z
          </div>
          <div>
            <h1 className="font-bold text-base tracking-wider text-blue-400">ZIA-BILLING</h1>
            <p className="text-[11px] text-slate-400">{companySettings.name || 'Enterprise System'}</p>
          </div>
        </div>

        {/* System ID & License Mini Card */}
        <div className="p-2.5 m-2.5 bg-slate-900/80 rounded-lg border border-slate-800 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Hardware ID:</span>
            <span className="text-amber-400 font-mono font-bold text-[10px]">{systemId}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            {isActivated ? (
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <CheckCircle2 size={12} /> Activated ({licenseData?.plan || 'PRO'})
              </span>
            ) : (
              <span className="flex items-center gap-1 text-rose-400 font-semibold">
                <AlertCircle size={12} /> Unlicensed / Trial
              </span>
            )}
          </div>
        </div>

        {/* Navigation Modules List */}
        <nav className="flex-1 px-2.5 space-y-0.5 overflow-y-auto text-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase px-2.5 pt-2 pb-1">
            {isRTL ? 'العمليات ونقطة البيع' : 'Core & Counter Operations'}
          </div>
          
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all ${activeTab === 'dashboard' ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30' : 'text-slate-300 hover:bg-slate-900'}`}
          >
            <LayoutDashboard size={16} /> {t.dashboard}
          </button>

          <button 
            onClick={() => setActiveTab('pos')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${activeTab === 'pos' ? 'bg-emerald-600 text-white font-semibold shadow-md shadow-emerald-600/30' : 'text-slate-300 hover:bg-slate-900'}`}
          >
            <span className="flex items-center gap-2.5"><ShoppingCart size={16} /> {t.posBilling}</span>
            {heldBills.length > 0 && (
              <span className="bg-amber-400 text-slate-950 font-bold px-1.5 py-0.2 rounded-full text-[10px]">{heldBills.length}</span>
            )}
          </button>

          <button 
            onClick={() => setActiveTab('auto_catalogue')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all ${activeTab === 'auto_catalogue' ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30' : 'text-slate-300 hover:bg-slate-900'}`}
          >
            <Boxes size={16} /> {t.spareParts}
          </button>

          <button 
            onClick={() => setActiveTab('sales')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all ${activeTab === 'sales' ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30' : 'text-slate-300 hover:bg-slate-900'}`}
          >
            <Receipt size={16} /> {t.invoices}
          </button>

          <button 
            onClick={() => setActiveTab('cash_register')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all ${activeTab === 'cash_register' ? 'bg-emerald-600 text-white font-semibold shadow-md shadow-emerald-600/30' : 'text-slate-300 hover:bg-slate-900'}`}
          >
            <DollarSign size={16} /> {t.cashRegister}
          </button>

          <button 
            onClick={() => setActiveTab('returns')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all ${activeTab === 'returns' ? 'bg-amber-600 text-white font-semibold shadow-md shadow-amber-600/30' : 'text-slate-300 hover:bg-slate-900'}`}
          >
            <RotateCcw size={16} /> {t.salesReturns}
          </button>

          <div className="text-[10px] font-bold text-slate-500 uppercase px-2.5 pt-3 pb-1">
            {isRTL ? 'المشتريات والموردين' : 'Purchasing & Vendors'}
          </div>

          <button
            onClick={() => setActiveTab('purchases')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all ${activeTab === 'purchases' ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30' : 'text-slate-300 hover:bg-slate-900'}`}
          >
            <Truck size={16} /> {t.purchases}
          </button>

          <button 
            onClick={() => setActiveTab('suppliers')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all ${activeTab === 'suppliers' ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30' : 'text-slate-300 hover:bg-slate-900'}`}
          >
            <Building2 size={16} /> {t.suppliers}
          </button>

          <button 
            onClick={() => setActiveTab('customers')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all ${activeTab === 'customers' ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30' : 'text-slate-300 hover:bg-slate-900'}`}
          >
            <Users size={16} /> {t.customers}
          </button>

          <div className="text-[10px] font-bold text-slate-500 uppercase px-2.5 pt-3 pb-1">
            {isRTL ? 'الامتثال والضرائب والإدارة' : 'UAE VAT & System Administration'}
          </div>

          <button 
            onClick={() => setActiveTab('vat_201')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all ${activeTab === 'vat_201' ? 'bg-emerald-600 text-white font-semibold shadow-md shadow-emerald-600/30' : 'text-slate-300 hover:bg-slate-900'}`}
          >
            <FileText size={16} /> {t.vatReport}
          </button>

          <button 
            onClick={() => setActiveTab('branches')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all ${activeTab === 'branches' ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30' : 'text-slate-300 hover:bg-slate-900'}`}
          >
            <Building2 size={16} /> {isRTL ? 'شبكة الفروع والمستودعات' : 'Branches & Warehouses'}
          </button>

          <button 
            onClick={() => setActiveTab('dynamic_fields')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all ${activeTab === 'dynamic_fields' ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30' : 'text-slate-300 hover:bg-slate-900'}`}
          >
            <Sliders size={16} /> {t.fieldsAdmin}
          </button>

          <button 
            onClick={() => setActiveTab('theme_settings')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all ${activeTab === 'theme_settings' ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30' : 'text-slate-300 hover:bg-slate-900'}`}
          >
            <Sliders size={16} /> {t.themeAdmin}
          </button>

          <button 
            onClick={() => setActiveTab('admin_hub')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all ${activeTab === 'admin_hub' ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30' : 'text-slate-300 hover:bg-slate-900'}`}
          >
            <Sliders size={16} /> {t.modulesAdmin}
          </button>

          <button 
            onClick={() => setActiveTab('reports')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all ${activeTab === 'reports' ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30' : 'text-slate-300 hover:bg-slate-900'}`}
          >
            <TrendingUp size={16} /> {t.reports}
          </button>

          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all ${activeTab === 'settings' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-300 hover:bg-slate-900'}`}
          >
            <Settings size={16} /> {t.settings}
          </button>
        </nav>

        {/* Footer Active Cashier */}
        <div className="p-3 border-t border-slate-800 text-[11px] flex items-center justify-between text-slate-400 bg-slate-950">
          <div>
            <p className="font-semibold text-slate-300">Admin Manager</p>
            <p className="text-[10px] text-emerald-400">Shift Active</p>
          </div>
          <button onClick={loadAllData} title="Sync / Refresh All" className="p-1 hover:text-white">
            <RefreshCw size={14} />
          </button>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-900">
        {/* Top Header */}
        <header className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-950/70 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="font-bold text-base capitalize text-slate-100 tracking-wide">
              {activeTab === 'pos' ? 'POS Counter Fast Billing' : 
               activeTab === 'sales' ? 'Sales Invoices & Quotations' :
               activeTab === 'subscriptions' ? 'Subscription Billing & Recurring Plans' :
               activeTab === 'purchases' ? 'Inward Purchases & Goods Receipts' :
               activeTab === 'inventory' ? 'Stock Valuation & Adjustments' : 
               activeTab === 'reports' ? 'Reports, P&L & Cash Flow' : activeTab}
            </span>
            <span className="text-[11px] bg-slate-800 text-blue-400 font-semibold px-2.5 py-0.5 rounded-full border border-slate-700">
              Offline Database
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="text-slate-400">TRN: <strong className="text-emerald-400 font-mono">{companySettings.trn || '100482910400003'}</strong></span>
            <div className="h-4 w-px bg-slate-800" />
            <span className="text-slate-400">{session?.branch?.name || 'Al Quoz Central'}</span>
            <div className="h-4 w-px bg-slate-800" />
            <button
              onClick={() => setCurrentLang(currentLang === 'en' ? 'ar' : 'en')}
              className="bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg text-blue-400 font-bold cursor-pointer"
            >
              {currentLang === 'en' ? 'العربية (RTL)' : 'English (UAE)'}
            </button>
            <div className="h-4 w-px bg-slate-800" />
            <button
              onClick={() => setSession(null)}
              className="bg-rose-950/60 border border-rose-800 hover:bg-rose-900 px-2.5 py-1 rounded-lg text-rose-300 font-semibold cursor-pointer"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Scrollable Viewport */}
        <section className="flex-1 p-5 overflow-y-auto">
          {/* UAE AUTOMOTIVE SPARE PARTS CATALOGUE */}
          {activeTab === 'auto_catalogue' && (
            <div className="max-w-7xl mx-auto">
              <AutoCataloguePage
                products={products}
                onRefresh={loadAllData}
                isRTL={isRTL}
                onSelectForPos={(p) => {
                  handleAddToCart(p);
                  setActiveTab('pos');
                }}
              />
            </div>
          )}

          {/* UAE VAT 201 REPORT */}
          {activeTab === 'vat_201' && (
            <div className="max-w-7xl mx-auto">
              <UaeVat201Page isRTL={isRTL} />
            </div>
          )}

          {/* BRANCHES & WAREHOUSES */}
          {activeTab === 'branches' && (
            <div className="max-w-7xl mx-auto">
              <BranchManagementPage
                branches={branches}
                onRefresh={loadAllData}
                isRTL={isRTL}
              />
            </div>
          )}

          {/* CASH REGISTER SHIFTS */}
          {activeTab === 'cash_register' && (
            <div className="max-w-7xl mx-auto">
              <CashRegisterPage
                isRTL={isRTL}
                currentUserId={session?.user?.id}
                currentUserName={session?.user?.name}
                selectedBranchId={session?.branch?.id}
              />
            </div>
          )}

          {/* RETURNS & CREDIT NOTES */}
          {activeTab === 'returns' && (
            <div className="max-w-7xl mx-auto">
              <ReturnsManagementPage
                isRTL={isRTL}
                branches={branches}
                onRefresh={loadAllData}
              />
            </div>
          )}

          {/* DYNAMIC FIELD MANAGER */}
          {activeTab === 'dynamic_fields' && (
            <div className="max-w-7xl mx-auto">
              <DynamicFieldManagerPage isRTL={isRTL} />
            </div>
          )}

          {/* THEME SETTINGS */}
          {activeTab === 'theme_settings' && (
            <div className="max-w-7xl mx-auto">
              <ThemeSettingsPage
                isRTL={isRTL}
                onThemeUpdate={(t) => setThemeTokens(t)}
              />
            </div>
          )}

          {/* TAB 0: ENTERPRISE ADMIN CONTROL HUB */}
          {activeTab === 'admin_hub' && (
            <div className="max-w-7xl mx-auto">
              <AdminControlHub />
            </div>
          )}

          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* Row 1: Key Metrics */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                  <p className="text-xs text-slate-400">Today's Sales</p>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">₹{(dashboardStats.todaySales || 0).toLocaleString('en-IN')}</p>
                  <span className="text-[10px] text-slate-400">{dashboardStats.todayInvoicesCount || 0} bills today</span>
                </div>
                <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                  <p className="text-xs text-slate-400">Total Revenue</p>
                  <p className="text-2xl font-bold text-white mt-1">₹{(dashboardStats.totalRevenue || 0).toLocaleString('en-IN')}</p>
                  <span className="text-[10px] text-slate-400">From {dashboardStats.totalInvoices || 0} total invoices</span>
                </div>
                <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                  <p className="text-xs text-slate-400">Outstanding Receivables</p>
                  <p className="text-2xl font-bold text-amber-400 mt-1">₹{(dashboardStats.outstandingPayments || 0).toLocaleString('en-IN')}</p>
                  <span className="text-[10px] text-slate-400">Customer balances due</span>
                </div>
                <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                  <p className="text-xs text-slate-400">Low Stock Warnings</p>
                  <p className="text-2xl font-bold text-rose-400 mt-1">{dashboardStats.lowStockCount || 0} Items</p>
                  <span className="text-[10px] text-slate-400">Items below minimum stock</span>
                </div>
              </div>

              {/* Row 2: Cash / Card / UPI Sales Split */}
              <div className="bg-slate-800/60 p-5 rounded-xl border border-slate-700">
                <h3 className="font-semibold text-sm text-slate-200 mb-3">Sales Breakdown by Payment Method</h3>
                <div className="grid grid-cols-4 gap-4 text-xs">
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block mb-1">Cash In Hand</span>
                    <strong className="text-base text-emerald-400 font-mono">₹{(dashboardStats.paymentSplit?.Cash || 0).toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block mb-1">UPI / QR Code</span>
                    <strong className="text-base text-blue-400 font-mono">₹{(dashboardStats.paymentSplit?.UPI || 0).toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block mb-1">POS Card Swipes</span>
                    <strong className="text-base text-purple-400 font-mono">₹{(dashboardStats.paymentSplit?.Card || 0).toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block mb-1">Bank NEFT / IMPS</span>
                    <strong className="text-base text-amber-400 font-mono">₹{(dashboardStats.paymentSplit?.Bank || 0).toLocaleString('en-IN')}</strong>
                  </div>
                </div>
              </div>

              {/* Row 3: Top Selling Products & Low Stock Alerts */}
              <div className="grid grid-cols-2 gap-5">
                <div className="bg-slate-800/60 p-5 rounded-xl border border-slate-700">
                  <h3 className="font-semibold text-sm text-slate-200 mb-3">Top-Selling Products</h3>
                  <div className="space-y-2 text-xs">
                    {dashboardStats.topProducts?.length ? (
                      dashboardStats.topProducts.map((p: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-900/60 rounded-lg">
                          <span className="font-medium text-slate-200">{p.name}</span>
                          <span className="bg-blue-950 text-blue-400 border border-blue-800 px-2 py-0.5 rounded font-bold font-mono">{p.qty} sold</span>
                        </div>
                      ))
                    ) : <p className="text-slate-500">No sales recorded yet.</p>}
                  </div>
                </div>

                <div className="bg-slate-800/60 p-5 rounded-xl border border-slate-700">
                  <h3 className="font-semibold text-sm text-rose-300 mb-3 flex items-center gap-2">
                    <AlertCircle size={16} /> Urgent Low-Stock Alerts
                  </h3>
                  <div className="space-y-2 text-xs">
                    {dashboardStats.lowStockAlerts?.length ? (
                      dashboardStats.lowStockAlerts.map((prod: any) => (
                        <div key={prod.id} className="flex justify-between items-center p-2.5 bg-slate-900/60 rounded-lg">
                          <div>
                            <span className="font-medium text-slate-200">{prod.name}</span>
                            <span className="text-[10px] text-slate-500 block font-mono">{prod.sku}</span>
                          </div>
                          <span className="bg-rose-950 text-rose-400 border border-rose-800 px-2 py-0.5 rounded font-bold">{prod.stock} {prod.unit} left</span>
                        </div>
                      ))
                    ) : <p className="text-emerald-400">All products have sufficient stock levels.</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: POS / QUICK BILLING */}
          {activeTab === 'pos' && (
            <div className="h-full flex gap-4 max-w-7xl mx-auto">
              {/* Left Column: Product Catalog & Search */}
              <div className="flex-1 flex flex-col bg-slate-800/50 rounded-2xl border border-slate-700 p-4 overflow-hidden">
                <div className="flex gap-2 mb-3">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                    <input 
                      type="text" 
                      value={posSearch}
                      onChange={(e) => setPosSearch(e.target.value)}
                      placeholder="Scan Barcode or Search by product name / SKU..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <select 
                    value={posCategoryFilter}
                    onChange={(e) => setPosCategoryFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300"
                  >
                    <option value="ALL">All Categories</option>
                    {categories.map((c, i) => <option key={i} value={c.toUpperCase()}>{c}</option>)}
                  </select>
                </div>

                {/* Grid of Product Tiles */}
                <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-2.5 pr-1">
                  {filteredPosProducts.map(p => (
                    <button 
                      key={p.id}
                      onClick={() => handleAddToCart(p)}
                      className="p-3 bg-slate-900/90 hover:bg-slate-750 border border-slate-800 hover:border-emerald-500 rounded-xl text-left transition flex flex-col justify-between group"
                    >
                      <div>
                        <span className="text-[10px] text-slate-500 font-mono block">{p.sku}</span>
                        <h4 className="font-semibold text-xs text-slate-200 group-hover:text-emerald-400 line-clamp-2 mt-0.5">{p.name}</h4>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800">
                        <span className="text-xs font-bold text-white">₹{p.sellingPrice.toLocaleString('en-IN')}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${p.stock <= p.minStock ? 'bg-rose-950 text-rose-400' : 'bg-slate-800 text-slate-400'}`}>
                          {p.stock} {p.unit}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Column: Active Cart & Checkout */}
              <div className="w-96 flex flex-col bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl">
                {/* Customer Selector */}
                <div className="space-y-2 mb-3 pb-3 border-b border-slate-800 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-semibold">Customer Details</span>
                    {heldBills.length > 0 && (
                      <button 
                        onClick={() => setShowHeldBillsModal(true)}
                        className="text-[10px] text-amber-400 hover:underline flex items-center gap-1 font-bold"
                      >
                        <Play size={10} /> Resume Held ({heldBills.length})
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="text" 
                      value={posCustomerName}
                      onChange={(e) => setPosCustomerName(e.target.value)}
                      placeholder="Customer Name"
                      className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                    />
                    <input 
                      type="text" 
                      value={posCustomerPhone}
                      onChange={(e) => setPosCustomerPhone(e.target.value)}
                      placeholder="Phone (+91)"
                      className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto space-y-2 text-xs pr-1">
                  {posCart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12">
                      <ShoppingCart size={32} className="mb-2 opacity-40" />
                      <p>Cart is empty</p>
                      <p className="text-[10px]">Click any product to add</p>
                    </div>
                  ) : (
                    posCart.map(item => (
                      <div key={item.id} className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
                        <div className="flex-1 mr-2">
                          <p className="font-semibold text-slate-200 line-clamp-1">{item.name}</p>
                          <p className="text-[10px] text-slate-400">₹{item.sellingPrice} + {item.taxRate}% GST</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center bg-slate-800 rounded">
                            <button onClick={() => handleUpdateCartQty(item.id, -1)} className="px-2 py-0.5 hover:bg-slate-700 text-slate-300">-</button>
                            <span className="px-2 text-white font-bold">{item.quantity}</span>
                            <button onClick={() => handleUpdateCartQty(item.id, 1)} className="px-2 py-0.5 hover:bg-slate-700 text-slate-300">+</button>
                          </div>
                          <span className="font-mono font-bold text-white w-14 text-right">₹{item.total}</span>
                          <button onClick={() => handleRemoveFromCart(item.id)} className="text-slate-500 hover:text-rose-400 p-1">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Checkout Summary */}
                <div className="pt-3 border-t border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal</span>
                    <span className="font-mono">₹{posSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Estimated Tax (GST)</span>
                    <span className="font-mono">₹{posTaxTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Discount (₹)</span>
                    <input 
                      type="number" 
                      value={posDiscount}
                      onChange={(e) => setPosDiscount(e.target.value)}
                      className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-right text-emerald-400 font-mono font-semibold"
                    />
                  </div>
                  <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-slate-800">
                    <span>Grand Total:</span>
                    <span className="text-emerald-400 font-mono">₹{posGrandTotal.toFixed(2)}</span>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="grid grid-cols-4 gap-1 pt-1">
                    {(['Cash', 'UPI', 'Card', 'Credit'] as const).map(method => (
                      <button 
                        key={method}
                        onClick={() => setPosPaymentMethod(method)}
                        className={`py-1.5 rounded text-[11px] font-bold border transition ${posPaymentMethod === method ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'}`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-2 pt-2">
                    <button 
                      onClick={handleHoldBill}
                      disabled={!posCart.length}
                      className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-amber-300 font-semibold rounded-lg flex items-center justify-center gap-1.5 text-xs transition"
                    >
                      <Pause size={14} /> Hold Bill
                    </button>
                    <button 
                      onClick={handleCompletePosBill}
                      disabled={!posCart.length}
                      className="flex-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg flex items-center justify-center gap-2 text-xs shadow-lg shadow-emerald-700/40 transition"
                    >
                      <Printer size={15} /> Complete & Print
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SALES & INVOICES */}
          {activeTab === 'sales' && (
            <div className="space-y-4 max-w-7xl mx-auto">
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input 
                    type="text" 
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                    placeholder="Search invoices by customer name, phone, or invoice #..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400"
                  />
                </div>
                <button 
                  onClick={() => setShowCreateInvoiceModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md"
                >
                  <Plus size={16} /> Create B2B Tax Invoice
                </button>
              </div>

              {/* Invoices Table */}
              <div className="bg-slate-800/60 rounded-xl border border-slate-700 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-700">
                    <tr>
                      <th className="p-3.5">Invoice #</th>
                      <th className="p-3.5">Type</th>
                      <th className="p-3.5">Customer Details</th>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5">Payment</th>
                      <th className="p-3.5">Total Amount</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {invoices.filter(i => i.customerName?.toLowerCase().includes(invoiceSearch.toLowerCase()) || i.id?.toLowerCase().includes(invoiceSearch.toLowerCase())).map(inv => (
                      <tr key={inv.id} className="hover:bg-slate-800/70">
                        <td className="p-3.5 font-mono font-bold text-blue-400">{inv.id}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${inv.type === 'POS' ? 'bg-emerald-950 text-emerald-400' : 'bg-blue-950 text-blue-400'}`}>
                            {inv.type || 'INVOICE'}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <p className="font-semibold text-slate-200">{inv.customerName}</p>
                          {inv.customerPhone && <p className="text-[10px] text-slate-400">{inv.customerPhone}</p>}
                        </td>
                        <td className="p-3.5 text-slate-300">{inv.date}</td>
                        <td className="p-3.5 text-slate-300 font-medium">{inv.paymentMethod || 'Cash'}</td>
                        <td className="p-3.5 font-bold text-white">₹{inv.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${inv.status === 'PAID' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right space-x-2">
                          <button onClick={() => setSelectedInvoiceForView(inv)} className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded text-[11px] text-white">
                            View / Print
                          </button>
                          {inv.paymentLink && inv.status !== 'PAID' && (
                            <a href={inv.paymentLink} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600/80 hover:bg-indigo-500 rounded text-[11px] text-white">
                              <ExternalLink size={11} /> Pay Online
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: SUBSCRIPTIONS (Zoho-Billing-style recurring plans) */}
          {activeTab === 'subscriptions' && (
            <div className="max-w-7xl mx-auto h-full">
              <SubscriptionsPage
                plans={plans}
                subscriptions={subscriptions}
                coupons={coupons}
                addOns={addOns}
                customers={customers}
                onRefresh={loadAllData}
              />
            </div>
          )}

          {/* TAB 4: PURCHASES & STOCK-IN */}
          {activeTab === 'purchases' && (
            <div className="space-y-4 max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-100">Inward Purchase Invoices & Stock Receipts</h3>
                  <p className="text-xs text-slate-400">Record inventory intake from registered suppliers</p>
                </div>
                <button 
                  onClick={() => setShowAddPurchaseModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md"
                >
                  <Plus size={16} /> Record Inward Stock
                </button>
              </div>

              <div className="bg-slate-800/60 rounded-xl border border-slate-700 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-700">
                    <tr>
                      <th className="p-3.5">Purchase #</th>
                      <th className="p-3.5">Supplier Name</th>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5">Items Received</th>
                      <th className="p-3.5">Total Value</th>
                      <th className="p-3.5">Payment</th>
                      <th className="p-3.5">Goods Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {purchases.map(pur => (
                      <tr key={pur.id} className="hover:bg-slate-800/70">
                        <td className="p-3.5 font-mono font-bold text-amber-400">{pur.id}</td>
                        <td className="p-3.5 font-semibold text-slate-200">{pur.supplierName}</td>
                        <td className="p-3.5 text-slate-400">{pur.date}</td>
                        <td className="p-3.5 text-slate-300">{pur.items?.length || 0} line(s)</td>
                        <td className="p-3.5 font-bold text-white">₹{pur.total.toLocaleString('en-IN')}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${pur.paymentStatus === 'PAID' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'}`}>
                            {pur.paymentStatus}
                          </span>
                        </td>
                        <td className="p-3.5 text-emerald-400 font-semibold">{pur.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: PRODUCTS & CATALOG */}
          {activeTab === 'products' && (
            <div className="space-y-4 max-w-7xl mx-auto">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 max-w-xl">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                    <input 
                      type="text" 
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search SKU, barcode, or product name..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400"
                    />
                  </div>
                  <select 
                    value={productCategoryFilter}
                    onChange={(e) => setProductCategoryFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300"
                  >
                    <option value="ALL">All Categories</option>
                    {categories.map((c, i) => <option key={i} value={c.toUpperCase()}>{c}</option>)}
                  </select>
                </div>
                <button 
                  onClick={() => setShowAddProductModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md"
                >
                  <Plus size={16} /> Add Product Master
                </button>
              </div>

              <div className="bg-slate-800/60 rounded-xl border border-slate-700 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-700">
                    <tr>
                      <th className="p-3.5">SKU / Barcode</th>
                      <th className="p-3.5">Product Name</th>
                      <th className="p-3.5">HSN/SAC</th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5">Brand & Unit</th>
                      <th className="p-3.5">Purchase Cost</th>
                      <th className="p-3.5">Selling Price</th>
                      <th className="p-3.5">Stock</th>
                      <th className="p-3.5">Batch / Expiry</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredProducts.map(prod => (
                      <tr key={prod.id} className="hover:bg-slate-800/70">
                        <td className="p-3.5 font-mono text-slate-400">
                          <p className="font-bold text-slate-300">{prod.sku}</p>
                          <p className="text-[10px] text-slate-500">{prod.barcode}</p>
                        </td>
                        <td className="p-3.5 font-semibold text-slate-200">{prod.name}</td>
                        <td className="p-3.5 font-mono text-slate-400">{prod.hsnCode || '—'}</td>
                        <td className="p-3.5 text-slate-300">{prod.category}</td>
                        <td className="p-3.5 text-slate-400">{prod.brand} ({prod.unit})</td>
                        <td className="p-3.5 font-mono text-slate-400">₹{prod.purchasePrice}</td>
                        <td className="p-3.5 font-mono font-bold text-emerald-400">₹{prod.sellingPrice}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${prod.stock <= prod.minStock ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-emerald-950 text-emerald-400'}`}>
                            {prod.stock} {prod.unit}
                          </span>
                        </td>
                        <td className="p-3.5 text-[11px] text-slate-400">
                          {prod.batch} | {prod.expiry}
                        </td>
                        <td className="p-3.5 text-right">
                          <button 
                            onClick={() => { setStockAdjustItem(prod); setShowStockAdjustModal(true); }}
                            className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded text-[10px] font-semibold text-slate-200"
                          >
                            Adjust Stock
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: INVENTORY & STOCK VALUATION */}
          {activeTab === 'inventory' && (
            <div className="space-y-5 max-w-7xl mx-auto">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700">
                  <p className="text-xs text-slate-400">Total Stock Valuation (Cost Basis)</p>
                  <p className="text-2xl font-bold text-blue-400 mt-1">₹{(reports.totalStockValuation || 0).toLocaleString('en-IN')}</p>
                  <span className="text-[10px] text-slate-400">Aggregate value of current inventory</span>
                </div>
                <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700">
                  <p className="text-xs text-slate-400">Active Catalog Items</p>
                  <p className="text-2xl font-bold text-white mt-1">{products.length} Products</p>
                  <span className="text-[10px] text-slate-400">Across {categories.length} categories</span>
                </div>
                <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700">
                  <p className="text-xs text-slate-400">Critical Stock Items</p>
                  <p className="text-2xl font-bold text-rose-400 mt-1">{dashboardStats.lowStockCount || 0}</p>
                  <span className="text-[10px] text-slate-400">Requires purchase order placement</span>
                </div>
              </div>

              <div className="bg-slate-800/60 rounded-xl border border-slate-700 p-5">
                <h3 className="font-semibold text-sm text-slate-200 mb-3">Inventory Valuation Ledger</h3>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-700">
                    <tr>
                      <th className="p-3">Item Name</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Stock Units</th>
                      <th className="p-3">Avg Purchase Cost</th>
                      <th className="p-3">Selling Value</th>
                      <th className="p-3">Total Asset Valuation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {products.map(p => (
                      <tr key={p.id}>
                        <td className="p-3 font-semibold text-slate-200">{p.name}</td>
                        <td className="p-3 text-slate-400">{p.category}</td>
                        <td className="p-3 font-bold text-white">{p.stock} {p.unit}</td>
                        <td className="p-3 font-mono text-slate-400">₹{p.purchasePrice}</td>
                        <td className="p-3 font-mono text-emerald-400">₹{p.sellingPrice}</td>
                        <td className="p-3 font-mono font-bold text-blue-400">₹{(p.purchasePrice * p.stock).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: CUSTOMERS & BALANCES */}
          {activeTab === 'customers' && (
            <div className="space-y-4 max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-100">Customer Profiles & Accounts Receivable</h3>
                  <p className="text-xs text-slate-400">Manage client credit limits, contact directory, and balances</p>
                </div>
                <button 
                  onClick={() => setShowAddCustomerModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md"
                >
                  <Plus size={16} /> Add New Customer
                </button>
              </div>

              <div className="bg-slate-800/60 rounded-xl border border-slate-700 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-700">
                    <tr>
                      <th className="p-3.5">Customer Name</th>
                      <th className="p-3.5">Contact Phone & Email</th>
                      <th className="p-3.5">GSTIN</th>
                      <th className="p-3.5">Group</th>
                      <th className="p-3.5">Credit Limit</th>
                      <th className="p-3.5">Outstanding Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {customers.map(c => (
                      <tr key={c.id} className="hover:bg-slate-800/70">
                        <td className="p-3.5 font-bold text-slate-200">{c.name}</td>
                        <td className="p-3.5">
                          <p className="font-mono text-slate-300">{c.phone}</p>
                          <p className="text-[10px] text-slate-500">{c.email}</p>
                        </td>
                        <td className="p-3.5 font-mono text-slate-400">{c.gstin || 'Unregistered'}</td>
                        <td className="p-3.5"><span className="px-2 py-0.5 rounded text-[10px] bg-slate-700">{c.group}</span></td>
                        <td className="p-3.5 font-mono text-slate-300">₹{c.creditLimit?.toLocaleString('en-IN')}</td>
                        <td className="p-3.5 font-mono font-bold text-amber-400">₹{(c.outstandingBalance || 0).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 8: SUPPLIERS & PAYABLES */}
          {activeTab === 'suppliers' && (
            <div className="space-y-4 max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-100">Supplier Master & Accounts Payable</h3>
                  <p className="text-xs text-slate-400">Vendor directory, contact information, and outstanding balances</p>
                </div>
                <button 
                  onClick={() => setShowAddSupplierModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md"
                >
                  <Plus size={16} /> Register New Supplier
                </button>
              </div>

              <div className="bg-slate-800/60 rounded-xl border border-slate-700 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-700">
                    <tr>
                      <th className="p-3.5">Vendor Name</th>
                      <th className="p-3.5">Contact Details</th>
                      <th className="p-3.5">GSTIN</th>
                      <th className="p-3.5">Address</th>
                      <th className="p-3.5">Outstanding Payables</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {suppliers.map(s => (
                      <tr key={s.id} className="hover:bg-slate-800/70">
                        <td className="p-3.5 font-bold text-slate-200">{s.name}</td>
                        <td className="p-3.5 font-mono text-slate-300">{s.phone} | {s.email}</td>
                        <td className="p-3.5 font-mono text-slate-400">{s.gstin}</td>
                        <td className="p-3.5 text-slate-400">{s.address}</td>
                        <td className="p-3.5 font-mono font-bold text-rose-400">₹{(s.payables || 0).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 9: DAILY EXPENSES */}
          {activeTab === 'expenses' && (
            <div className="space-y-4 max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-100">Daily Operating Expenses Ledger</h3>
                  <p className="text-xs text-slate-400">Record utilities, rent, employee logistics, and office expenses</p>
                </div>
                <button 
                  onClick={() => setShowAddExpenseModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md"
                >
                  <Plus size={16} /> Add Daily Expense
                </button>
              </div>

              <div className="bg-slate-800/60 rounded-xl border border-slate-700 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-700">
                    <tr>
                      <th className="p-3.5">Expense ID</th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5">Paid To</th>
                      <th className="p-3.5">Mode</th>
                      <th className="p-3.5">Note</th>
                      <th className="p-3.5 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {expenses.map(exp => (
                      <tr key={exp.id} className="hover:bg-slate-800/70">
                        <td className="p-3.5 font-mono text-slate-400">{exp.id}</td>
                        <td className="p-3.5 font-semibold text-slate-200">{exp.category}</td>
                        <td className="p-3.5 text-slate-400">{exp.date}</td>
                        <td className="p-3.5 text-slate-300">{exp.paidTo}</td>
                        <td className="p-3.5"><span className="px-2 py-0.5 rounded text-[10px] bg-slate-700">{exp.paymentMethod}</span></td>
                        <td className="p-3.5 text-slate-400">{exp.note}</td>
                        <td className="p-3.5 font-mono font-bold text-rose-400 text-right">₹{exp.amount.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 10: REPORTS & PROFIT/LOSS */}
          {activeTab === 'reports' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="p-6 bg-slate-800/80 rounded-2xl border border-slate-700">
                <h3 className="font-bold text-base text-slate-100 mb-4">Executive Financial Profit & Loss Statement</h3>
                <div className="space-y-3 text-xs max-w-xl">
                  <div className="flex justify-between py-2 border-b border-slate-700 text-slate-300">
                    <span className="font-semibold text-sm">Total Sales Revenue:</span>
                    <span className="font-mono text-base font-bold text-emerald-400">₹{(reports.totalSales || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-700 text-slate-400">
                    <span>Less: Cost of Goods Sold (COGS):</span>
                    <span className="font-mono font-medium text-rose-400">-₹{(reports.cogs || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-700 text-slate-200 font-bold">
                    <span>Gross Profit:</span>
                    <span className="font-mono text-blue-400">₹{(reports.grossProfit || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-700 text-slate-400">
                    <span>Less: Total Operating Expenses:</span>
                    <span className="font-mono font-medium text-rose-400">-₹{(reports.totalExpenses || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-3 border-t-2 border-slate-600 text-base font-black text-white">
                    <span>Net Operating Profit:</span>
                    <span className="font-mono text-emerald-400">₹{(reports.netProfit || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-slate-800/60 rounded-xl border border-slate-700">
                  <h4 className="font-semibold text-sm text-slate-200 mb-2">Total Outstanding Receivables</h4>
                  <p className="text-2xl font-bold text-amber-400 font-mono">₹{(reports.totalReceivables || 0).toLocaleString('en-IN')}</p>
                  <p className="text-xs text-slate-400 mt-1">Pending payments from customers</p>
                </div>
                <div className="p-5 bg-slate-800/60 rounded-xl border border-slate-700">
                  <h4 className="font-semibold text-sm text-slate-200 mb-2">Total Outstanding Payables</h4>
                  <p className="text-2xl font-bold text-rose-400 font-mono">₹{(reports.totalPayables || 0).toLocaleString('en-IN')}</p>
                  <p className="text-xs text-slate-400 mt-1">Amounts owed to registered suppliers</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 11: COMPANY PROFILE & SETTINGS */}
          {activeTab === 'settings' && (
            <div className="max-w-3xl mx-auto bg-slate-800/80 p-6 rounded-2xl border border-slate-700 space-y-4 text-xs">
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <Settings size={18} className="text-blue-400" /> Company Profile, GST & Receipt Settings
              </h3>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Trade / Store Name</label>
                    <input 
                      type="text" 
                      value={companySettings.name || ''} 
                      onChange={(e) => setCompanySettings({ ...companySettings, name: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" 
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Legal Registered Entity Name</label>
                    <input 
                      type="text" 
                      value={companySettings.legalName || ''} 
                      onChange={(e) => setCompanySettings({ ...companySettings, legalName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Company GSTIN</label>
                    <input 
                      type="text" 
                      value={companySettings.gstin || ''} 
                      onChange={(e) => setCompanySettings({ ...companySettings, gstin: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono" 
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">PAN Number</label>
                    <input 
                      type="text" 
                      value={companySettings.pan || ''} 
                      onChange={(e) => setCompanySettings({ ...companySettings, pan: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono" 
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Contact Phone</label>
                    <input 
                      type="text" 
                      value={companySettings.phone || ''} 
                      onChange={(e) => setCompanySettings({ ...companySettings, phone: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono" 
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Store / Business Address</label>
                  <input 
                    type="text" 
                    value={companySettings.address || ''} 
                    onChange={(e) => setCompanySettings({ ...companySettings, address: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" 
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Bank Name</label>
                    <input 
                      type="text" 
                      value={companySettings.bankName || ''} 
                      onChange={(e) => setCompanySettings({ ...companySettings, bankName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" 
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Account Number</label>
                    <input 
                      type="text" 
                      value={companySettings.accountNumber || ''} 
                      onChange={(e) => setCompanySettings({ ...companySettings, accountNumber: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono" 
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">IFSC / UPI ID</label>
                    <input 
                      type="text" 
                      value={companySettings.upiId || ''} 
                      onChange={(e) => setCompanySettings({ ...companySettings, upiId: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono" 
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Receipt / Invoice Footer Terms</label>
                  <textarea 
                    rows={2}
                    value={companySettings.receiptFooter || ''} 
                    onChange={(e) => setCompanySettings({ ...companySettings, receiptFooter: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" 
                  />
                </div>

                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-md">
                  Save Company Settings
                </button>
              </form>
            </div>
          )}

          {/* TAB 12: SECURITY & LICENSE */}
          {activeTab === 'security' && (
            <div className="max-w-4xl mx-auto space-y-6 text-xs">
              {/* Hardware License Card */}
              <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700">
                <div className="flex items-center gap-3 mb-4">
                  <ShieldCheck size={28} className="text-blue-400" />
                  <div>
                    <h3 className="font-bold text-base text-white">Zia-Billing Machine Hardware Authentication</h3>
                    <p className="text-slate-400">Offline RSA-cryptographic license key verification bound to machine CPU, Memory & NIC</p>
                  </div>
                </div>

                <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 mb-4">
                  <label className="text-slate-400 block mb-1">Unique Machine Fingerprint ID:</label>
                  <div className="font-mono text-base font-bold text-amber-400 select-all">{systemId}</div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-slate-300">Enter Cryptographic Activation Key:</label>
                    <button onClick={handleGenerateDemoLicense} className="text-blue-400 hover:underline">
                      Generate Demo 1-Year Enterprise Key
                    </button>
                  </div>
                  <textarea 
                    rows={3} 
                    value={inputKey} 
                    onChange={(e) => setInputKey(e.target.value)} 
                    placeholder="Paste activation payload..." 
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 font-mono text-slate-200"
                  />
                  {activationMsg && (
                    <div className={`p-2.5 rounded ${activationMsg.type === 'success' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'}`}>
                      {activationMsg.text}
                    </div>
                  )}
                  <button onClick={handleActivate} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg">
                    Activate Machine License
                  </button>
                </div>
              </div>

              {/* Audit Log */}
              <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700">
                <h3 className="font-bold text-sm text-slate-200 mb-3">Security & Activity Audit Logs</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto font-mono text-[11px]">
                  {auditLogs.map((log, idx) => (
                    <div key={idx} className="p-2 bg-slate-900 rounded border border-slate-800 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        <span className="text-blue-400 font-bold">{log.user}</span>
                        <span className="text-amber-300 font-semibold">{log.action}</span>
                        <span className="text-slate-300">{log.details}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 13: BACKUP & RESTORE */}
          {activeTab === 'backup' && (
            <div className="max-w-2xl mx-auto bg-slate-800/80 p-6 rounded-2xl border border-slate-700 space-y-5 text-xs">
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <Save size={18} className="text-blue-400" /> Database Backup, Restore & Data Migration
              </h3>

              <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                <h4 className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Download size={15} /> 1. Download Local Database Backup
                </h4>
                <p className="text-slate-400">Save a complete snapshot of all products, invoices, stock, customers, and suppliers as a `.json` archive file.</p>
                <a 
                  href="http://localhost:4200/api/backup/export" 
                  download 
                  className="inline-block mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition"
                >
                  Download Complete System Backup
                </a>
              </div>

              <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                <h4 className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Upload size={15} /> 2. Restore System from Backup
                </h4>
                <p className="text-slate-400">Upload or paste a valid Zia-Billing `.json` backup file to restore database records.</p>
                <textarea 
                  rows={4}
                  placeholder="Paste backup JSON data here to restore..."
                  id="restoreJsonText"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 font-mono text-slate-300"
                />
                <button 
                  onClick={() => {
                    const el = document.getElementById('restoreJsonText') as HTMLTextAreaElement;
                    if (!el || !el.value.trim()) return alert('Please paste backup JSON content.');
                    try {
                      const parsed = JSON.parse(el.value);
                      fetch('http://localhost:4200/api/backup/restore', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(parsed)
                      })
                        .then(r => r.json())
                        .then(d => { alert(d.message || 'Restored!'); loadAllData(); });
                    } catch (e: any) {
                      alert('Invalid JSON: ' + e.message);
                    }
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition"
                >
                  Execute Restore Database
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* --- MODAL 1: ADD PRODUCT MASTER --- */}
      {showAddProductModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Package size={16} className="text-blue-400" /> Register Product in Catalog
              </h3>
              <button onClick={() => setShowAddProductModal(false)} className="text-slate-400 hover:text-white"><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveProduct} className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">Product Name *</label>
                <input 
                  type="text" required value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder="e.g. 80mm Thermal Receipt Printer" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">SKU Code</label>
                  <input type="text" value={newProduct.sku} onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })} placeholder="HW-PRN-80" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Barcode</label>
                  <input type="text" value={newProduct.barcode} onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })} placeholder="8901234005" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">HSN / SAC Code</label>
                  <input type="text" value={newProduct.hsnCode} onChange={(e) => setNewProduct({ ...newProduct, hsnCode: e.target.value })} placeholder="8471" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Category</label>
                  <select value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white">
                    {categories.map((c, i) => <option key={i} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Brand</label>
                  <select value={newProduct.brand} onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white">
                    {brands.map((b, i) => <option key={i} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Unit</label>
                  <select value={newProduct.unit} onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white">
                    {units.map((u, i) => <option key={i} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Purchase Price (₹)</label>
                  <input type="number" step="0.01" value={newProduct.purchasePrice} onChange={(e) => setNewProduct({ ...newProduct, purchasePrice: e.target.value })} placeholder="5000" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Selling Price (₹) *</label>
                  <input type="number" step="0.01" required value={newProduct.sellingPrice} onChange={(e) => setNewProduct({ ...newProduct, sellingPrice: e.target.value })} placeholder="7500" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-bold" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">GST Tax (%)</label>
                  <input type="number" value={newProduct.taxRate} onChange={(e) => setNewProduct({ ...newProduct, taxRate: e.target.value })} placeholder="18" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Initial Stock</label>
                  <input type="number" value={newProduct.stock} onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })} placeholder="10" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Min Alert Stock</label>
                  <input type="number" value={newProduct.minStock} onChange={(e) => setNewProduct({ ...newProduct, minStock: e.target.value })} placeholder="5" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Batch / Expiry</label>
                  <input type="text" value={newProduct.batch} onChange={(e) => setNewProduct({ ...newProduct, batch: e.target.value })} placeholder="B-01" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowAddProductModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: STOCK ADJUSTMENT --- */}
      {showStockAdjustModal && stockAdjustItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-5 shadow-2xl">
            <h3 className="font-bold text-sm text-white mb-2">Adjust Inventory Stock</h3>
            <p className="text-slate-400 mb-3">{stockAdjustItem.name} (Current: <strong>{stockAdjustItem.stock} {stockAdjustItem.unit}</strong>)</p>
            <form onSubmit={handleStockAdjustmentSubmit} className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">Quantity Adjustment (+ or -)</label>
                <input type="number" value={stockAdjustDelta} onChange={(e) => setStockAdjustDelta(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono text-center font-bold text-sm" />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Adjustment Reason</label>
                <select value={stockAdjustReason} onChange={(e) => setStockAdjustReason(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white">
                  <option value="Manual Count Correction">Manual Count Correction</option>
                  <option value="Damaged / Expired Goods">Damaged / Expired Goods</option>
                  <option value="Supplier Sample Receipt">Supplier Sample Receipt</option>
                  <option value="Customer Return Restock">Customer Return Restock</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button type="button" onClick={() => setShowStockAdjustModal(false)} className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white font-bold rounded">Apply Adjustment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: RECORD PURCHASE --- */}
      {showAddPurchaseModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white">Record Inward Stock Purchase</h3>
              <button onClick={() => setShowAddPurchaseModal(false)} className="text-slate-400 hover:text-white"><X size={16} /></button>
            </div>
            <form onSubmit={handleSavePurchase} className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">Select Registered Supplier *</label>
                <select required value={newPurchase.supplierId} onChange={(e) => setNewPurchase({ ...newPurchase, supplierId: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white">
                  <option value="">Select Supplier...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.phone})</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Product Purchased *</label>
                <select required value={newPurchase.productId} onChange={(e) => setNewPurchase({ ...newPurchase, productId: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white">
                  <option value="">Select Product...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (Current Stock: {p.stock})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Quantity Received</label>
                  <input type="number" required value={newPurchase.quantity} onChange={(e) => setNewPurchase({ ...newPurchase, quantity: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Unit Cost (₹)</label>
                  <input type="number" step="0.01" value={newPurchase.unitCost} onChange={(e) => setNewPurchase({ ...newPurchase, unitCost: e.target.value })} placeholder="Cost" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowAddPurchaseModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white font-bold rounded">Record Inward Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 4: RECORD EXPENSE --- */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-bold text-sm text-white mb-3">Record Daily Business Expense</h3>
            <form onSubmit={handleSaveExpense} className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">Category</label>
                <select value={newExpense.category} onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white">
                  {expenseCategories.map((c, i) => <option key={i} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Amount (₹) *</label>
                <input type="number" step="0.01" required value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })} placeholder="1500" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Paid To</label>
                  <input type="text" value={newExpense.paidTo} onChange={(e) => setNewExpense({ ...newExpense, paidTo: e.target.value })} placeholder="e.g. BESCOM" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Payment Method</label>
                  <select value={newExpense.paymentMethod} onChange={(e) => setNewExpense({ ...newExpense, paymentMethod: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white">
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Remarks / Note</label>
                <input type="text" value={newExpense.note} onChange={(e) => setNewExpense({ ...newExpense, note: e.target.value })} placeholder="Description" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowAddExpenseModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white font-bold rounded">Record Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 5: ADD CUSTOMER --- */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-bold text-sm text-white mb-3">Add Customer Profile</h3>
            <form onSubmit={handleSaveCustomer} className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">Customer / Organization Name *</label>
                <input type="text" required value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Phone *</label>
                  <input type="text" required value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">GSTIN</label>
                  <input type="text" value={newCustomer.gstin} onChange={(e) => setNewCustomer({ ...newCustomer, gstin: e.target.value })} placeholder="29ABCDE1234F1Z5" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Email</label>
                  <input type="email" value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} placeholder="customer@example.com" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Customer Group</label>
                  <select value={newCustomer.group} onChange={(e) => setNewCustomer({ ...newCustomer, group: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white">
                    <option value="Retail">Retail</option>
                    <option value="Wholesale">Wholesale</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Address</label>
                <input type="text" value={newCustomer.address} onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })} placeholder="Delivery / billing address" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Credit Limit (₹)</label>
                <input type="number" value={newCustomer.creditLimit} onChange={(e) => setNewCustomer({ ...newCustomer, creditLimit: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowAddCustomerModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white font-bold rounded">Save Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 6: ADD SUPPLIER --- */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-bold text-sm text-white mb-3">Register Supplier</h3>
            <form onSubmit={handleSaveSupplier} className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">Supplier / Vendor Name *</label>
                <input type="text" required value={newSupplier.name} onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Phone Number *</label>
                  <input type="text" required value={newSupplier.phone} onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">GSTIN</label>
                  <input type="text" value={newSupplier.gstin} onChange={(e) => setNewSupplier({ ...newSupplier, gstin: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono" />
                </div>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Email</label>
                <input type="email" value={newSupplier.email} onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })} placeholder="vendor@example.com" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Address</label>
                <input type="text" value={newSupplier.address} onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })} placeholder="Supplier business address" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowAddSupplierModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white font-bold rounded">Save Supplier</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 7: HELD BILLS DIALOG --- */}
      {showHeldBillsModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white">Active Held Bills (POS Counter)</h3>
              <button onClick={() => setShowHeldBillsModal(false)} className="text-slate-400 hover:text-white"><X size={16} /></button>
            </div>
            <div className="space-y-2">
              {heldBills.map(h => (
                <div key={h.id} className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex justify-between items-center">
                  <div>
                    <span className="font-mono text-amber-400 font-bold block">{h.id} ({h.time})</span>
                    <span className="text-slate-300 font-semibold">{h.customerName}</span>
                    <span className="text-[10px] text-slate-500 block">{h.items?.length || 0} items | ₹{h.total}</span>
                  </div>
                  <button 
                    onClick={() => handleResumeBill(h)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold"
                  >
                    Resume Bill
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 8: INVOICE / RECEIPT PREVIEW & PRINT --- */}
      {selectedInvoiceForView && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-xs">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-2xl p-8 shadow-2xl max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-5">
              <div>
                <h2 className="text-2xl font-black text-blue-700 tracking-wider">{companySettings.name || 'ZIA-BILLING'}</h2>
                <p className="text-xs text-slate-500">{companySettings.address}</p>
                <p className="text-xs text-slate-500">GSTIN: <strong>{companySettings.gstin}</strong> | State: {companySettings.state}</p>
                <p className="text-xs text-slate-500">Phone: {companySettings.phone}</p>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold font-mono text-slate-800">{selectedInvoiceForView.id}</span>
                <p className="text-xs text-slate-500 mt-1">Date: {selectedInvoiceForView.date}</p>
                <p className="text-xs text-slate-500 font-bold text-emerald-700">Mode: {selectedInvoiceForView.paymentMethod || 'Cash'}</p>
              </div>
            </div>

            {/* Billed To */}
            <div className="my-5 p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Billed To:</span>
                <p className="text-sm font-bold text-slate-800">{selectedInvoiceForView.customerName}</p>
                {selectedInvoiceForView.customerPhone && <p className="text-slate-600">{selectedInvoiceForView.customerPhone}</p>}
                {selectedInvoiceForView.customerGstin && <p className="text-slate-600 font-mono">GSTIN: {selectedInvoiceForView.customerGstin}</p>}
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Status:</span>
                <span className="inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  {selectedInvoiceForView.status}
                </span>
              </div>
            </div>

            {/* Line Items */}
            <table className="w-full text-left text-xs mb-5">
              <thead>
                <tr className="border-b-2 border-slate-200 text-slate-500">
                  <th className="py-2">Item Description</th>
                  <th className="py-2">HSN/SAC</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Price (₹)</th>
                  <th className="py-2 text-right">GST %</th>
                  <th className="py-2 text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedInvoiceForView.items?.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className="py-2 font-medium text-slate-800">{item.name}</td>
                    <td className="py-2 font-mono text-slate-500">{item.hsnCode || '—'}</td>
                    <td className="py-2 text-center">{item.quantity}</td>
                    <td className="py-2 text-right">₹{item.unitPrice || item.sellingPrice}</td>
                    <td className="py-2 text-right">{item.taxRate}%</td>
                    <td className="py-2 text-right font-bold">₹{(item.total || (item.quantity * item.unitPrice)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-between items-start border-t border-slate-200 pt-4 mb-4">
              <div className="text-slate-500 text-[11px] max-w-xs">
                <p className="font-semibold text-slate-700">Bank Transfer Details:</p>
                <p>Bank: {companySettings.bankName} | A/C: {companySettings.accountNumber}</p>
                <p>IFSC: {companySettings.ifsc} | UPI: {companySettings.upiId}</p>
                <p className="mt-2 italic text-[10px]">{companySettings.receiptFooter}</p>
              </div>
              <div className="w-56 space-y-1.5 text-right text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono">₹{selectedInvoiceForView.subtotal?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>GST Tax:</span>
                  <span className="font-mono">₹{selectedInvoiceForView.tax?.toFixed(2)}</span>
                </div>
                {selectedInvoiceForView.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span className="font-mono">-₹{selectedInvoiceForView.discount?.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-200 pt-2">
                  <span>Grand Total:</span>
                  <span className="text-blue-700 font-mono">₹{selectedInvoiceForView.total?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button onClick={() => setSelectedInvoiceForView(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold">
                Close
              </button>
              <button onClick={() => window.print()} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded flex items-center gap-1.5 shadow">
                <Printer size={15} /> Print Receipt / Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
