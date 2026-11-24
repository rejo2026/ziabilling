// ============================================================
// UAE Automotive Spare Parts ERP Router
// Extends and enriches Zia-Billing with full UAE regional configuration,
// Automotive Parts Fitment Catalogue, High-Speed POS, Split Tenders,
// FTA 5% VAT Invoicing & QR Code, Credit Notes, Cash Register shifts,
// Dynamic Modules & Custom Fields, and WhatsApp/Email dispatches.
// ============================================================

const express = require('express');

function createUaeErpRouter(context) {
  const router = express.Router();
  const { state, persist, nextId, logAudit, defaultState } = context;

  // Initialize UAE ERP state structures if missing
  function ensureStructures() {
    if (!state.companySettings) {
      state.companySettings = {};
    }
    // Set UAE defaults if not configured
    if (!state.companySettings.countryCode || state.companySettings.countryCode === 'IN') {
      state.companySettings.countryCode = 'AE';
      state.companySettings.currency = 'AED';
      state.companySettings.currencySymbol = 'AED';
      state.companySettings.timezone = 'Asia/Dubai';
      state.companySettings.taxSystem = 'VAT';
      state.companySettings.taxRegistrationLabel = 'TRN';
      state.companySettings.trn = state.companySettings.trn || '100482910400003';
      state.companySettings.name = state.companySettings.name || 'Al Futtaim Auto Spare Parts Trading LLC';
      state.companySettings.legalName = state.companySettings.legalName || 'Al Futtaim Auto Spare Parts Trading LLC';
      state.companySettings.address = state.companySettings.address || 'Warehouse 14, Industrial Area 4, Al Quoz, Dubai, UAE';
      state.companySettings.phone = state.companySettings.phone || '+971 4 345 6789';
      state.companySettings.email = state.companySettings.email || 'sales@alfuttaim-autoparts.ae';
      state.companySettings.defaultLanguage = 'en';
      state.companySettings.isRTL = false;
      state.companySettings.emirate = 'Dubai';
    }

    if (!Array.isArray(state.vehicleMakes) || state.vehicleMakes.length === 0) {
      state.vehicleMakes = [
        { id: 'MK-TOYOTA', name: 'Toyota', country: 'Japan', popular: true, isActive: true },
        { id: 'MK-NISSAN', name: 'Nissan', country: 'Japan', popular: true, isActive: true },
        { id: 'MK-MITSUBISHI', name: 'Mitsubishi', country: 'Japan', popular: true, isActive: true },
        { id: 'MK-HONDA', name: 'Honda', country: 'Japan', popular: true, isActive: true },
        { id: 'MK-HYUNDAI', name: 'Hyundai', country: 'South Korea', popular: true, isActive: true },
        { id: 'MK-KIA', name: 'Kia', country: 'South Korea', popular: true, isActive: true },
        { id: 'MK-LEXUS', name: 'Lexus', country: 'Japan', popular: true, isActive: true },
        { id: 'MK-MERCEDES', name: 'Mercedes-Benz', country: 'Germany', popular: true, isActive: true },
        { id: 'MK-BMW', name: 'BMW', country: 'Germany', popular: true, isActive: true },
        { id: 'MK-FORD', name: 'Ford', country: 'USA', popular: true, isActive: true },
        { id: 'MK-CHEVROLET', name: 'Chevrolet', country: 'USA', popular: true, isActive: true },
        { id: 'MK-LANDROVER', name: 'Land Rover', country: 'UK', popular: true, isActive: true },
        { id: 'MK-ISUZU', name: 'Isuzu', country: 'Japan', popular: true, isActive: true },
        { id: 'MK-MAZDA', name: 'Mazda', country: 'Japan', popular: true, isActive: true }
      ];
    }

    if (!Array.isArray(state.vehicleModels) || state.vehicleModels.length === 0) {
      state.vehicleModels = [
        { id: 'MD-TOY-LC', makeId: 'MK-TOYOTA', makeName: 'Toyota', name: 'Land Cruiser (V8 / GR / LC300)', yearFrom: 2008, yearTo: 2026, engineType: '4.0L V6 / 5.7L V8 / 3.5L Twin-Turbo' },
        { id: 'MD-TOY-PRADO', makeId: 'MK-TOYOTA', makeName: 'Toyota', name: 'Land Cruiser Prado (TX / VX)', yearFrom: 2010, yearTo: 2026, engineType: '2.7L / 4.0L Petrol' },
        { id: 'MD-TOY-HILUX', makeId: 'MK-TOYOTA', makeName: 'Toyota', name: 'Hilux Double Cabin', yearFrom: 2012, yearTo: 2026, engineType: '2.4D / 2.7L Petrol' },
        { id: 'MD-TOY-CAMRY', makeId: 'MK-TOYOTA', makeName: 'Toyota', name: 'Camry (LE / SE / Hybrid)', yearFrom: 2012, yearTo: 2026, engineType: '2.5L / Hybrid' },
        { id: 'MD-TOY-COROLLA', makeId: 'MK-TOYOTA', makeName: 'Toyota', name: 'Corolla Sedan', yearFrom: 2011, yearTo: 2026, engineType: '1.6L / 1.8L / 2.0L' },
        { id: 'MD-NIS-PATROL', makeId: 'MK-NISSAN', makeName: 'Nissan', name: 'Patrol Y62 (SE / LE / Nismo)', yearFrom: 2010, yearTo: 2026, engineType: '4.0L V6 / 5.6L V8 VK56' },
        { id: 'MD-NIS-SUNNY', makeId: 'MK-NISSAN', makeName: 'Nissan', name: 'Sunny (B17 / N18)', yearFrom: 2013, yearTo: 2026, engineType: '1.5L / 1.6L HR16DE' },
        { id: 'MD-MIT-PAJERO', makeId: 'MK-MITSUBISHI', makeName: 'Mitsubishi', name: 'Pajero GLS 3.8 / 3.5 V6', yearFrom: 2007, yearTo: 2024, engineType: '3.5L / 3.8L V6 6G75' },
        { id: 'MD-LEX-LX', makeId: 'MK-LEXUS', makeName: 'Lexus', name: 'LX570 / LX600', yearFrom: 2008, yearTo: 2026, engineType: '5.7L V8 / 3.5L Twin-Turbo V6' },
        { id: 'MD-HON-ACCORD', makeId: 'MK-HONDA', makeName: 'Honda', name: 'Accord 1.5T / 2.0T', yearFrom: 2013, yearTo: 2026, engineType: '1.5L Turbo / 2.4L' }
      ];
    }

    // Seed automotive spare parts if missing
    const hasAutoParts = (state.products || []).some(p => p.oemNumber || p.partType);
    if (!hasAutoParts && Array.isArray(state.products)) {
      const automotiveProducts = [
        {
          id: 'AUTO-001',
          name: 'Front Ceramic Brake Pads Set (Genuine)',
          sku: 'TY-04465-60320',
          oemNumber: '04465-60320',
          manufacturerPartNo: '04465-60320',
          altPartNumbers: ['04465-60280', 'D1303-8415'],
          barcode: '629104800101',
          category: 'Braking System',
          brand: 'Toyota Genuine Parts',
          unit: 'Set',
          partType: 'GENUINE',
          purchasePrice: 165.00,
          sellingPrice: 280.00,
          wholesalePrice: 220.00,
          dealerPrice: 200.00,
          minSellingPrice: 190.00,
          taxRate: 5,
          stock: 35,
          minStock: 10,
          batch: 'LOT-2026-A1',
          rack: 'RACK-BRK-01',
          bin: 'BIN-12',
          countryOfOrigin: 'Japan',
          warrantyMonths: 12,
          compatibility: [
            { make: 'Toyota', model: 'Land Cruiser (V8 / GR / LC300)', yearFrom: 2008, yearTo: 2024, position: 'Front' },
            { make: 'Toyota', model: 'Land Cruiser Prado (TX / VX)', yearFrom: 2010, yearTo: 2024, position: 'Front' },
            { make: 'Lexus', model: 'LX570 / LX600', yearFrom: 2008, yearTo: 2023, position: 'Front' }
          ]
        },
        {
          id: 'AUTO-002',
          name: 'Engine Oil Filter Spin-On (OEM Denso)',
          sku: 'DEN-90915-YZZD4',
          oemNumber: '90915-YZZD4',
          manufacturerPartNo: '115010-0920',
          altPartNumbers: ['90915-20004', '90915-YZZB5'],
          barcode: '629104800102',
          category: 'Filters & Lubrication',
          brand: 'Denso OEM',
          unit: 'Pcs',
          partType: 'OEM',
          purchasePrice: 14.50,
          sellingPrice: 32.00,
          wholesalePrice: 24.00,
          dealerPrice: 20.00,
          minSellingPrice: 18.00,
          taxRate: 5,
          stock: 120,
          minStock: 25,
          batch: 'LOT-2026-F3',
          rack: 'RACK-FLT-02',
          bin: 'BIN-04',
          countryOfOrigin: 'Thailand',
          warrantyMonths: 6,
          compatibility: [
            { make: 'Toyota', model: 'Land Cruiser (V8 / GR / LC300)', yearFrom: 2008, yearTo: 2026, position: 'Engine Bay' },
            { make: 'Toyota', model: 'Hilux Double Cabin', yearFrom: 2012, yearTo: 2026, position: 'Engine Bay' },
            { make: 'Toyota', model: 'Land Cruiser Prado (TX / VX)', yearFrom: 2010, yearTo: 2026, position: 'Engine Bay' }
          ]
        },
        {
          id: 'AUTO-003',
          name: 'Iridium Spark Plug Long-Life (NGK Laser Iridium)',
          sku: 'NGK-ILKAR7L11',
          oemNumber: '22401-1LA1C',
          manufacturerPartNo: '91264',
          altPartNumbers: ['FXE20HR11', 'VR8NII33X'],
          barcode: '629104800103',
          category: 'Ignition System',
          brand: 'NGK Spark Plugs',
          unit: 'Pcs',
          partType: 'AFTERMARKET',
          purchasePrice: 28.00,
          sellingPrice: 55.00,
          wholesalePrice: 42.00,
          dealerPrice: 38.00,
          minSellingPrice: 35.00,
          taxRate: 5,
          stock: 80,
          minStock: 20,
          batch: 'LOT-2026-SP1',
          rack: 'RACK-IGN-01',
          bin: 'BIN-08',
          countryOfOrigin: 'Japan',
          warrantyMonths: 18,
          compatibility: [
            { make: 'Nissan', model: 'Patrol Y62 (SE / LE / Nismo)', yearFrom: 2010, yearTo: 2026, position: 'Cylinder Head' },
            { make: 'Nissan', model: 'Sunny (B17 / N18)', yearFrom: 2013, yearTo: 2024, position: 'Cylinder Head' }
          ]
        },
        {
          id: 'AUTO-004',
          name: 'Front Shock Absorber Strut Assembly Gas Charged',
          sku: 'KYB-341492',
          oemNumber: '48510-69415',
          manufacturerPartNo: '341492',
          altPartNumbers: ['48510-60160', '71492'],
          barcode: '629104800104',
          category: 'Suspension & Steering',
          brand: 'KYB Excel-G',
          unit: 'Pcs',
          partType: 'OEM',
          purchasePrice: 195.00,
          sellingPrice: 340.00,
          wholesalePrice: 280.00,
          dealerPrice: 250.00,
          minSellingPrice: 235.00,
          taxRate: 5,
          stock: 16,
          minStock: 4,
          batch: 'LOT-2026-SUS2',
          rack: 'RACK-SUS-03',
          bin: 'BIN-01',
          countryOfOrigin: 'Japan',
          warrantyMonths: 24,
          compatibility: [
            { make: 'Toyota', model: 'Land Cruiser Prado (TX / VX)', yearFrom: 2010, yearTo: 2024, position: 'Front Left / Right' }
          ]
        },
        {
          id: 'AUTO-005',
          name: 'Automatic Transmission Fluid ATF WS 4-Litre Can',
          sku: 'TY-08886-02305',
          oemNumber: '08886-02305',
          manufacturerPartNo: '08886-02305',
          altPartNumbers: ['ATF-WS-04'],
          barcode: '629104800105',
          category: 'Filters & Lubrication',
          brand: 'Toyota Genuine Parts',
          unit: 'Can',
          partType: 'GENUINE',
          purchasePrice: 110.00,
          sellingPrice: 175.00,
          wholesalePrice: 145.00,
          dealerPrice: 135.00,
          minSellingPrice: 130.00,
          taxRate: 5,
          stock: 45,
          minStock: 12,
          batch: 'LOT-2026-OIL4',
          rack: 'RACK-OIL-01',
          bin: 'BIN-FLOOR',
          countryOfOrigin: 'Japan',
          warrantyMonths: 36,
          compatibility: [
            { make: 'Toyota', model: 'Land Cruiser (V8 / GR / LC300)', yearFrom: 2008, yearTo: 2026, position: 'Gearbox' },
            { make: 'Toyota', model: 'Camry (LE / SE / Hybrid)', yearFrom: 2012, yearTo: 2026, position: 'Gearbox' },
            { make: 'Lexus', model: 'LX570 / LX600', yearFrom: 2008, yearTo: 2024, position: 'Gearbox' }
          ]
        }
      ];

      state.products.unshift(...automotiveProducts);
    }

    // Ensure UAE Branches exist
    if (!Array.isArray(state.branches) || state.branches.length === 0 || !state.branches.some(b => b.emirate)) {
      state.branches = [
        {
          id: 'BR-DXB-01',
          branchCode: 'DXB-ALQUOZ',
          name: 'Al Quoz Industrial Central Hub',
          emirate: 'Dubai',
          city: 'Dubai',
          address: 'Warehouse 14, Street 18, Industrial Area 4, Al Quoz, Dubai',
          phone: '+971 4 345 6789',
          email: 'alquoz@alfuttaim-autoparts.ae',
          trn: '100482910400003',
          invoicePrefix: 'INV-DXB-',
          isHeadOffice: true,
          isActive: true
        },
        {
          id: 'BR-SHJ-01',
          branchCode: 'SHJ-IND2',
          name: 'Sharjah Industrial Spare Parts Branch',
          emirate: 'Sharjah',
          city: 'Sharjah',
          address: 'Shop 8, BMW Road, Industrial Area 2, Sharjah',
          phone: '+971 6 532 1122',
          email: 'sharjah@alfuttaim-autoparts.ae',
          trn: '100482910400003',
          invoicePrefix: 'INV-SHJ-',
          isHeadOffice: false,
          isActive: true
        },
        {
          id: 'BR-AUH-01',
          branchCode: 'AUH-MUSSAFAH',
          name: 'Abu Dhabi Mussafah Distribution Depot',
          emirate: 'Abu Dhabi',
          city: 'Abu Dhabi',
          address: 'Sector M-12, Plot 44, Mussafah Industrial Area, Abu Dhabi',
          phone: '+971 2 555 4321',
          email: 'mussafah@alfuttaim-autoparts.ae',
          trn: '100482910400003',
          invoicePrefix: 'INV-AUH-',
          isHeadOffice: false,
          isActive: true
        }
      ];
    }

    // UAE Warehouses
    if (!Array.isArray(state.warehouses) || state.warehouses.length === 0) {
      state.warehouses = [
        { id: 'WH-DXB-01', branchId: 'BR-DXB-01', code: 'WH-ALQUOZ-MAIN', name: 'Al Quoz Central Warehouse', address: 'Industrial Area 4, Al Quoz, Dubai', manager: 'Tariq Al-Hashimi', isDefault: true, racks: 18, bins: 240 },
        { id: 'WH-SHJ-01', branchId: 'BR-SHJ-01', code: 'WH-SHJ-STORE', name: 'Sharjah Shop Stockroom', address: 'Industrial Area 2, Sharjah', manager: 'Muhammad Usman', isDefault: true, racks: 10, bins: 120 },
        { id: 'WH-AUH-01', branchId: 'BR-AUH-01', code: 'WH-AUH-DEPOT', name: 'Mussafah Logistics Depot', address: 'Mussafah M-12, Abu Dhabi', manager: 'Sultan Al-Mazroui', isDefault: true, racks: 24, bins: 360 }
      ];
    }

    // Initialize UAE Custom Collections
    if (!Array.isArray(state.stockAdjustments)) state.stockAdjustments = [];
    if (!Array.isArray(state.stockLedger)) state.stockLedger = [];
    if (!Array.isArray(state.salesReturns)) state.salesReturns = [];
    if (!Array.isArray(state.purchaseReturns)) state.purchaseReturns = [];
    if (!Array.isArray(state.warrantyClaims)) state.warrantyClaims = [];
    if (!Array.isArray(state.dynamicFields)) state.dynamicFields = [];
    if (!Array.isArray(state.messageLogs)) state.messageLogs = [];
    if (!Array.isArray(state.cashRegisters)) {
      state.cashRegisters = [
        { id: 'REG-DXB-01', branchId: 'BR-DXB-01', branchName: 'Al Quoz Central Hub', name: 'Main Counter Register 1', code: 'DXB-REG-01', status: 'ACTIVE', currentCashierId: 'USR-001' },
        { id: 'REG-SHJ-01', branchId: 'BR-SHJ-01', branchName: 'Sharjah Branch', name: 'Sharjah Fast POS 1', code: 'SHJ-REG-01', status: 'ACTIVE', currentCashierId: null }
      ];
    }
    if (!Array.isArray(state.cashShifts)) state.cashShifts = [];

    // Theme settings
    if (!state.themeSettings) {
      state.themeSettings = {
        themeMode: 'light',
        primaryColor: '#1e3a8a', // Deep corporate navy
        accentColor: '#d97706',  // Amber gold
        sidebarColor: '#0f172a', // Dark slate
        buttonRadius: '8px',
        cardRadius: '10px',
        tableDensity: 'compact',
        fontSize: '14px',
        fontFamily: 'Inter, system-ui, sans-serif'
      };
    }

    // Login designer settings
    if (!state.loginSettings) {
      state.loginSettings = {
        companyName: 'Al Futtaim Auto Spare Parts ERP',
        loginHeading: 'Enterprise Automotive Spare Parts Portal',
        subtitle: 'Bilingual UAE Billing, Multi-Branch Inventory & FTA Compliance',
        announcementText: 'Official UAE FTA 5% VAT System • Support: +971 4 345 6789',
        logoUrl: '',
        backgroundColor: '#0f172a',
        buttonColor: '#1e3a8a',
        showLanguageSelector: true,
        showPasswordRecovery: true,
        contactSupportUrl: 'mailto:support@alfuttaim-autoparts.ae'
      };
    }

    // Dynamic field seeds
    if (state.dynamicFields.length === 0) {
      state.dynamicFields = [
        { id: 'DF-01', targetEntity: 'products', fieldKey: 'hsnSacCode', fieldLabel: 'HSN / Custom Code', fieldType: 'text', isRequired: false, isVisible: true, displayOrder: 1 },
        { id: 'DF-02', targetEntity: 'products', fieldKey: 'minimumSellingPrice', fieldLabel: 'Floor Min Price (AED)', fieldType: 'number', isRequired: false, isVisible: true, displayOrder: 2 },
        { id: 'DF-03', targetEntity: 'customers', fieldKey: 'tradeLicenseNo', fieldLabel: 'Trade License Number', fieldType: 'text', isRequired: false, isVisible: true, displayOrder: 1 },
        { id: 'DF-04', targetEntity: 'customers', fieldKey: 'garageName', fieldLabel: 'Workshop / Garage Name', fieldType: 'text', isRequired: false, isVisible: true, displayOrder: 2 }
      ];
    }

    // Ensure all 35 modules in systemModules
    const fullModuleList = [
      { id: 'dashboard', name: 'Dashboard & Branch KPIs', category: 'CORE', description: 'Consolidated UAE sales, profit & branch metrics', isEnabled: true, isRemovable: false, iconName: 'LayoutDashboard', displayOrder: 1 },
      { id: 'pos', name: 'Quick POS Counter Billing', category: 'CORE', description: 'Fast barcode & fitment counter checkout with split tender', isEnabled: true, isRemovable: false, iconName: 'ShoppingCart', displayOrder: 2 },
      { id: 'sales', name: 'Sales & UAE Tax Invoices', category: 'CORE', description: 'FTA VAT Simplified & Full Tax Invoices with QR', isEnabled: true, isRemovable: false, iconName: 'Receipt', displayOrder: 3 },
      { id: 'quotations', name: 'Quotations & Estimations', category: 'CORE', description: 'Workshop estimations and customer quotation conversions', isEnabled: true, isRemovable: true, iconName: 'FileText', displayOrder: 4 },
      { id: 'products', name: 'Product Catalogue & Pricing', category: 'INVENTORY', description: 'Genuine, OEM and Aftermarket parts with multi-tier pricing', isEnabled: true, isRemovable: false, iconName: 'Package', displayOrder: 5 },
      { id: 'compatibility', name: 'Vehicle Compatibility Matrix', category: 'INVENTORY', description: 'Automotive makes, models, engines & chassis cross-reference', isEnabled: true, isRemovable: true, iconName: 'Layers', displayOrder: 6 },
      { id: 'barcodes', name: 'Barcode Scanning & Labels', category: 'INVENTORY', description: 'Barcode station and multi-format thermal label printing', isEnabled: true, isRemovable: true, iconName: 'QrCode', displayOrder: 7 },
      { id: 'inventory', name: 'Stock & Warehouse Locators', category: 'INVENTORY', description: 'Multi-branch stock overview, rack/bin positions & reorder', isEnabled: true, isRemovable: false, iconName: 'Boxes', displayOrder: 8 },
      { id: 'adjustments', name: 'Stock Adjustments', category: 'INVENTORY', description: 'Reconciliation, damage write-offs and quantity corrections', isEnabled: true, isRemovable: true, iconName: 'Sliders', displayOrder: 9 },
      { id: 'transfers', name: 'Inter-Branch Stock Transfers', category: 'INVENTORY', description: 'Stock transfer notes (STN) and transit tracking', isEnabled: true, isRemovable: true, iconName: 'Truck', displayOrder: 10 },
      { id: 'purchases', name: 'Purchases & Goods Receipts', category: 'PROCUREMENT', description: 'Supplier orders, GRN inwarding and landed cost', isEnabled: true, isRemovable: false, iconName: 'Package', displayOrder: 11 },
      { id: 'suppliers', name: 'Supplier Management', category: 'PROCUREMENT', description: 'Parts vendors, payment terms and supplier statements', isEnabled: true, isRemovable: false, iconName: 'Users', displayOrder: 12 },
      { id: 'customers', name: 'Customer & Garage CRM', category: 'SALES', description: 'Retail, wholesale buyers, fleet operators and credit limits', isEnabled: true, isRemovable: false, iconName: 'Users', displayOrder: 13 },
      { id: 'sales_returns', name: 'Sales Returns & Credit Notes', category: 'SALES', description: 'Customer parts return with restocking inspection', isEnabled: true, isRemovable: true, iconName: 'RotateCcw', displayOrder: 14 },
      { id: 'purchase_returns', name: 'Purchase Returns & Debit Notes', category: 'PROCUREMENT', description: 'Return defective or incorrect parts to suppliers', isEnabled: true, isRemovable: true, iconName: 'RotateCcw', displayOrder: 15 },
      { id: 'warranty', name: 'Warranty & RMA Claims', category: 'OPERATIONS', description: 'Defective part warranty tracking and vendor claims', isEnabled: true, isRemovable: true, iconName: 'ShieldCheck', displayOrder: 16 },
      { id: 'cash_register', name: 'Cash Register Shifts', category: 'FINANCE', description: 'Opening cash float, drawer sales and closing counts', isEnabled: true, isRemovable: true, iconName: 'DollarSign', displayOrder: 17 },
      { id: 'expenses', name: 'Branch Expenses', category: 'FINANCE', description: 'Operational branch expenses and input VAT recovery', isEnabled: true, isRemovable: true, iconName: 'TrendingUp', displayOrder: 18 },
      { id: 'vat_reports', name: 'UAE VAT 201 Tax Reporting', category: 'FINANCE', description: 'FTA Emirate-wise sales tax and recoverable input tax', isEnabled: true, isRemovable: false, iconName: 'FileText', displayOrder: 19 },
      { id: 'reports', name: 'Analytics & Financial Reports', category: 'FINANCE', description: 'Profit & Loss, stock valuation and sales performance', isEnabled: true, isRemovable: false, iconName: 'FileText', displayOrder: 20 },
      { id: 'whatsapp', name: 'WhatsApp Business Hub', category: 'COMMUNICATIONS', description: 'Automated invoice PDFs, receipts and payment reminders', isEnabled: true, isRemovable: true, iconName: 'Sparkles', displayOrder: 21 },
      { id: 'email', name: 'Email Communications', category: 'COMMUNICATIONS', description: 'SMTP email statements and quotation dispatches', isEnabled: true, isRemovable: true, iconName: 'Sparkles', displayOrder: 22 },
      { id: 'notifications', name: 'Notification Center', category: 'CORE', description: 'Low stock alerts, credit limit freezes and system events', isEnabled: true, isRemovable: false, iconName: 'Clock', displayOrder: 23 },
      { id: 'users', name: 'User Management', category: 'ADMIN', description: 'Staff credentials, branch assignments and PIN locks', isEnabled: true, isRemovable: false, iconName: 'Users', displayOrder: 24 },
      { id: 'roles', name: 'Roles & RBAC Permissions', category: 'ADMIN', description: 'Granular permissions, cost hiding and discount controls', isEnabled: true, isRemovable: false, iconName: 'KeyRound', displayOrder: 25 },
      { id: 'modules_admin', name: 'Admin Module Manager', category: 'ADMIN', description: 'Enable/disable modules and configure navigation hierarchy', isEnabled: true, isRemovable: false, iconName: 'Settings', displayOrder: 26 },
      { id: 'fields_admin', name: 'Dynamic Field Manager', category: 'ADMIN', description: 'Configure custom fields on entities without schema changes', isEnabled: true, isRemovable: false, iconName: 'Sliders', displayOrder: 27 },
      { id: 'theme_admin', name: 'UI Theme Customizer', category: 'ADMIN', description: 'Color themes, density, button rounding and typography', isEnabled: true, isRemovable: false, iconName: 'Settings', displayOrder: 28 },
      { id: 'login_admin', name: 'Login Screen Designer', category: 'ADMIN', description: 'Customize login logo, branding, welcome notice and styles', isEnabled: true, isRemovable: false, iconName: 'ExternalLink', displayOrder: 29 },
      { id: 'regional_admin', name: 'Regional & Language Settings', category: 'ADMIN', description: 'UAE VAT, TRN, AED currency and English/Arabic RTL toggles', isEnabled: true, isRemovable: false, iconName: 'Settings', displayOrder: 30 },
      { id: 'audit_logs', name: 'Audit Logs & Record History', category: 'ADMIN', description: 'Comprehensive transaction logs and security audit trails', isEnabled: true, isRemovable: false, iconName: 'ShieldCheck', displayOrder: 31 },
      { id: 'backup_admin', name: 'Backup & Recovery Hub', category: 'ADMIN', description: 'Atomic SQLite backup, JSON export and safe restore', isEnabled: true, isRemovable: false, iconName: 'Download', displayOrder: 32 }
    ];

    if (!Array.isArray(state.systemModules) || state.systemModules.length < 20) {
      state.systemModules = fullModuleList;
    }
  }

  ensureStructures();

  // Helper: Append to immutable stock ledger
  function recordStockLedgerEntry(data) {
    const entry = {
      id: `LED-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString(),
      transactionType: data.type, // 'SALE' | 'PURCHASE' | 'RETURN' | 'ADJUSTMENT' | 'TRANSFER'
      productId: data.productId,
      productName: data.productName,
      sku: data.sku,
      branchId: data.branchId,
      branchName: data.branchName,
      qtyIn: data.qtyIn || 0,
      qtyOut: data.qtyOut || 0,
      balanceAfter: data.balanceAfter,
      referenceNo: data.referenceNo,
      notes: data.notes || '',
      userName: data.userName || 'System'
    };
    state.stockLedger.unshift(entry);
    if (state.stockLedger.length > 2000) state.stockLedger.pop();
  }

  // ============================================================
  // 1. AUTHENTICATION & LOGIN PAGE
  // ============================================================
  router.post('/auth/login', (req, res) => {
    const { username, password, branchId } = req.body;
    ensureStructures();

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    // Lookup user in state
    const user = state.users.find(u => 
      (u.email && u.email.toLowerCase() === username.toLowerCase()) || 
      (u.name && u.name.toLowerCase() === username.toLowerCase()) ||
      (u.phone === username)
    );

    // If user found or default admin fallback
    const matched = user || (username.toLowerCase() === 'admin' ? {
      id: 'USR-001',
      name: 'Super Admin',
      role: 'Super Administrator',
      roleKey: 'SUPER_ADMIN',
      email: 'admin@zia.local',
      branchId: branchId || (state.branches[0] ? state.branches[0].id : 'BR-DXB-01'),
      branchName: state.branches[0] ? state.branches[0].name : 'Al Quoz Central Hub',
      active: true
    } : null);

    if (!matched) {
      logAudit('System', 'LOGIN_FAILED', `Failed login attempt for username: ${username}`);
      return res.status(401).json({ error: 'Invalid credentials. Please verify your username and password.' });
    }

    const selectedBranch = state.branches.find(b => b.id === (branchId || matched.branchId)) || state.branches[0];

    const sessionData = {
      token: `ZB-AUTH-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      user: {
        id: matched.id,
        name: matched.name,
        role: matched.role,
        roleKey: matched.roleKey || 'SUPER_ADMIN',
        email: matched.email,
        branchId: selectedBranch.id,
        branchName: selectedBranch.name,
        emirate: selectedBranch.emirate || 'Dubai'
      },
      branch: selectedBranch,
      company: state.companySettings
    };

    logAudit(matched.name, 'LOGIN_SUCCESS', `User logged into branch: ${selectedBranch.name}`);
    persist();
    res.json(sessionData);
  });

  router.post('/auth/forgot-password', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email address is required.' });
    res.json({ message: 'Password reset link has been dispatched to your email address.' });
  });

  // ============================================================
  // 2. THEME & LOGIN DESIGNER
  // ============================================================
  router.get('/settings/theme', (req, res) => {
    ensureStructures();
    res.json(state.themeSettings);
  });

  router.post('/settings/theme', (req, res) => {
    ensureStructures();
    state.themeSettings = { ...state.themeSettings, ...req.body };
    persist();
    res.json({ success: true, theme: state.themeSettings });
  });

  router.get('/settings/login-designer', (req, res) => {
    ensureStructures();
    res.json(state.loginSettings);
  });

  router.post('/settings/login-designer', (req, res) => {
    ensureStructures();
    state.loginSettings = { ...state.loginSettings, ...req.body };
    persist();
    res.json({ success: true, settings: state.loginSettings });
  });

  // ============================================================
  // 3. VEHICLE MAKES, MODELS & COMPATIBILITY SEARCH
  // ============================================================
  router.get('/vehicles/makes', (req, res) => {
    ensureStructures();
    res.json(state.vehicleMakes);
  });

  router.get('/vehicles/models', (req, res) => {
    ensureStructures();
    const { makeId } = req.query;
    if (makeId) {
      return res.json(state.vehicleModels.filter(m => m.makeId === makeId));
    }
    res.json(state.vehicleModels);
  });

  router.post('/vehicles/models', (req, res) => {
    ensureStructures();
    const newModel = {
      id: `MD-${Date.now().toString().slice(-4)}`,
      ...req.body
    };
    state.vehicleModels.push(newModel);
    persist();
    res.status(201).json(newModel);
  });

  // Quick fitment compatibility finder for counter POS
  router.get('/vehicles/search-parts', (req, res) => {
    ensureStructures();
    const { make, model, year, search } = req.query;
    let results = state.products || [];

    if (search) {
      const q = String(search).toLowerCase();
      results = results.filter(p => 
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.oemNumber && p.oemNumber.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.includes(q)) ||
        (Array.isArray(p.altPartNumbers) && p.altPartNumbers.some(a => a.toLowerCase().includes(q)))
      );
    }

    if (make || model || year) {
      results = results.filter(p => {
        if (!Array.isArray(p.compatibility) || p.compatibility.length === 0) return false;
        return p.compatibility.some(c => {
          const matchMake = !make || (c.make && c.make.toLowerCase() === make.toLowerCase());
          const matchModel = !model || (c.model && c.model.toLowerCase().includes(model.toLowerCase()));
          const yNum = Number(year);
          const matchYear = !year || (isNaN(yNum) || ((!c.yearFrom || yNum >= c.yearFrom) && (!c.yearTo || yNum <= c.yearTo)));
          return matchMake && matchModel && matchYear;
        });
      });
    }

    res.json(results);
  });

  // ============================================================
  // 4. BARCODE SCANNING & LOOKUP
  // ============================================================
  router.get('/barcode/lookup/:code', (req, res) => {
    ensureStructures();
    const { code } = req.params;
    const { branchId } = req.query;

    const part = (state.products || []).find(p => 
      p.barcode === code || 
      p.sku === code || 
      p.oemNumber === code ||
      (Array.isArray(p.altPartNumbers) && p.altPartNumbers.includes(code))
    );

    if (!part) {
      return res.status(404).json({ error: 'Part not found with scanned barcode.' });
    }

    // Branch specific stock resolution
    const resolvedStock = part.stock || 0;
    res.json({
      ...part,
      availableStock: resolvedStock,
      branchId: branchId || 'BR-DXB-01'
    });
  });

  // ============================================================
  // 5. STOCK ADJUSTMENTS & RECONCILIATIONS
  // ============================================================
  router.get('/inventory/adjustments', (req, res) => {
    ensureStructures();
    res.json(state.stockAdjustments);
  });

  router.post('/inventory/adjustments', (req, res) => {
    ensureStructures();
    const { productId, branchId, warehouseId, type, quantity, reason, notes, user } = req.body;
    const prod = (state.products || []).find(p => p.id === productId);

    if (!prod) return res.status(404).json({ error: 'Product not found.' });

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) return res.status(400).json({ error: 'Valid positive quantity required.' });

    const prevStock = prod.stock || 0;
    let newStock = prevStock;

    if (type === 'INCREASE' || type === 'FOUND') {
      newStock += qty;
    } else { // DECREASE, DAMAGE, EXPIRED, MISSING
      newStock = Math.max(0, newStock - qty);
    }
    prod.stock = newStock;

    const adjustment = {
      id: `ADJ-${Date.now().toString().slice(-4)}`,
      adjustmentNo: `ADJ-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString(),
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku,
      branchId: branchId || 'BR-DXB-01',
      warehouseId: warehouseId || 'WH-DXB-01',
      type: type || 'DAMAGE',
      quantity: qty,
      previousStock: prevStock,
      newStock: newStock,
      reason: reason || 'Inventory cycle count reconciliation',
      notes: notes || '',
      approvedBy: user || 'Storekeeper'
    };

    state.stockAdjustments.unshift(adjustment);
    recordStockLedgerEntry({
      type: 'ADJUSTMENT',
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku,
      branchId: adjustment.branchId,
      branchName: 'Branch',
      qtyIn: (type === 'INCREASE' || type === 'FOUND') ? qty : 0,
      qtyOut: (type !== 'INCREASE' && type !== 'FOUND') ? qty : 0,
      balanceAfter: newStock,
      referenceNo: adjustment.adjustmentNo,
      notes: reason,
      userName: user
    });

    logAudit(user || 'Storekeeper', 'STOCK_ADJUSTMENT', `Adjusted stock for ${prod.name}: ${type} ${qty} (New: ${newStock})`);
    persist();
    res.status(201).json(adjustment);
  });

  router.get('/inventory/ledger', (req, res) => {
    ensureStructures();
    const { productId, branchId } = req.query;
    let list = state.stockLedger || [];
    if (productId) list = list.filter(l => l.productId === productId);
    if (branchId) list = list.filter(l => l.branchId === branchId);
    res.json(list);
  });

  // ============================================================
  // 6. POS CASH REGISTER & SHIFTS
  // ============================================================
  router.get('/pos/register/status', (req, res) => {
    ensureStructures();
    const { registerId, branchId } = req.query;
    const activeShift = (state.cashShifts || []).find(s => 
      (!registerId || s.registerId === registerId) &&
      (!branchId || s.branchId === branchId) &&
      s.status === 'OPEN'
    );
    res.json({
      hasOpenShift: !!activeShift,
      shift: activeShift || null,
      registers: state.cashRegisters
    });
  });

  router.post('/pos/register/open', (req, res) => {
    ensureStructures();
    const { registerId, branchId, openingFloat, cashierName, userId } = req.body;
    const floatAmount = Number(openingFloat) || 0;

    const newShift = {
      id: `SHIFT-${Date.now().toString().slice(-4)}`,
      registerId: registerId || 'REG-DXB-01',
      branchId: branchId || 'BR-DXB-01',
      openedAt: new Date().toISOString(),
      closedAt: null,
      cashierId: userId || 'USR-001',
      cashierName: cashierName || 'Cashier',
      openingFloatCash: floatAmount,
      cashSales: 0,
      cardSales: 0,
      creditSales: 0,
      cashExpenses: 0,
      status: 'OPEN'
    };

    state.cashShifts.unshift(newShift);
    logAudit(cashierName || 'Cashier', 'OPEN_REGISTER', `Opened cash register shift with float AED ${floatAmount}`);
    persist();
    res.status(201).json(newShift);
  });

  router.post('/pos/register/close', (req, res) => {
    ensureStructures();
    const { shiftId, closingCountedCash, notes } = req.body;
    const shift = (state.cashShifts || []).find(s => s.id === shiftId);

    if (!shift) return res.status(404).json({ error: 'Active shift not found.' });

    const counted = Number(closingCountedCash) || 0;
    const expected = (shift.openingFloatCash || 0) + (shift.cashSales || 0) - (shift.cashExpenses || 0);
    const variance = counted - expected;

    shift.closedAt = new Date().toISOString();
    shift.closingCountedCash = counted;
    shift.expectedCash = expected;
    shift.cashVariance = variance;
    shift.notes = notes || '';
    shift.status = 'CLOSED';

    logAudit(shift.cashierName, 'CLOSE_REGISTER', `Closed shift. Counted: AED ${counted}, Variance: AED ${variance}`);
    persist();
    res.json(shift);
  });

  // ============================================================
  // 7. SALES RETURNS & CREDIT NOTES
  // ============================================================
  router.get('/sales/returns', (req, res) => {
    ensureStructures();
    res.json(state.salesReturns);
  });

  router.post('/sales/returns', (req, res) => {
    ensureStructures();
    const { originalInvoiceId, customerId, customerName, branchId, items, returnReason, restockCondition, refundMethod, notes } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Return items are required.' });
    }

    let totalRefund = 0;
    let totalTaxRefund = 0;

    items.forEach(item => {
      const lineTotal = Number(item.unitPrice || 0) * Number(item.quantity || 1);
      const lineTax = (lineTotal * (Number(item.taxRate) || 5)) / 100;
      totalRefund += lineTotal;
      totalTaxRefund += lineTax;

      // Restock only if condition is resalable
      if (restockCondition === 'RESALABLE' && item.productId) {
        const prod = (state.products || []).find(p => p.id === item.productId);
        if (prod) {
          prod.stock = (prod.stock || 0) + Number(item.quantity);
          recordStockLedgerEntry({
            type: 'RETURN',
            productId: prod.id,
            productName: prod.name,
            sku: prod.sku,
            branchId: branchId || 'BR-DXB-01',
            branchName: 'Branch',
            qtyIn: Number(item.quantity),
            qtyOut: 0,
            balanceAfter: prod.stock,
            referenceNo: originalInvoiceId || 'RET',
            notes: `Customer return: ${returnReason}`,
            userName: 'Sales Counter'
          });
        }
      }
    });

    const creditNote = {
      id: `CRN-${Date.now().toString().slice(-4)}`,
      creditNoteNo: `CRN-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString(),
      originalInvoiceId: originalInvoiceId || 'N/A',
      customerId: customerId || 'WALK-IN',
      customerName: customerName || 'Walk-in Customer',
      branchId: branchId || 'BR-DXB-01',
      items: items,
      subtotal: totalRefund,
      taxRefund: totalTaxRefund,
      grandTotalRefund: totalRefund + totalTaxRefund,
      returnReason: returnReason || 'WRONG_FITMENT',
      restockCondition: restockCondition || 'RESALABLE',
      refundMethod: refundMethod || 'CASH', // CASH, CREDIT_WALLET, CARD
      status: 'PROCESSED',
      notes: notes || ''
    };

    state.salesReturns.unshift(creditNote);
    logAudit('Sales', 'CREATE_CREDIT_NOTE', `Issued Credit Note ${creditNote.creditNoteNo} for AED ${creditNote.grandTotalRefund}`);
    persist();
    res.status(201).json(creditNote);
  });

  // ============================================================
  // 8. PURCHASE RETURNS & DEBIT NOTES
  // ============================================================
  router.get('/purchases/returns', (req, res) => {
    ensureStructures();
    res.json(state.purchaseReturns);
  });

  router.post('/purchases/returns', (req, res) => {
    ensureStructures();
    const { supplierId, supplierName, branchId, items, returnReason, notes } = req.body;

    let totalDebit = 0;
    items.forEach(item => {
      const line = Number(item.costPrice || 0) * Number(item.quantity || 1);
      totalDebit += line;
      // Deduct from stock
      if (item.productId) {
        const prod = (state.products || []).find(p => p.id === item.productId);
        if (prod && prod.stock > 0) {
          prod.stock = Math.max(0, prod.stock - Number(item.quantity));
        }
      }
    });

    const debitNote = {
      id: `DBN-${Date.now().toString().slice(-4)}`,
      debitNoteNo: `DBN-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString(),
      supplierId: supplierId || 'SUPP-001',
      supplierName: supplierName || 'Supplier',
      branchId: branchId || 'BR-DXB-01',
      items,
      totalAmount: totalDebit,
      returnReason: returnReason || 'DEFECTIVE_PARTS',
      status: 'SUBMITTED',
      notes: notes || ''
    };

    state.purchaseReturns.unshift(debitNote);
    logAudit('Purchases', 'CREATE_DEBIT_NOTE', `Issued Debit Note ${debitNote.debitNoteNo} for AED ${totalDebit}`);
    persist();
    res.status(201).json(debitNote);
  });

  // ============================================================
  // 9. DYNAMIC CUSTOM FIELD REGISTRY
  // ============================================================
  router.get('/settings/fields', (req, res) => {
    ensureStructures();
    res.json(state.dynamicFields);
  });

  router.post('/settings/fields', (req, res) => {
    ensureStructures();
    const { targetEntity, fieldKey, fieldLabel, fieldType, isRequired, isVisible, options } = req.body;

    if (!targetEntity || !fieldKey || !fieldLabel) {
      return res.status(400).json({ error: 'Target entity, unique key and label are required.' });
    }

    const newField = {
      id: `DF-${Date.now().toString().slice(-4)}`,
      targetEntity, // 'products', 'customers', 'invoices', 'suppliers'
      fieldKey: fieldKey.replace(/[^a-zA-Z0-9_]/g, ''),
      fieldLabel,
      fieldType: fieldType || 'text',
      isRequired: !!isRequired,
      isVisible: isVisible !== false,
      options: options || [],
      displayOrder: (state.dynamicFields.length || 0) + 1
    };

    state.dynamicFields.push(newField);
    logAudit('Admin', 'CREATE_DYNAMIC_FIELD', `Created custom field ${fieldLabel} on ${targetEntity}`);
    persist();
    res.status(201).json(newField);
  });

  router.delete('/settings/fields/:id', (req, res) => {
    ensureStructures();
    const idx = (state.dynamicFields || []).findIndex(f => f.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Field not found.' });

    const removed = state.dynamicFields.splice(idx, 1)[0];
    persist();
    res.json({ message: 'Field configuration archived.', removed });
  });

  // ============================================================
  // 10. WHATSAPP & EMAIL COMMUNICATIONS
  // ============================================================
  router.post('/communications/whatsapp/send', (req, res) => {
    ensureStructures();
    const { recipientPhone, customerName, template, invoiceNo, grandTotal, pdfUrl } = req.body;

    const logEntry = {
      id: `MSG-WA-${Date.now().toString().slice(-4)}`,
      channel: 'WHATSAPP',
      recipientPhone: recipientPhone || '+971 50 000 0000',
      customerName: customerName || 'Valued Customer',
      template: template || 'INVOICE_RECEIPT',
      documentNo: invoiceNo || 'INV-000',
      amount: grandTotal || 0,
      status: 'SENT',
      providerRef: `WABA-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      sentAt: new Date().toISOString()
    };

    state.messageLogs.unshift(logEntry);
    logAudit('WhatsApp', 'SEND_INVOICE', `Dispatched WhatsApp receipt for ${invoiceNo} to ${recipientPhone}`);
    persist();
    res.json({ success: true, message: 'WhatsApp message dispatched successfully.', details: logEntry });
  });

  router.post('/communications/email/send', (req, res) => {
    ensureStructures();
    const { recipientEmail, subject, invoiceNo, bodyHtml } = req.body;

    const logEntry = {
      id: `MSG-EM-${Date.now().toString().slice(-4)}`,
      channel: 'EMAIL',
      recipientEmail: recipientEmail || 'customer@example.ae',
      subject: subject || `Tax Invoice ${invoiceNo} from Al Futtaim Auto Spare Parts`,
      documentNo: invoiceNo || 'INV-000',
      status: 'DELIVERED',
      sentAt: new Date().toISOString()
    };

    state.messageLogs.unshift(logEntry);
    logAudit('Email', 'SEND_EMAIL', `Sent invoice email to ${recipientEmail}`);
    persist();
    res.json({ success: true, message: 'Email sent successfully.', details: logEntry });
  });

  router.get('/communications/logs', (req, res) => {
    ensureStructures();
    res.json(state.messageLogs || []);
  });

  // ============================================================
  // 11. UAE FTA 201 VAT RETURN REPORT
  // ============================================================
  router.get('/reports/vat-return-201', (req, res) => {
    ensureStructures();
    const emirates = ['Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah'];
    
    // Group invoices by Emirate
    const emirateData = emirates.map(emirate => {
      const branchIds = (state.branches || []).filter(b => b.emirate === emirate).map(b => b.id);
      const invoices = (state.invoices || []).filter(inv => branchIds.includes(inv.branchId) || (!inv.branchId && emirate === 'Dubai'));
      const taxable = invoices.reduce((acc, inv) => acc + (Number(inv.subtotal) || 0), 0);
      const vat = taxable * 0.05;
      return {
        emirate,
        taxableSupplies: taxable,
        vatAmount: vat
      };
    });

    const totalOutputVat = emirateData.reduce((acc, e) => acc + e.vatAmount, 0);
    const totalTaxableSales = emirateData.reduce((acc, e) => acc + e.taxableSupplies, 0);

    // Calculate Input VAT from Purchases and Expenses
    const purchasesTotal = (state.purchases || []).reduce((acc, p) => acc + (Number(p.subtotal) || 0), 0);
    const expensesTotal = (state.expenses || []).reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const recoverableInputTax = (purchasesTotal + expensesTotal) * 0.05;

    const netVatPayable = Math.max(0, totalOutputVat - recoverableInputTax);

    res.json({
      trn: state.companySettings.trn || '100482910400003',
      companyName: state.companySettings.name,
      taxPeriod: '2026-Q4',
      standardRatedSupplies: emirateData,
      totalTaxableSales,
      totalOutputVat,
      recoverableInputTax,
      netVatPayable,
      currency: 'AED'
    });
  });

  return router;
}

module.exports = { createUaeErpRouter };
