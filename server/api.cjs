const express = require('express');
const fs = require('fs');
const path = require('path');
const { getSystemHardwareId, verifyActivationKey } = require('./licensing.cjs');
const { openDb, loadState, isDbEmpty, makePersist, makeNextId, seedCounterFromLength } = require('./db.cjs');
const { migrateLegacyJson } = require('./migrate-legacy-json.cjs');
const { getGateway } = require('./payments/gateway.cjs');
const { createUaeErpRouter } = require('./uae-erp-router.cjs');

async function createApiRouter(options = {}) {
  const router = express.Router();
  const legacyDataFile = options.dataFile || path.join(__dirname, 'data.json');
  const dbFile = options.dbFile || path.join(path.dirname(legacyDataFile), 'data.db');
  const licenseFile = options.licenseFile || path.join(__dirname, 'license.dat');

  // Initial Seed Data
  const defaultState = {
    companySettings: {
      name: 'Zia Enterprise Billing',
      legalName: 'Zia Technologies Private Limited',
      phone: '+91 98450 12345',
      email: 'billing@ziaenterprise.com',
      address: 'Plot 42, Outer Ring Road, Bengaluru, Karnataka 560103',
      gstin: '29ABCDE1234F1Z5',
      pan: 'ABCDE1234F',
      state: 'Karnataka (29)',
      bankName: 'HDFC Bank',
      accountNumber: '50200012345678',
      ifsc: 'HDFC0001234',
      upiId: 'ziabilling@hdfcbank',
      receiptFooter: 'Thank you for your business! Goods once sold can be returned within 7 days with invoice.',
      countryCode: 'IN', // 'IN' | 'AE' | 'GLOBAL'
      currency: 'INR',
      currencySymbol: '₹',
      timezone: 'Asia/Kolkata',
      taxSystem: 'GST', // 'GST' for India, 'VAT' for UAE
      taxRegistrationLabel: 'GSTIN', // 'GSTIN' or 'TRN'
      trn: '100234567800003', // UAE Federal Tax Authority TRN format
      defaultLanguage: 'en',
      isRTL: false
    },

    // --- Country Profiles Configuration ---
    countryConfigs: {
      IN: {
        countryCode: 'IN',
        countryName: 'India',
        currency: 'INR',
        currencySymbol: '₹',
        timezone: 'Asia/Kolkata',
        taxSystem: 'GST',
        taxRegistrationLabel: 'GSTIN',
        standardTaxRates: [0, 5, 12, 18, 28],
        eInvoicingStandard: 'NIC_IRP',
        taxIdRegex: '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$',
        supportsRTL: false
      },
      AE: {
        countryCode: 'AE',
        countryName: 'United Arab Emirates',
        currency: 'AED',
        currencySymbol: 'AED',
        timezone: 'Asia/Dubai',
        taxSystem: 'VAT',
        taxRegistrationLabel: 'TRN',
        standardTaxRates: [0, 5],
        eInvoicingStandard: 'ZATCA_PEPPOL_EIDAS',
        taxIdRegex: '^100[0-9]{12}$',
        supportsRTL: true
      }
    },

    // --- Subscription & Entitlement Engine ---
    entitlement: {
      tier: 'MULTI_BRANCH', // 'SINGLE_BRANCH' | 'MULTI_BRANCH' | 'NATIONAL_BRANCH'
      maxBranches: 5,
      maxSeats: 15,
      maxRegisters: 10,
      features: {
        interBranchSTN: true,
        jobSheets: true,
        eInvoicing: true,
        eWayBill: true,
        asc606Revenue: true,
        customRoles: true,
        advancedAudit: true
      },
      billingCycle: 'ANNUAL',
      expiresAt: '2027-10-30T00:00:00.000Z'
    },

    // --- Dynamic System Modules Registry (Admin Toggleable) ---
    systemModules: [
      { id: 'dashboard', name: 'Executive Dashboard & KPIs', category: 'CORE', description: 'Centralized financial and operational analytics', isEnabled: true, isRemovable: false, iconName: 'LayoutDashboard' },
      { id: 'pos', name: 'POS Fast Billing & Counter Checkout', category: 'CORE', description: 'Barcode scanning, split tenders, held bills', isEnabled: true, isRemovable: false, iconName: 'ShoppingCart' },
      { id: 'sales', name: 'Sales Invoicing & Quotations', category: 'CORE', description: 'B2B/B2C invoicing and quotation conversion', isEnabled: true, isRemovable: false, iconName: 'Receipt' },
      { id: 'products', name: 'Product Catalog & Pricing', category: 'OPERATIONS', description: 'Dual item catalog, barcode and pricing management', isEnabled: true, isRemovable: false, iconName: 'Package' },
      { id: 'spareParts', name: 'Spare Parts & Compatibility Matrix', category: 'OPERATIONS', description: 'OEM parts, device model cross-referencing', isEnabled: true, isRemovable: true, iconName: 'Boxes' },
      { id: 'jobSheets', name: 'Service Job Sheets & Repairs', category: 'OPERATIONS', description: 'Repair workflows, spare part allocation, labor billing', isEnabled: true, isRemovable: true, iconName: 'Headphones' },
      { id: 'inventory', name: 'Warehouse Bin/Rack & Inventory', category: 'OPERATIONS', description: 'Multi-location storage, batch, expiry and stock valuation', isEnabled: true, isRemovable: false, iconName: 'Boxes' },
      { id: 'branches', name: 'Multi-Branch & STN Transfers', category: 'OPERATIONS', description: 'Inter-branch stock transfer notes and store clusters', isEnabled: true, isRemovable: true, iconName: 'Building2' },
      { id: 'customers', name: 'Customers & CRM Credit Control', category: 'CORE', description: 'Customer ledgers, aging analysis, loyalty wallets', isEnabled: true, isRemovable: false, iconName: 'Users' },
      { id: 'suppliers', name: 'Suppliers & Purchase Management', category: 'OPERATIONS', description: 'Vendor directory, PO requisitions, GRN inwarding', isEnabled: true, isRemovable: false, iconName: 'Truck' },
      { id: 'accounting', name: 'Double-Entry General Ledger (GL)', category: 'FINANCE', description: 'Chart of Accounts, Trial Balance, Balance Sheet, ASC 606', isEnabled: true, isRemovable: true, iconName: 'DollarSign' },
      { id: 'etax', name: 'E-Tax, IRN & E-Way Bill Compliance', category: 'COMPLIANCE', description: 'Government e-invoicing API, GSTR-1, GSTR-3B, UAE VAT', isEnabled: true, isRemovable: true, iconName: 'ShieldCheck' },
      { id: 'expenses', name: 'Branch Expenses & Petty Cash', category: 'FINANCE', description: 'Operational expense vouchers and category tracking', isEnabled: true, isRemovable: true, iconName: 'TrendingUp' },
      { id: 'reports', name: 'Consolidated Financial Reports', category: 'FINANCE', description: 'P&L, gross/net margins, branch revenue rankings', isEnabled: true, isRemovable: false, iconName: 'FileText' },
      
      // New Marketing & Growth Modules
      { id: 'whatsapp_marketing', name: 'WhatsApp Marketing & Automation', category: 'MARKETING', description: 'Broadcast offers, payment reminders, automated festive messages', isEnabled: true, isRemovable: true, iconName: 'MessageSquare' },
      { id: 'email_marketing', name: 'Email Marketing & Newsletters', category: 'MARKETING', description: 'HTML campaigns, customer segmentation, automated statements', isEnabled: true, isRemovable: true, iconName: 'Mail' },
      { id: 'facebook_marketing', name: 'Facebook & Meta Ads Catalog Sync', category: 'MARKETING', description: 'Catalog feeds, Pixel tracking, social commerce retargeting', isEnabled: true, isRemovable: true, iconName: 'Share2' },
      { id: 'lead_generation', name: 'Website Visitor Tracking & Lead Generation', category: 'MARKETING', description: 'Capture web traffic, IP geolocation, lead scoring, and 1-click CRM conversion', isEnabled: true, isRemovable: true, iconName: 'Globe2' }
    ],

    // --- Website Visitor & Lead Generation Data ---
    websiteVisitors: [
      {
        id: 'VIS-901',
        ipAddress: '106.51.78.14',
        city: 'Bengaluru',
        country: 'India',
        browser: 'Chrome 128',
        operatingSystem: 'Windows 11',
        deviceType: 'DESKTOP',
        pageViews: 6,
        visitedPages: ['/home', '/pricing', '/hardware/printers', '/contact'],
        referralUrl: 'https://google.com?q=best+pos+billing+software+bangalore',
        firstSeenAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        lastActiveAt: new Date(Date.now() - 600000).toISOString(),
        durationSeconds: 420,
        isIdentified: true,
        leadId: 'LEAD-101'
      },
      {
        id: 'VIS-902',
        ipAddress: '185.193.64.22',
        city: 'Dubai',
        country: 'United Arab Emirates',
        browser: 'Safari 17',
        operatingSystem: 'macOS Sonoma',
        deviceType: 'DESKTOP',
        pageViews: 4,
        visitedPages: ['/home', '/features/multi-branch', '/contact/quote'],
        referralUrl: 'https://facebook.com/ads/zia-billing',
        firstSeenAt: new Date(Date.now() - 7200000).toISOString(),
        lastActiveAt: new Date(Date.now() - 1200000).toISOString(),
        durationSeconds: 310,
        isIdentified: true,
        leadId: 'LEAD-102'
      },
      {
        id: 'VIS-903',
        ipAddress: '49.37.112.5',
        city: 'Mumbai',
        country: 'India',
        browser: 'Mobile Chrome',
        operatingSystem: 'Android 14',
        deviceType: 'MOBILE',
        pageViews: 2,
        visitedPages: ['/home', '/hardware/barcode-scanners'],
        referralUrl: 'https://instagram.com',
        firstSeenAt: new Date(Date.now() - 1800000).toISOString(),
        lastActiveAt: new Date(Date.now() - 900000).toISOString(),
        durationSeconds: 85,
        isIdentified: false
      }
    ],

    websiteLeads: [
      {
        id: 'LEAD-101',
        visitorId: 'VIS-901',
        name: 'Vikas Deshmukh',
        phone: '+91 98450 99881',
        email: 'vikas@omretailchains.in',
        companyName: 'Om Retail Mart Chain (3 Stores)',
        interestCategory: 'Multi-Branch POS & Barcode Hardware',
        capturedFormName: 'Live Demo & Pricing Request',
        source: 'GOOGLE_ADS',
        ipAddress: '106.51.78.14',
        city: 'Bengaluru',
        country: 'India',
        leadScore: 88,
        status: 'NEW',
        notes: 'Requested live demo for 3 retail supermarkets next Monday.',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        id: 'LEAD-102',
        visitorId: 'VIS-902',
        name: 'Tariq Al-Mansoor',
        phone: '+971 50 123 4567',
        email: 'tariq@gulfposdistributors.ae',
        companyName: 'Gulf Electronics Trading LLC',
        interestCategory: 'UAE 5% VAT Billing & Bilingual Receipts',
        capturedFormName: 'Wholesale Distributor Inquiry',
        source: 'FACEBOOK_ADS',
        ipAddress: '185.193.64.22',
        city: 'Dubai',
        country: 'United Arab Emirates',
        leadScore: 94,
        status: 'QUALIFIED',
        notes: 'Wants distributor pricing for thermal paper rolls and barcode printers in Deira Dubai.',
        createdAt: new Date(Date.now() - 5400000).toISOString()
      }
    ],

    // --- Multi-Channel Marketing Data ---
    marketingCampaigns: [
      {
        id: 'MKT-WA-001',
        channel: 'WHATSAPP',
        title: 'Festival Mega Sale - 15% Off Spare Parts',
        bodyContent: 'Dear {{customer_name}}, Enjoy 15% OFF on genuine spare parts and accessories this week at Zia Tech! Use code FESTIVE15. Click here to browse: https://ziaenterprise.com/offers',
        targetAudience: 'ALL_CUSTOMERS',
        recipientCount: 250,
        deliveredCount: 242,
        clickedCount: 88,
        conversionCount: 19,
        status: 'COMPLETED',
        createdAt: '2026-10-25T08:00:00.000Z',
        budgetOrCost: 120
      },
      {
        id: 'MKT-EM-001',
        channel: 'EMAIL',
        title: 'Monthly Statement & B2B Wholesale Catalog',
        subjectOrHeadline: 'Your Zia Enterprise Account Statement & New Arrivals',
        bodyContent: '<h1>Hello Retail Partner,</h1><p>Find attached your monthly ledger statement and latest wholesale pricing catalog for thermal receipt printers.</p>',
        targetAudience: 'WHOLESALE_ONLY',
        recipientCount: 45,
        deliveredCount: 45,
        clickedCount: 29,
        conversionCount: 8,
        status: 'COMPLETED',
        createdAt: '2026-10-26T10:00:00.000Z',
        budgetOrCost: 0
      },
      {
        id: 'MKT-FB-001',
        channel: 'FACEBOOK',
        title: 'Retargeting Barcode Scanner & POS Hardware',
        subjectOrHeadline: 'Upgrade your retail store checkout counter with TVS & Honeywell hardware',
        bodyContent: 'High-speed 2D barcode scanners and heavy-duty 80mm receipt printers available with official 2-year warranty.',
        targetAudience: 'ALL_CUSTOMERS',
        recipientCount: 1250,
        deliveredCount: 1250,
        clickedCount: 142,
        conversionCount: 12,
        status: 'RUNNING',
        createdAt: '2026-10-28T09:00:00.000Z',
        budgetOrCost: 2500,
        metaCampaignId: 'META-CAMP-8891024'
      }
    ],

    whatsappTemplates: [
      {
        id: 'WAT-01',
        templateName: 'festive_discount_alert',
        category: 'MARKETING',
        language: 'en',
        status: 'APPROVED',
        bodyText: 'Hi {{1}}, get ready for the festival with special discounts on {{2}}! Claim your voucher now: {{3}}',
        variables: ['Customer Name', 'Product Category', 'Web Link']
      },
      {
        id: 'WAT-02',
        templateName: 'overdue_payment_notice',
        category: 'UTILITY',
        language: 'en',
        status: 'APPROVED',
        bodyText: 'Dear {{1}}, your invoice #{{2}} of ₹{{3}} is due. Please click here to make instant payment: {{4}}',
        variables: ['Customer Name', 'Invoice Number', 'Amount', 'Payment Link']
      }
    ],

    facebookSyncSettings: {
      id: 'FB-SYNC-01',
      pixelId: 'PIXEL-2901992019',
      catalogId: 'CAT-ZIA-HARDWARE-992',
      productsSynced: 10,
      lastSyncAt: new Date().toISOString(),
      syncStatus: 'SUCCESS',
      autoSyncInventory: true
    },

    // --- Multi-Branch Hierarchy ---
    branches: [
      {
        id: 'BR-HO-01',
        parentBranchId: null,
        nodeType: 'HEAD_OFFICE',
        branchCode: 'HO-BLR',
        name: 'Bengaluru Corporate Head Office',
        gstin: '29ABCDE1234F1Z5',
        state: 'Karnataka',
        stateCode: '29',
        city: 'Bengaluru',
        address: 'Plot 42, Outer Ring Road, Bellandur, Bengaluru 560103',
        phone: '+91 98450 12345',
        email: 'ho@ziaenterprise.com',
        receiptHeader: 'Zia Technologies - Corporate HQ',
        receiptFooter: 'Official Enterprise Head Office Receipt',
        isActive: true
      },
      {
        id: 'BR-REG-01',
        parentBranchId: 'BR-HO-01',
        nodeType: 'REGIONAL_ZONE',
        branchCode: 'ZONE-SOUTH',
        name: 'South Zone Regional Operations',
        gstin: '29ABCDE1234F1Z5',
        state: 'Karnataka',
        stateCode: '29',
        city: 'Bengaluru',
        address: '4th Floor, Tech Hub, Koramangala, Bengaluru 560034',
        phone: '+91 98450 12346',
        email: 'southzone@ziaenterprise.com',
        isActive: true
      },
      {
        id: 'BR-STR-01',
        parentBranchId: 'BR-REG-01',
        nodeType: 'BRANCH_STORE',
        branchCode: 'STORE-KOR',
        name: 'Koramangala Flagship Retail & Service Hub',
        gstin: '29ABCDE1234F1Z5',
        state: 'Karnataka',
        stateCode: '29',
        city: 'Bengaluru',
        address: '80 Feet Road, 4th Block, Koramangala, Bengaluru 560034',
        phone: '+91 98450 12347',
        email: 'koramangala@ziaenterprise.com',
        receiptHeader: 'Zia Flagship Store - Koramangala',
        receiptFooter: 'Thank you for shopping with us! Returns valid for 7 days.',
        isActive: true
      },
      {
        id: 'BR-STR-02',
        parentBranchId: 'BR-REG-01',
        nodeType: 'BRANCH_STORE',
        branchCode: 'STORE-IND',
        name: 'Indiranagar Experience Center',
        gstin: '29ABCDE1234F1Z5',
        state: 'Karnataka',
        stateCode: '29',
        city: 'Bengaluru',
        address: '100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru 560038',
        phone: '+91 98450 12348',
        email: 'indiranagar@ziaenterprise.com',
        receiptHeader: 'Zia Experience Center - Indiranagar',
        receiptFooter: 'Thank you for choosing Zia Tech.',
        isActive: true
      },
      {
        id: 'BR-WH-01',
        parentBranchId: 'BR-REG-01',
        nodeType: 'CENTRAL_WAREHOUSE',
        branchCode: 'WH-CENTRAL',
        name: 'Electronic City Central Distribution Warehouse',
        gstin: '29ABCDE1234F1Z5',
        state: 'Karnataka',
        stateCode: '29',
        city: 'Bengaluru',
        address: 'Phase 1, Industrial Area, Electronic City, Bengaluru 560100',
        phone: '+91 98450 12349',
        email: 'warehouse@ziaenterprise.com',
        isActive: true
      }
    ],

    // --- Role Management & Granular RBAC Matrix ---
    roles: [
      {
        id: 'ROLE-01',
        roleKey: 'SUPER_ADMIN',
        displayName: 'Super Administrator',
        isSystemRole: true,
        permissions: {
          admin: ['*'],
          branches: ['*'],
          rbac: ['*'],
          pos: ['*'],
          inventory: ['*'],
          customers: ['*'],
          suppliers: ['*'],
          etax: ['*'],
          reports: ['*']
        }
      },
      {
        id: 'ROLE-02',
        roleKey: 'REGIONAL_MGR',
        displayName: 'Regional Manager',
        isSystemRole: true,
        permissions: {
          branches: ['read', 'approve'],
          stn: ['create', 'read', 'update', 'approve'],
          pos: ['read', 'override'],
          inventory: ['read', 'approve'],
          customers: ['read', 'update'],
          suppliers: ['read'],
          reports: ['read', 'export']
        }
      },
      {
        id: 'ROLE-03',
        roleKey: 'BRANCH_MGR',
        displayName: 'Branch Store Manager',
        isSystemRole: true,
        permissions: {
          pos: ['create', 'read', 'update', 'override', 'approve'],
          shifts: ['create', 'read', 'update', 'approve'],
          inventory: ['create', 'read', 'update', 'approve'],
          stn: ['create', 'read', 'update'],
          customers: ['create', 'read', 'update'],
          expenses: ['create', 'read', 'approve'],
          reports: ['read', 'export']
        }
      },
      {
        id: 'ROLE-04',
        roleKey: 'CASHIER',
        displayName: 'Billing Cashier',
        isSystemRole: true,
        permissions: {
          pos: ['create', 'read'],
          shifts: ['create', 'read'],
          inventory: ['read'],
          customers: ['create', 'read']
        }
      },
      {
        id: 'ROLE-05',
        roleKey: 'STOREKEEPER',
        displayName: 'Warehouse Storekeeper',
        isSystemRole: true,
        permissions: {
          inventory: ['create', 'read', 'update'],
          stn: ['create', 'read', 'update', 'approve'],
          purchases: ['create', 'read', 'update'],
          suppliers: ['read']
        }
      },
      {
        id: 'ROLE-06',
        roleKey: 'TECHNICIAN',
        displayName: 'Service & Spare Parts Technician',
        isSystemRole: true,
        permissions: {
          jobSheets: ['create', 'read', 'update'],
          inventory: ['read'],
          pos: ['read']
        }
      }
    ],

    // --- Enterprise User List ---
    users: [
      { id: 'USR-001', name: 'Admin Manager', role: 'Super Administrator', roleKey: 'SUPER_ADMIN', email: 'admin@zia.local', phone: '+91 9845011111', branchId: 'BR-HO-01', branchName: 'Bengaluru Corporate Head Office', active: true, pinCode: '1234', mfaEnabled: true },
      { id: 'USR-002', name: 'Ramesh Kumar', role: 'Billing Cashier', roleKey: 'CASHIER', email: 'ramesh@zia.local', phone: '+91 9845022222', branchId: 'BR-STR-01', branchName: 'Koramangala Flagship Retail & Service Hub', active: true, pinCode: '2222', mfaEnabled: false },
      { id: 'USR-003', name: 'Priya Sharma', role: 'Branch Store Manager', roleKey: 'BRANCH_MGR', email: 'priya@zia.local', phone: '+91 9845033333', branchId: 'BR-STR-01', branchName: 'Koramangala Flagship Retail & Service Hub', active: true, pinCode: '3333', mfaEnabled: true },
      { id: 'USR-004', name: 'Deepak Rao', role: 'Warehouse Storekeeper', roleKey: 'STOREKEEPER', email: 'deepak@zia.local', phone: '+91 9845044444', branchId: 'BR-WH-01', branchName: 'Electronic City Central Distribution Warehouse', active: true, pinCode: '4444', mfaEnabled: false },
      { id: 'USR-005', name: 'Arun Vijay', role: 'Service & Spare Parts Technician', roleKey: 'TECHNICIAN', email: 'arun@zia.local', phone: '+91 9845055555', branchId: 'BR-STR-01', branchName: 'Koramangala Flagship Retail & Service Hub', active: true, pinCode: '5555', mfaEnabled: false }
    ],

    // --- POS Registers & Shifts ---
    posRegisters: [
      { id: 'REG-01', branchId: 'BR-STR-01', branchName: 'Koramangala Flagship Retail & Service Hub', registerCode: 'REG-KOR-01', name: 'Koramangala Main Checkout POS', macAddress: '00:1A:2B:3C:4D:5E', isActive: true },
      { id: 'REG-02', branchId: 'BR-STR-01', branchName: 'Koramangala Flagship Retail & Service Hub', registerCode: 'REG-KOR-02', name: 'Koramangala Express Counter', macAddress: '00:1A:2B:3C:4D:5F', isActive: true },
      { id: 'REG-03', branchId: 'BR-STR-02', branchName: 'Indiranagar Experience Center', registerCode: 'REG-IND-01', name: 'Indiranagar POS Desk 1', macAddress: '00:1A:2B:3C:4D:60', isActive: true }
    ],
    posShifts: [
      {
        id: 'SHIFT-2026-001',
        registerId: 'REG-01',
        registerCode: 'REG-KOR-01',
        userId: 'USR-002',
        userName: 'Ramesh Kumar',
        branchId: 'BR-STR-01',
        openedAt: new Date(Date.now() - 14400000).toISOString(),
        closedAt: null,
        openingFloatCash: 2500,
        closingCountedCash: null,
        expectedCash: 3299,
        cashVariance: 0,
        totalSalesAmount: 799,
        totalRefundsAmount: 0,
        status: 'OPEN'
      }
    ],

    // --- Inter-Branch Stock Transfers (STN) ---
    stockTransfers: [
      {
        id: 'STN-2026-001',
        stnNumber: 'STN-BLR-001',
        sourceBranchId: 'BR-WH-01',
        sourceBranchName: 'Electronic City Central Distribution Warehouse',
        destinationBranchId: 'BR-STR-01',
        destinationBranchName: 'Koramangala Flagship Retail & Service Hub',
        status: 'IN_TRANSIT',
        items: [
          { itemId: 'PRD-002', name: 'Thermal Barcode Scanner 2D USB', sku: 'HW-SCAN-2D', dispatchedQty: 10, receivedQty: 0, discrepancyQty: 0, unitCost: 2200 }
        ],
        totalUnits: 10,
        totalValuation: 22000,
        dispatchDate: new Date(Date.now() - 7200000).toISOString(),
        dispatchedBy: 'Deepak Rao',
        carrierName: 'FastLogistics Express',
        trackingNumber: 'FLX-998822',
        eWayBillNumber: '291048892188',
        notes: 'Urgent restocking for weekend festival sale'
      }
    ],

    // --- Specialized Warehouse Bin & Rack Layout ---
    storageLocations: [
      { id: 'LOC-01', branchId: 'BR-WH-01', zoneCode: 'ZONE-A', rackNumber: 'RACK-01', shelfTier: 'TIER-1', binNumber: 'BIN-01', description: 'Bulk Hardware Pallet Storage' },
      { id: 'LOC-02', branchId: 'BR-STR-01', zoneCode: 'ZONE-A', rackNumber: 'RACK-02', shelfTier: 'TIER-2', binNumber: 'BIN-04', description: 'Printer Thermal Print Heads & Parts' },
      { id: 'LOC-03', branchId: 'BR-STR-01', zoneCode: 'ZONE-A', rackNumber: 'RACK-02', shelfTier: 'TIER-2', binNumber: 'BIN-05', description: 'Auto-Cutter Blade Spare Assemblies' },
      { id: 'LOC-04', branchId: 'BR-STR-01', zoneCode: 'ZONE-B', rackNumber: 'RACK-01', shelfTier: 'TIER-1', binNumber: 'BIN-02', description: 'Barcode Scanner Optical Modules' },
      { id: 'LOC-05', branchId: 'BR-STR-01', zoneCode: 'ZONE-B', rackNumber: 'RACK-03', shelfTier: 'TIER-2', binNumber: 'BIN-01', description: 'Power Adapters & Data Cables' }
    ],

    // --- Spare Part Compatibility Matrix ---
    spareCompatibility: [
      { id: 'COMP-01', spareItemId: 'SPR-001', spareItemName: '3-Inch Thermal Print Head 203 DPI', spareSku: 'TH-PRN-HD-80', compatibleModelName: 'TVS RP3200 Thermal Receipt Printer', compatibleModelYear: '2024-2026', notes: 'Direct drop-in replacement' },
      { id: 'COMP-02', spareItemId: 'SPR-001', spareItemName: '3-Inch Thermal Print Head 203 DPI', spareSku: 'TH-PRN-HD-80', compatibleModelName: 'TVS RP3160 Star Printer', compatibleModelYear: '2022-2025', notes: 'Requires calibration after install' },
      { id: 'COMP-03', spareItemId: 'SPR-002', spareItemName: 'High-Speed Auto-Cutter Blade Assembly', spareSku: 'CUT-ASY-TVS', compatibleModelName: 'TVS RP3200 Thermal Receipt Printer', compatibleModelYear: '2024-2026', notes: 'Includes gear spring' },
      { id: 'COMP-04', spareItemId: 'SPR-003', spareItemName: 'Laser Scan Engine Sensor Module', spareSku: 'SE-HONEY-2D', compatibleModelName: 'Thermal Barcode Scanner 2D USB', compatibleModelYear: '2025-2026', notes: 'Requires firmware V2.4+' },
      { id: 'COMP-05', spareItemId: 'SPR-004', spareItemName: '24V 2.5A AC Power Adapter Brick', spareSku: 'PWR-ADP-24V', compatibleModelName: 'TVS RP3200 Thermal Receipt Printer', compatibleModelYear: 'ALL', notes: 'Universal DC barrel connector' }
    ],

    // --- Serial / IMEI Units ---
    serialUnits: [
      { id: 'SNU-01', itemId: 'PRD-002', itemName: 'Thermal Barcode Scanner 2D USB', branchId: 'BR-STR-01', serialOrImei: 'SN-HW-2026-9011', status: 'AVAILABLE', costPrice: 2200, warrantyMonths: 12 },
      { id: 'SNU-02', itemId: 'PRD-002', itemName: 'Thermal Barcode Scanner 2D USB', branchId: 'BR-STR-01', serialOrImei: 'SN-HW-2026-9012', status: 'AVAILABLE', costPrice: 2200, warrantyMonths: 12 },
      { id: 'SNU-03', itemId: 'PRD-005', itemName: 'Heavy Duty 3-Inch Thermal Receipt Printer', branchId: 'BR-STR-01', serialOrImei: 'SN-TVS-2026-0041', status: 'AVAILABLE', costPrice: 5800, warrantyMonths: 24 },
      { id: 'SNU-04', itemId: 'PRD-005', itemName: 'Heavy Duty 3-Inch Thermal Receipt Printer', branchId: 'BR-STR-01', serialOrImei: 'SN-TVS-2026-0042', status: 'UNDER_SERVICE', costPrice: 5800, warrantyMonths: 24 }
    ],

    // --- Service Job Sheets & Repair Requisitions ---
    serviceJobSheets: [
      {
        id: 'JOB-2026-001',
        jobNumber: 'JOB-KOR-1001',
        branchId: 'BR-STR-01',
        branchName: 'Koramangala Flagship Retail & Service Hub',
        customerId: 'CUST-001',
        customerName: 'Apex Retail Stores Pvt Ltd',
        customerPhone: '+91 9845012345',
        deviceModel: 'TVS RP3200 Thermal Receipt Printer',
        deviceSerialImei: 'SN-TVS-2026-0042',
        reportedFault: 'Paper cutter jammed; intermittent feeding errors',
        technicianDiagnostic: 'Cutter blade motor worn out; replaced with genuine OEM blade assembly. Bench tested OK.',
        assignedTechnicianId: 'USR-005',
        assignedTechnicianName: 'Arun Vijay',
        status: 'READY_FOR_DELIVERY',
        spares: [
          { id: 'JSP-01', spareItemId: 'SPR-002', name: 'High-Speed Auto-Cutter Blade Assembly', oemPartNumber: 'CUT-ASY-TVS', quantity: 1, unitPrice: 1350, taxRate: 18, isConsumed: true, storageBin: 'ZONE-A-RACK-02-BIN-05' }
        ],
        laborCharges: 500,
        sparesTotal: 1350,
        tax: 333,
        grandTotal: 2183,
        createdAt: new Date(Date.now() - 86400000).toISOString()
      }
    ],

    // --- RMA & Scrap Logs ---
    rmaRecords: [
      {
        id: 'RMA-2026-001',
        branchId: 'BR-STR-01',
        branchName: 'Koramangala Flagship Retail & Service Hub',
        itemId: 'PRD-002',
        itemName: 'Thermal Barcode Scanner 2D USB',
        serialOrImei: 'SN-HW-2026-8800',
        reason: 'DEFECTIVE_OUT_OF_BOX',
        action: 'RETURN_TO_VENDOR',
        reportedDate: new Date(Date.now() - 172800000).toISOString().slice(0, 10),
        status: 'DISPATCHED_TO_OEM',
        costLoss: 2200,
        notes: 'Laser aiming LED defective on fresh unboxing'
      }
    ],
    categories: ['Hardware', 'Software', 'Spare Parts', 'Supplies', 'Services', 'Groceries & FMCG'],
    brands: ['Zia Systems', 'Honeywell', 'TVS Electronics', 'Epson', 'Logitech', 'Generic'],
    units: ['Pcs', 'Kg', 'Box', 'Ltr', 'Mtr', 'Roll', 'Set'],
    products: [
      { id: 'PRD-001', classification: 'FINISHED_GOOD', name: 'Zia ERP Enterprise License (1 Year)', sku: 'ZIA-ERP-ENT', barcode: '8901234001', category: 'Software', brand: 'Zia Systems', unit: 'Set', purchasePrice: 18000, sellingPrice: 24999, taxRate: 18, stock: 95, minStock: 10, batch: 'B-2026-01', expiry: '2028-12-31', isSerialized: false },
      { id: 'PRD-002', classification: 'FINISHED_GOOD', name: 'Thermal Barcode Scanner 2D USB', sku: 'HW-SCAN-2D', barcode: '8901234002', category: 'Hardware', brand: 'Honeywell', unit: 'Pcs', purchasePrice: 2200, sellingPrice: 3499, taxRate: 18, stock: 12, minStock: 5, batch: 'B-2026-02', expiry: 'N/A', isSerialized: true, warrantyMonths: 12 },
      { id: 'PRD-003', classification: 'CONSUMABLE', name: '80mm Thermal Receipt Paper (Box of 50 Rolls)', sku: 'SPL-ROLL-80', barcode: '8901234003', category: 'Supplies', brand: 'Generic', unit: 'Box', purchasePrice: 900, sellingPrice: 1250, taxRate: 12, stock: 4, minStock: 10, batch: 'B-2026-03', expiry: '2029-06-30', isSerialized: false },
      { id: 'PRD-004', classification: 'SERVICE_LABOR', name: 'Annual Cloud Backup & Security Pack', sku: 'SRV-CLOUD-1Y', barcode: '8901234004', category: 'Services', brand: 'Zia Systems', unit: 'Set', purchasePrice: 2500, sellingPrice: 4999, taxRate: 18, stock: 250, minStock: 5, batch: 'B-2026-04', expiry: 'N/A', isSerialized: false },
      { id: 'PRD-005', classification: 'FINISHED_GOOD', name: 'Heavy Duty 3-Inch Thermal Receipt Printer', sku: 'HW-PRN-80', barcode: '8901234005', category: 'Hardware', brand: 'TVS Electronics', unit: 'Pcs', purchasePrice: 5800, sellingPrice: 8499, taxRate: 18, stock: 3, minStock: 5, batch: 'B-2026-05', expiry: 'N/A', isSerialized: true, warrantyMonths: 24 },
      { id: 'PRD-006', classification: 'FINISHED_GOOD', name: 'Premium Wireless Optical Mouse', sku: 'HW-MOU-WL', barcode: '8901234006', category: 'Hardware', brand: 'Logitech', unit: 'Pcs', purchasePrice: 450, sellingPrice: 799, taxRate: 18, stock: 24, minStock: 8, batch: 'B-2026-06', expiry: 'N/A', isSerialized: false },
      
      // Specialized Spare Parts Catalog
      { id: 'SPR-001', classification: 'SPARE_PART', name: '3-Inch Thermal Print Head 203 DPI', sku: 'TH-PRN-HD-80', oemPartNumber: 'TVS-OEM-HD80', barcode: '8909876001', category: 'Spare Parts', brand: 'TVS Electronics', unit: 'Pcs', purchasePrice: 1200, sellingPrice: 1950, taxRate: 18, stock: 15, minStock: 3, isSerialized: false, storageBin: 'ZONE-A-RACK-02-BIN-04' },
      { id: 'SPR-002', classification: 'SPARE_PART', name: 'High-Speed Auto-Cutter Blade Assembly', sku: 'CUT-ASY-TVS', oemPartNumber: 'TVS-OEM-CUT32', barcode: '8909876002', category: 'Spare Parts', brand: 'TVS Electronics', unit: 'Pcs', purchasePrice: 750, sellingPrice: 1350, taxRate: 18, stock: 8, minStock: 2, isSerialized: false, storageBin: 'ZONE-A-RACK-02-BIN-05' },
      { id: 'SPR-003', classification: 'SPARE_PART', name: 'Laser Scan Engine Sensor Module', sku: 'SE-HONEY-2D', oemPartNumber: 'HON-OEM-ENG2D', barcode: '8909876003', category: 'Spare Parts', brand: 'Honeywell', unit: 'Pcs', purchasePrice: 950, sellingPrice: 1650, taxRate: 18, stock: 12, minStock: 4, isSerialized: false, storageBin: 'ZONE-B-RACK-01-BIN-02' },
      { id: 'SPR-004', classification: 'SPARE_PART', name: '24V 2.5A AC Power Adapter Brick', sku: 'PWR-ADP-24V', oemPartNumber: 'GEN-OEM-24V25', barcode: '8909876004', category: 'Spare Parts', brand: 'Generic', unit: 'Pcs', purchasePrice: 400, sellingPrice: 850, taxRate: 18, stock: 25, minStock: 5, isSerialized: false, storageBin: 'ZONE-B-RACK-03-BIN-01' }
    ],
    customers: [
      { id: 'CUST-001', name: 'Apex Retail Stores Pvt Ltd', phone: '+91 9845012345', email: 'purchase@apexstores.in', gstin: '29ABCDE1234F1Z5', address: 'MG Road, Bengaluru', group: 'Wholesale', outstandingBalance: 8257.64, creditLimit: 100000, loyaltyPoints: 450, walletBalance: 5000, loyaltyTier: 'GOLD', isCreditFrozen: false },
      { id: 'CUST-002', name: 'Metro Supermarket Hub', phone: '+91 9123456780', email: 'accounts@metrohub.com', gstin: '29AAACH7409R1ZZ', address: 'Indiranagar, Bengaluru', group: 'Wholesale', outstandingBalance: 0, creditLimit: 250000, loyaltyPoints: 1200, walletBalance: 0, loyaltyTier: 'PLATINUM', isCreditFrozen: false },
      { id: 'CUST-003', name: 'Kiran Sharma (Walk-in)', phone: '+91 9988776655', email: 'kiran@gmail.com', gstin: '', address: 'Koramangala, Bengaluru', group: 'Retail', outstandingBalance: 0, creditLimit: 10000, loyaltyPoints: 85, walletBalance: 250, loyaltyTier: 'SILVER', isCreditFrozen: false }
    ],

    // --- Customer Party Ledgers & Debt Reminders ---
    customerLedgers: [
      { id: 'LED-001', customerId: 'CUST-001', date: '2026-10-20', type: 'INVOICE', referenceId: 'INV-2026-001', description: 'Enterprise License Purchase', debit: 34397.64, credit: 0, runningBalance: 34397.64 },
      { id: 'LED-002', customerId: 'CUST-001', date: '2026-10-20', type: 'PAYMENT', referenceId: 'UPI-TX-88912', description: 'UPI Payment Received for INV-2026-001', debit: 0, credit: 34397.64, runningBalance: 0 },
      { id: 'LED-003', customerId: 'CUST-001', date: '2026-10-21', type: 'INVOICE', referenceId: 'INV-2026-002', description: 'Thermal Barcode Scanner Purchase (Credit)', debit: 8257.64, credit: 0, runningBalance: 8257.64 }
    ],
    debtReminders: [
      { id: 'REM-001', customerId: 'CUST-001', customerName: 'Apex Retail Stores Pvt Ltd', customerPhone: '+91 9845012345', channel: 'WHATSAPP', outstandingAmount: 8257.64, paymentLink: 'https://pay.ziaenterprise.com/inv-2026-002', dispatchedAt: new Date(Date.now() - 3600000).toISOString(), status: 'DELIVERED' }
    ],
    suppliers: [
      { id: 'SUPP-001', name: 'National POS Hardware Importers', phone: '+91 9822099999', email: 'sales@nationalpos.com', gstin: '27AAACN1234K1Z2', address: 'Andheri East, Mumbai', payables: 24500 },
      { id: 'SUPP-002', name: 'Rolls & Stationery Mills Ltd', phone: '+91 9811088888', email: 'orders@rollsmills.in', gstin: '33AAACR5678P1ZQ', address: 'Sivakasi, Tamil Nadu', payables: 12000 }
    ],
    purchases: [
      {
        id: 'PUR-2026-001',
        supplierId: 'SUPP-001',
        supplierName: 'National POS Hardware Importers',
        date: '2026-10-10',
        items: [
          { productId: 'PRD-002', name: 'Thermal Barcode Scanner 2D USB', quantity: 10, unitCost: 2200, taxRate: 18, total: 25960 },
          { productId: 'PRD-005', name: 'Heavy Duty 3-Inch Thermal Receipt Printer', quantity: 5, unitCost: 5800, taxRate: 18, total: 34220 }
        ],
        subtotal: 51000,
        tax: 9180,
        total: 60180,
        status: 'RECEIVED',
        paymentStatus: 'PARTIAL'
      }
    ],

    // --- Phase 4: Purchase Orders (PO) & Requisitions ---
    purchaseOrders: [
      {
        id: 'PO-2026-001',
        poNumber: 'PO-BLR-1001',
        supplierId: 'SUPP-001',
        supplierName: 'National POS Hardware Importers',
        branchId: 'BR-WH-01',
        branchName: 'Electronic City Central Distribution Warehouse',
        orderDate: '2026-10-15',
        expectedDeliveryDate: '2026-10-25',
        items: [
          { productId: 'PRD-002', name: 'Thermal Barcode Scanner 2D USB', quantityOrdered: 20, quantityReceived: 18, unitCost: 2200, taxRate: 18, total: 44000 },
          { productId: 'SPR-003', name: 'Laser Scan Engine Sensor Module', quantityOrdered: 10, quantityReceived: 10, unitCost: 950, taxRate: 18, total: 9500 }
        ],
        subtotal: 53500,
        tax: 9630,
        total: 63130,
        status: 'PARTIALLY_RECEIVED',
        isAutoRequisition: false
      }
    ],

    // --- Phase 4: Goods Received Notes (GRN) & Inspection ---
    goodsReceivedNotes: [
      {
        id: 'GRN-2026-001',
        grnNumber: 'GRN-WH-8001',
        purchaseOrderId: 'PO-2026-001',
        supplierId: 'SUPP-001',
        supplierName: 'National POS Hardware Importers',
        branchId: 'BR-WH-01',
        branchName: 'Electronic City Central Distribution Warehouse',
        receivedDate: '2026-10-22',
        inspectorName: 'Deepak Rao (Storekeeper)',
        items: [
          { productId: 'PRD-002', name: 'Thermal Barcode Scanner 2D USB', orderedQty: 20, receivedQty: 19, shortageQty: 1, damagedQty: 1, acceptedQty: 18, unitCost: 2200 },
          { productId: 'SPR-003', name: 'Laser Scan Engine Sensor Module', orderedQty: 10, receivedQty: 10, shortageQty: 0, damagedQty: 0, acceptedQty: 10, unitCost: 950 }
        ],
        invoiceBillNumber: 'NAT-INV-9921',
        totalAcceptedValue: 49100,
        discrepancyNotes: '1 unit missing in crate, 1 scanner unit cracked lens during transit. Logged shortage debit note.',
        status: 'ACCEPTED_WITH_DISCREPANCY'
      }
    ],

    // --- Phase 4: Accounts Payable (A/P) Schedules ---
    apSchedules: [
      {
        id: 'AP-2026-001',
        supplierId: 'SUPP-001',
        supplierName: 'National POS Hardware Importers',
        purchaseBillId: 'PUR-2026-001',
        dueDate: '2026-11-10',
        amountDue: 24500,
        amountPaid: 35680,
        status: 'PENDING'
      },
      {
        id: 'AP-2026-002',
        supplierId: 'SUPP-002',
        supplierName: 'Rolls & Stationery Mills Ltd',
        purchaseBillId: 'PUR-2026-002',
        dueDate: '2026-11-15',
        amountDue: 12000,
        amountPaid: 0,
        status: 'PENDING'
      }
    ],

    // --- Phase 4: E-Way Bills ---
    eWayBills: [
      {
        id: 'EWB-01',
        ewbNumber: '291048892188',
        documentType: 'STN',
        docReferenceNo: 'STN-BLR-001',
        sourceGstin: '29ABCDE1234F1Z5',
        destGstin: '29ABCDE1234F1Z5',
        transporterName: 'FastLogistics Express',
        vehicleNumber: 'KA-01-MJ-4412',
        validUpto: '2026-11-02T23:59:59.000Z',
        totalValue: 22000,
        status: 'IN_TRANSIT'
      }
    ],

    // --- Phase 4: ASC 606 / IFRS 15 Revenue Recognition ---
    asc606Schedules: [
      {
        id: 'ASC-001',
        contractNumber: 'SRV-ENT-2026',
        customerName: 'Apex Retail Stores Pvt Ltd',
        totalContractValue: 24999,
        startDate: '2026-10-01',
        endDate: '2027-09-30',
        durationMonths: 12,
        monthlyRecognizedRevenue: 2083.25,
        earnedRevenueToDate: 2083.25,
        deferredRevenueRemaining: 22915.75,
        performanceObligation: '12-Month Zia Cloud SLA, Automatic Backups & Dedicated Support'
      }
    ],

    // --- Enterprise Chart of Accounts (COA) ---
    chartOfAccounts: [
      // Assets (1000 - 1999)
      { accountCode: '1010', accountName: 'Cash on Hand (POS Drawers)', category: 'ASSET', normalBalance: 'DEBIT', currentBalance: 25000, isSystemAccount: true },
      { accountCode: '1020', accountName: 'Bank Operating Account (HDFC / ENBD)', category: 'ASSET', normalBalance: 'DEBIT', currentBalance: 345000, isSystemAccount: true },
      { accountCode: '1030', accountName: 'Accounts Receivable (Trade Debtors)', category: 'ASSET', normalBalance: 'DEBIT', currentBalance: 8257.64, isSystemAccount: true },
      { accountCode: '1040', accountName: 'Inventory Asset (Stock on Hand)', category: 'ASSET', normalBalance: 'DEBIT', currentBalance: 2458400, isSystemAccount: true },
      { accountCode: '1050', accountName: 'Input Tax Credit (ITC / VAT Input)', category: 'ASSET', normalBalance: 'DEBIT', currentBalance: 9180, isSystemAccount: true },
      
      // Liabilities (2000 - 2999)
      { accountCode: '2010', accountName: 'Accounts Payable (Trade Creditors)', category: 'LIABILITY', normalBalance: 'CREDIT', currentBalance: 36500, isSystemAccount: true },
      { accountCode: '2020', accountName: 'Output Tax Payable (GST / VAT Output)', category: 'LIABILITY', normalBalance: 'CREDIT', currentBalance: 6781.16, isSystemAccount: true },
      { accountCode: '2030', accountName: 'Customer Prepaid Deposits & Wallets', category: 'LIABILITY', normalBalance: 'CREDIT', currentBalance: 5250, isSystemAccount: true },
      { accountCode: '2040', accountName: 'Unearned / Deferred Revenue (ASC 606)', category: 'LIABILITY', normalBalance: 'CREDIT', currentBalance: 22915.75, isSystemAccount: true },

      // Equity (3000 - 3999)
      { accountCode: '3010', accountName: 'Share Capital & Owner Equity', category: 'EQUITY', normalBalance: 'CREDIT', currentBalance: 2500000, isSystemAccount: true },
      { accountCode: '3020', accountName: 'Retained Earnings', category: 'EQUITY', normalBalance: 'CREDIT', currentBalance: 274390.73, isSystemAccount: true },

      // Revenue (4000 - 4999)
      { accountCode: '4010', accountName: 'Sales Revenue (Products & Hardware)', category: 'REVENUE', normalBalance: 'CREDIT', currentBalance: 37673.12, isSystemAccount: true },
      { accountCode: '4020', accountName: 'Service & Labor Revenue (Job Sheets)', category: 'REVENUE', normalBalance: 'CREDIT', currentBalance: 4999, isSystemAccount: true },

      // Expenses (5000 - 5999)
      { accountCode: '5010', accountName: 'Cost of Goods Sold (COGS)', category: 'EXPENSE', normalBalance: 'DEBIT', currentBalance: 24487.52, isSystemAccount: true },
      { accountCode: '5020', accountName: 'Rent & Branch Lease Expenses', category: 'EXPENSE', normalBalance: 'DEBIT', currentBalance: 0, isSystemAccount: false },
      { accountCode: '5030', accountName: 'Electricity & Utilities', category: 'EXPENSE', normalBalance: 'DEBIT', currentBalance: 3850, isSystemAccount: false },
      { accountCode: '5040', accountName: 'Logistics, Courier & Shipping', category: 'EXPENSE', normalBalance: 'DEBIT', currentBalance: 1400, isSystemAccount: false },
      { accountCode: '5050', accountName: 'Staff Refreshments & Petty Cash', category: 'EXPENSE', normalBalance: 'DEBIT', currentBalance: 650, isSystemAccount: false }
    ],

    // --- Double-Entry General Ledger Journal Entries ---
    journalEntries: [
      {
        id: 'JV-2026-001',
        voucherNumber: 'JV-BLR-001',
        date: '2026-10-20',
        referenceType: 'B2B_INVOICE',
        referenceId: 'INV-2026-001',
        branchId: 'BR-HO-01',
        branchName: 'Bengaluru Corporate Head Office',
        narration: 'Enterprise License billing for Apex Retail Stores (Paid via UPI)',
        lines: [
          { accountCode: '1020', accountName: 'Bank Operating Account (HDFC / ENBD)', debit: 34397.64, credit: 0, note: 'UPI proceeds' },
          { accountCode: '4010', accountName: 'Sales Revenue (Products & Hardware)', debit: 0, credit: 28998.00, note: 'Net revenue after discount' },
          { accountCode: '2020', accountName: 'Output Tax Payable (GST / VAT Output)', debit: 0, credit: 5399.64, note: '18% GST output' }
        ],
        totalDebit: 34397.64,
        totalCredit: 34397.64,
        isBalanced: true,
        postedBy: 'System Auto-GL',
        createdAt: '2026-10-20T10:30:00.000Z'
      },
      {
        id: 'JV-2026-002',
        voucherNumber: 'JV-BLR-002',
        date: '2026-10-21',
        referenceType: 'B2B_INVOICE',
        referenceId: 'INV-2026-002',
        branchId: 'BR-HO-01',
        branchName: 'Bengaluru Corporate Head Office',
        narration: 'Credit sale of 2D Barcode Scanners to Apex Retail Stores',
        lines: [
          { accountCode: '1030', accountName: 'Accounts Receivable (Trade Debtors)', debit: 8257.64, credit: 0, note: 'Due in 15 days' },
          { accountCode: '4010', accountName: 'Sales Revenue (Products & Hardware)', debit: 0, credit: 6998.00, note: 'Product revenue' },
          { accountCode: '2020', accountName: 'Output Tax Payable (GST / VAT Output)', debit: 0, credit: 1259.64, note: 'Output GST' }
        ],
        totalDebit: 8257.64,
        totalCredit: 8257.64,
        isBalanced: true,
        postedBy: 'System Auto-GL',
        createdAt: '2026-10-21T11:00:00.000Z'
      }
    ],
    invoices: [
      {
        id: 'INV-2026-001',
        type: 'INVOICE',
        customerId: 'CUST-001',
        customerName: 'Apex Retail Stores Pvt Ltd',
        customerPhone: '+91 9845012345',
        customerGstin: '29ABCDE1234F1Z5',
        date: '2026-10-20',
        dueDate: '2026-11-04',
        paymentMethod: 'UPI',
        items: [
          { id: 'PRD-001', name: 'Zia ERP Enterprise License (1 Year)', quantity: 1, unitPrice: 24999, taxRate: 18, total: 24999 },
          { id: 'PRD-004', name: 'Annual Cloud Backup & Security Pack', quantity: 1, unitPrice: 4999, taxRate: 18, total: 4999 }
        ],
        subtotal: 29998,
        tax: 5399.64,
        discount: 1000,
        total: 34397.64,
        status: 'PAID'
      },
      {
        id: 'INV-2026-002',
        type: 'INVOICE',
        customerId: 'CUST-001',
        customerName: 'Apex Retail Stores Pvt Ltd',
        customerPhone: '+91 9845012345',
        customerGstin: '29ABCDE1234F1Z5',
        date: '2026-10-21',
        dueDate: '2026-11-05',
        paymentMethod: 'Bank Transfer',
        items: [
          { id: 'PRD-002', name: 'Thermal Barcode Scanner 2D USB', quantity: 2, unitPrice: 3499, taxRate: 18, total: 6998 }
        ],
        subtotal: 6998,
        tax: 1259.64,
        discount: 0,
        total: 8257.64,
        status: 'PENDING'
      },
      {
        id: 'POS-2026-001',
        type: 'POS',
        customerId: 'CUST-003',
        customerName: 'Kiran Sharma (Walk-in)',
        customerPhone: '+91 9988776655',
        customerGstin: '',
        date: '2026-10-22',
        dueDate: '2026-10-22',
        paymentMethod: 'Cash',
        items: [
          { id: 'PRD-006', name: 'Premium Wireless Optical Mouse', quantity: 1, unitPrice: 799, taxRate: 18, total: 799 }
        ],
        subtotal: 677.12,
        tax: 121.88,
        discount: 0,
        total: 799.00,
        status: 'PAID'
      }
    ],
    heldBills: [],
    quotations: [
      {
        id: 'QT-1049',
        customerName: 'Karnataka Retailers Union',
        customerPhone: '+91 9845055555',
        date: '2026-10-21',
        expiryDate: '2026-11-21',
        items: [
          { id: 'PRD-001', name: 'Zia ERP Enterprise License (1 Year)', quantity: 2, unitPrice: 24999, taxRate: 18, total: 49998 }
        ],
        subtotal: 49998,
        tax: 8999.64,
        discount: 2000,
        total: 56997.64,
        status: 'PENDING'
      }
    ],
    expenses: [
      { id: 'EXP-101', category: 'Electricity & Utilities', amount: 3850, paymentMethod: 'UPI', date: '2026-10-18', paidTo: 'BESCOM', note: 'Office Monthly Power Bill' },
      { id: 'EXP-102', category: 'Tea & Refreshments', amount: 650, paymentMethod: 'Cash', date: '2026-10-20', paidTo: 'Pantry Snacks', note: 'Staff refreshments' },
      { id: 'EXP-103', category: 'Logistics & Transport', amount: 1400, paymentMethod: 'UPI', date: '2026-10-21', paidTo: 'Delhivery Courier', note: 'Hardware dispatch' }
    ],
    expenseCategories: ['Rent', 'Salaries & Wages', 'Electricity & Utilities', 'Logistics & Transport', 'Maintenance & Office', 'Marketing', 'Tea & Refreshments'],
    plans: [
      { id: 'PLN-001', name: 'ERP Enterprise Monthly', description: 'Monthly subscription to Zia ERP Enterprise', amount: 2499, billingCycle: 'MONTHLY', taxRate: 18, isActive: true },
      { id: 'PLN-002', name: 'ERP Enterprise Yearly', description: 'Annual subscription to Zia ERP Enterprise', amount: 24999, billingCycle: 'YEARLY', taxRate: 18, isActive: true }
    ],
    subscriptions: [],
    coupons: [
      { id: 'CPN-001', code: 'WELCOME10', type: 'PERCENT', value: 10, isActive: true, expiresAt: '2027-12-31', maxRedemptions: 100, timesRedeemed: 0 }
    ],
    addOns: [
      { id: 'ADD-001', name: 'Priority Support', amount: 499 }
    ],
    auditLogs: [
      { timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), user: 'Admin', action: 'CREATE_INVOICE', details: 'Generated INV-2026-001 for Apex Retail Stores' },
      { timestamp: new Date(Date.now() - 86400000).toISOString(), user: 'Admin', action: 'STOCK_IN', details: 'Goods received for PUR-2026-001 (15 items)' },
      { timestamp: new Date().toISOString(), user: 'Cashier', action: 'POS_CHECKOUT', details: 'Quick bill POS-2026-001 for ₹799 (Cash)' }
    ]
  };

  // State Management — backed by SQLite (server/db.cjs). The in-memory `state`
  // object keeps its historical shape so route handlers below are unchanged;
  // only loading/saving and ID generation go through the database now.
  const db = await openDb(dbFile);
  const nextId = makeNextId(db);
  const persistState = makePersist(db);
  const gateway = getGateway();

  migrateLegacyJson(db, {
    legacyJsonFile: legacyDataFile,
    isDbEmpty,
    persistState,
    defaultState
  });

  let state = loadState(db, defaultState);

  for (const [counterName, collectionKey] of Object.entries({
    invoices: 'invoices', customers: 'customers', suppliers: 'suppliers',
    purchases: 'purchases', purchaseOrders: 'purchaseOrders',
    goodsReceivedNotes: 'goodsReceivedNotes', users: 'users',
    quotations: 'quotations', stockTransfers: 'stockTransfers',
    serviceJobSheets: 'serviceJobSheets', plans: 'plans',
    subscriptions: 'subscriptions', coupons: 'coupons', addOns: 'addOns'
  })) {
    seedCounterFromLength(db, counterName, (state[collectionKey] || []).length);
  }

  function persist() {
    try {
      persistState(state);
    } catch (e) {
      console.error('Failed to persist data:', e.message);
    }
  }

  function logAudit(user, action, details) {
    state.auditLogs.unshift({
      timestamp: new Date().toISOString(),
      user: user || 'Admin',
      action,
      details
    });
    if (state.auditLogs.length > 500) state.auditLogs.pop();
    persist();
  }

  // Attach UAE Automotive Spare Parts ERP Sub-Router
  router.use(createUaeErpRouter({
    state,
    persist,
    nextId,
    logAudit,
    defaultState
  }));

  // License State
  let activeLicense = null;
  if (fs.existsSync(licenseFile)) {
    try {
      const savedKey = fs.readFileSync(licenseFile, 'utf-8').trim();
      const result = verifyActivationKey(savedKey);
      if (result.valid) activeLicense = result.license;
    } catch (e) {}
  }

  // --- 1. LICENSING ---
  router.get('/license/system-id', (req, res) => {
    const machine = getSystemHardwareId();
    res.json({
      systemId: machine.systemId,
      activated: activeLicense !== null,
      license: activeLicense
    });
  });

  // Dev-only convenience: signs a demo key using the private key from the
  // separate zia-billing-license-tool folder (kept OUTSIDE this app/repo —
  // see that folder's README), if it's present as a sibling directory on
  // this machine. It never ships with packaged customer installs, so this
  // route simply 404s there — real customers always get a key generated by
  // the vendor via zia-billing-license-tool/generate-license.cjs.
  router.post('/license/dev-generate', (req, res) => {
    const privateKeyPath = path.join(__dirname, '..', '..', 'zia-billing-license-tool', 'private_key.pem');
    if (!fs.existsSync(privateKeyPath)) {
      return res.status(404).json({ error: 'No local signing key available on this machine.' });
    }
    try {
      const crypto = require('crypto');
      const privateKey = fs.readFileSync(privateKeyPath, 'utf-8');
      const machine = getSystemHardwareId();
      const payload = {
        systemId: machine.systemId,
        plan: 'ENTERPRISE COMPLETE',
        validFrom: new Date().toISOString().slice(0, 10),
        validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        maxUsers: 100,
        features: { pos: true, sales: true, purchases: true, inventory: true, accounting: true, reports: true }
      };
      const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const signatureB64 = crypto.sign('sha256', Buffer.from(payloadB64, 'base64url'), privateKey).toString('base64url');
      res.json({ licenseKey: `${payloadB64}.${signatureB64}` });
    } catch (e) {
      res.status(500).json({ error: 'Failed to generate demo key: ' + e.message });
    }
  });

  router.post('/license/activate', (req, res) => {
    const { licenseKey } = req.body;
    if (!licenseKey) return res.status(400).json({ error: 'License key is required.' });
    const result = verifyActivationKey(licenseKey);
    if (!result.valid) return res.status(403).json({ error: result.reason });

    try {
      fs.writeFileSync(licenseFile, licenseKey, 'utf-8');
    } catch (e) {}

    activeLicense = result.license;
    logAudit('Admin', 'LICENSE_ACTIVATE', `Activated license: ${activeLicense.plan}`);
    res.json({ message: 'Zia-Billing Activated Successfully!', license: activeLicense });
  });

  // --- 2. DASHBOARD ---
  router.get('/dashboard/stats', (req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const todayInvoices = state.invoices.filter(i => i.date === today);
    const todaySales = todayInvoices.reduce((sum, i) => sum + (i.status === 'PAID' ? i.total : 0), 0);

    // Cash / Card / UPI split
    const paymentSplit = { Cash: 0, Card: 0, UPI: 0, Bank: 0 };
    state.invoices.forEach(inv => {
      if (inv.status === 'PAID') {
        const method = inv.paymentMethod || 'Cash';
        if (paymentSplit[method] !== undefined) paymentSplit[method] += inv.total;
        else paymentSplit.Bank += inv.total;
      }
    });

    const totalRevenue = state.invoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.total, 0);
    const outstandingPayments = state.invoices.filter(i => i.status === 'PENDING').reduce((sum, i) => sum + i.total, 0);
    const lowStockAlerts = state.products.filter(p => p.stock <= (p.minStock || 5));

    // Top selling products count
    const productSalesMap = {};
    state.invoices.forEach(inv => {
      inv.items?.forEach(item => {
        productSalesMap[item.name] = (productSalesMap[item.name] || 0) + (item.quantity || 1);
      });
    });
    const topProducts = Object.entries(productSalesMap)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    res.json({
      todaySales,
      todayInvoicesCount: todayInvoices.length,
      totalInvoices: state.invoices.length,
      totalRevenue,
      outstandingPayments,
      paymentSplit,
      lowStockCount: lowStockAlerts.length,
      lowStockAlerts: lowStockAlerts.slice(0, 5),
      topProducts,
      totalCustomers: state.customers.length,
      totalSuppliers: state.suppliers.length,
      totalProductsCount: state.products.length
    });
  });

  // --- 3. PRODUCTS & CATALOG ---
  router.get('/products', (req, res) => res.json(state.products));

  router.post('/products', (req, res) => {
    const { name, sku, barcode, hsnCode, category, brand, unit, purchasePrice, sellingPrice, taxRate, stock, minStock, batch, expiry } = req.body;
    if (!name || !sellingPrice) return res.status(400).json({ error: 'Name and selling price are required.' });

    const newProd = {
      id: `PRD-${Date.now().toString().slice(-4)}`,
      name: String(name).trim(),
      sku: sku ? String(sku).trim().toUpperCase() : `SKU-${Date.now().toString().slice(-4)}`,
      barcode: barcode || String(Date.now()).slice(-10),
      hsnCode: hsnCode || '',
      category: category || 'Hardware',
      brand: brand || 'Generic',
      unit: unit || 'Pcs',
      purchasePrice: parseFloat(purchasePrice) || 0,
      sellingPrice: parseFloat(sellingPrice) || 0,
      taxRate: parseFloat(taxRate) || 0,
      stock: parseInt(stock, 10) || 0,
      minStock: parseInt(minStock, 10) || 5,
      batch: batch || 'B-01',
      expiry: expiry || 'N/A'
    };

    state.products.unshift(newProd);
    logAudit('Admin', 'CREATE_PRODUCT', `Added SKU: ${newProd.sku} - ${newProd.name}`);
    persist();
    res.status(201).json(newProd);
  });

  router.patch('/products/:id/stock', (req, res) => {
    const { id } = req.params;
    const { delta, reason } = req.body;
    const prod = state.products.find(p => p.id === id);
    if (!prod) return res.status(404).json({ error: 'Product not found.' });

    const oldStock = prod.stock;
    if (typeof delta === 'number') prod.stock = Math.max(0, prod.stock + delta);
    else if (typeof req.body.stock === 'number') prod.stock = Math.max(0, req.body.stock);

    logAudit('Admin', 'STOCK_ADJUSTMENT', `${prod.sku}: ${oldStock} -> ${prod.stock} (${reason || 'Manual Adjustment'})`);
    persist();
    res.json(prod);
  });

  router.delete('/products/:id', (req, res) => {
    const prod = state.products.find(p => p.id === req.params.id);
    state.products = state.products.filter(p => p.id !== req.params.id);
    logAudit('Admin', 'DELETE_PRODUCT', `Deleted product: ${prod ? prod.name : req.params.id}`);
    persist();
    res.json({ message: 'Product removed' });
  });

  router.get('/products/categories', (req, res) => res.json(state.categories));
  router.get('/products/brands', (req, res) => res.json(state.brands));
  router.get('/products/units', (req, res) => res.json(state.units));

  // --- 4. INVOICES & BILLING (Sales & POS) ---
  router.get('/invoices', (req, res) => res.json(state.invoices));

  router.post('/invoices', (req, res) => {
    const { type = 'INVOICE', customerId, customerName, customerPhone, customerGstin, items, discount = 0, paymentMethod = 'Cash', dueDate } = req.body;
    if (!customerName || !items || !items.length) {
      return res.status(400).json({ error: 'Customer name and line items required.' });
    }

    let subtotal = 0;
    let taxTotal = 0;
    const processedItems = items.map(item => {
      const qty = parseInt(item.quantity, 10) || 1;
      const price = parseFloat(item.unitPrice || item.sellingPrice) || 0;
      const rate = parseFloat(item.taxRate) || 18;
      const lineSub = qty * price;
      const lineTax = lineSub * (rate / 100);
      subtotal += lineSub;
      taxTotal += lineTax;

      // Decrement stock
      let hsnCode = item.hsnCode || '';
      if (item.id) {
        const prod = state.products.find(p => p.id === item.id);
        if (prod) {
          prod.stock = Math.max(0, prod.stock - qty);
          if (!hsnCode) hsnCode = prod.hsnCode || '';
        }
      }

      return {
        id: item.id || null,
        name: item.name,
        hsnCode,
        quantity: qty,
        unitPrice: price,
        taxRate: rate,
        total: lineSub
      };
    });

    const parsedDiscount = parseFloat(discount) || 0;
    const grandTotal = Math.max(0, subtotal + taxTotal - parsedDiscount);
    const prefix = type === 'POS' ? 'POS' : 'INV';
    const invoiceId = `${prefix}-${new Date().getFullYear()}-${String(nextId('invoices')).padStart(3, '0')}`;

    const newInvoice = {
      id: invoiceId,
      type,
      customerId: customerId || null,
      customerName: String(customerName).trim(),
      customerPhone: customerPhone || '',
      customerGstin: customerGstin || '',
      date: new Date().toISOString().slice(0, 10),
      dueDate: dueDate || (type === 'POS' ? new Date().toISOString().slice(0, 10) : new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10)),
      paymentMethod,
      items: processedItems,
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(taxTotal * 100) / 100,
      discount: parsedDiscount,
      total: Math.round(grandTotal * 100) / 100,
      status: paymentMethod === 'Credit' ? 'PENDING' : 'PAID'
    };
    if (newInvoice.status === 'PENDING') newInvoice.paymentLink = gateway.createPaymentLink(newInvoice).url;

    // If customer credit, update customer outstanding balance
    if (newInvoice.status === 'PENDING' && customerId) {
      const cust = state.customers.find(c => c.id === customerId);
      if (cust) {
        cust.outstandingBalance = (cust.outstandingBalance || 0) + newInvoice.total;
        if (cust.outstandingBalance > cust.creditLimit) {
          cust.isCreditFrozen = true;
        }
      }
    }

    // Record customer ledger entry
    if (customerId) {
      state.customerLedgers.push({
        id: `LED-${Date.now().toString().slice(-5)}`,
        customerId,
        date: newInvoice.date,
        type: 'INVOICE',
        referenceId: newInvoice.id,
        description: `Invoice ${newInvoice.id} (${type})`,
        debit: newInvoice.total,
        credit: 0,
        runningBalance: (state.customers.find(c => c.id === customerId)?.outstandingBalance) || newInvoice.total
      });
    }

    state.invoices.unshift(newInvoice);
    logAudit(type === 'POS' ? 'Cashier' : 'Admin', 'CREATE_BILL', `Created ${invoiceId} for ₹${newInvoice.total} (${paymentMethod})`);
    persist();
    res.status(201).json(newInvoice);
  });

  // --- 4B. ADVANCED MULTI-TENDER POS CHECKOUT & SUPERVISOR DISCOUNT ---
  router.post('/pos/checkout', (req, res) => {
    const {
      customerId,
      customerName = 'Walk-in Customer',
      customerPhone = '',
      customerGstin = '',
      branchId,
      registerId,
      items,
      discountPercent = 0,
      supervisorOverridePin,
      tenders = [] // [{ method: 'Cash', amount: 500 }, { method: 'UPI', amount: 299 }]
    } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ error: 'Cart must contain at least one item' });
    }

    // 1. Manager Override Protection for Discounts > 10%
    const discPct = parseFloat(discountPercent) || 0;
    let discountApprovedBy = null;
    if (discPct > 10) {
      const supervisor = state.users.find(
        u => u.pinCode === String(supervisorOverridePin).trim() &&
        (u.roleKey === 'SUPER_ADMIN' || u.roleKey === 'BRANCH_MGR' || u.role === 'Admin')
      );
      if (!supervisor) {
        return res.status(403).json({
          error: 'SUPERVISOR_OVERRIDE_REQUIRED',
          message: `Discounts exceeding 10% (${discPct}%) require Manager Supervisor PIN authorization.`
        });
      }
      discountApprovedBy = supervisor.name;
    }

    // 2. Line Items Calculation & Stock Verification
    let subtotal = 0;
    let totalTax = 0;
    const processedItems = items.map(it => {
      const qty = parseInt(it.quantity, 10) || 1;
      const price = parseFloat(it.unitPrice || it.sellingPrice) || 0;
      const rate = parseFloat(it.taxRate) || 18;
      const lineSub = qty * price;
      const lineTax = lineSub * (rate / 100);
      subtotal += lineSub;
      totalTax += lineTax;

      // Deduct warehouse stock
      let hsnCode = it.hsnCode || '';
      if (it.id) {
        const prod = state.products.find(p => p.id === it.id);
        if (prod) {
          prod.stock = Math.max(0, prod.stock - qty);
          if (!hsnCode) hsnCode = prod.hsnCode || '';
        }
      }
      return {
        id: it.id,
        name: it.name,
        hsnCode,
        quantity: qty,
        unitPrice: price,
        taxRate: rate,
        total: lineSub
      };
    });

    const discountAmount = Math.round((subtotal * (discPct / 100)) * 100) / 100;
    const grandTotal = Math.round((subtotal + totalTax - discountAmount) * 100) / 100;

    // 3. Tax Split (Intra-state CGST + SGST vs Inter-state IGST)
    const branch = state.branches.find(b => b.id === branchId) || state.branches[0];
    const branchStateCode = branch ? branch.stateCode : '29';
    const customerStateCode = customerGstin ? customerGstin.slice(0, 2) : branchStateCode;
    const isInterState = customerStateCode !== branchStateCode;

    let cgst = 0, sgst = 0, igst = 0;
    if (isInterState) {
      igst = totalTax;
    } else {
      cgst = Math.round((totalTax / 2) * 100) / 100;
      sgst = Math.round((totalTax / 2) * 100) / 100;
    }

    // 4. Customer Credit Control & Wallet Verification
    let customer = customerId ? state.customers.find(c => c.id === customerId) : null;
    let creditTenderAmount = 0;
    let walletTenderAmount = 0;
    let loyaltyPointsRedeemed = 0;

    tenders.forEach(t => {
      const amt = parseFloat(t.amount) || 0;
      if (t.method === 'Credit' || t.method === 'Store Credit') {
        creditTenderAmount += amt;
      } else if (t.method === 'Prepaid Wallet') {
        walletTenderAmount += amt;
      } else if (t.method === 'Loyalty Points') {
        loyaltyPointsRedeemed += amt;
      }
    });

    if (customer && creditTenderAmount > 0) {
      if (customer.isCreditFrozen || (customer.outstandingBalance + creditTenderAmount > customer.creditLimit)) {
        if (!discountApprovedBy) { // If not pre-authorized by supervisor
          return res.status(403).json({
            error: 'CREDIT_LIMIT_BREACHED',
            message: `Credit sale of ₹${creditTenderAmount} exceeds customer's remaining limit of ₹${Math.max(0, customer.creditLimit - customer.outstandingBalance)}. Manager authorization required.`
          });
        }
      }
    }

    if (customer && walletTenderAmount > 0) {
      if ((customer.walletBalance || 0) < walletTenderAmount) {
        return res.status(400).json({ error: 'INSUFFICIENT_WALLET_BALANCE', available: customer.walletBalance || 0 });
      }
      customer.walletBalance -= walletTenderAmount;
    }

    if (customer && loyaltyPointsRedeemed > 0) {
      if ((customer.loyaltyPoints || 0) < loyaltyPointsRedeemed) {
        return res.status(400).json({ error: 'INSUFFICIENT_LOYALTY_POINTS', available: customer.loyaltyPoints || 0 });
      }
      customer.loyaltyPoints -= loyaltyPointsRedeemed;
    }

    // 5. Generate POS Invoice
    const invoiceId = `POS-${new Date().getFullYear()}-${String(nextId('invoices')).padStart(3, '0')}`;
    const newInvoice = {
      id: invoiceId,
      type: 'POS',
      customerId: customer ? customer.id : null,
      customerName: String(customerName).trim(),
      customerPhone: customerPhone || (customer ? customer.phone : ''),
      customerGstin: customerGstin || (customer ? customer.gstin : ''),
      date: new Date().toISOString().slice(0, 10),
      dueDate: new Date().toISOString().slice(0, 10),
      paymentMethod: tenders[0] ? tenders[0].method : 'Cash',
      tenders,
      items: processedItems,
      subtotal,
      tax: totalTax,
      cgst,
      sgst,
      igst,
      taxType: isInterState ? 'INTER_STATE_IGST' : 'INTRA_STATE_GST',
      discount: discountAmount,
      discountApprovedBy,
      total: grandTotal,
      status: creditTenderAmount > 0 ? 'PENDING' : 'PAID',
      branchId: branch ? branch.id : null,
      registerId: registerId || null
    };

    // Update Customer Balance & Earn Loyalty Points
    if (customer) {
      if (creditTenderAmount > 0) {
        customer.outstandingBalance = (customer.outstandingBalance || 0) + creditTenderAmount;
      }
      // Earn 1 loyalty point per ₹100 of non-credit purchases
      const paidPortion = grandTotal - creditTenderAmount;
      const earnedPoints = Math.floor(paidPortion / 100);
      if (earnedPoints > 0) {
        customer.loyaltyPoints = (customer.loyaltyPoints || 0) + earnedPoints;
      }

      state.customerLedgers.push({
        id: `LED-${Date.now().toString().slice(-5)}`,
        customerId: customer.id,
        date: newInvoice.date,
        type: 'INVOICE',
        referenceId: newInvoice.id,
        description: `POS Checkout #${newInvoice.id}`,
        debit: grandTotal,
        credit: grandTotal - creditTenderAmount,
        runningBalance: customer.outstandingBalance
      });
    }

    state.invoices.unshift(newInvoice);
    logAudit('Cashier', 'POS_CHECKOUT', `Completed POS bill ${newInvoice.id} for ₹${grandTotal} (Tenders: ${tenders.map(t => t.method + ': ₹' + t.amount).join(', ')})`);
    persist();
    res.status(201).json(newInvoice);
  });

  router.patch('/invoices/:id/status', (req, res) => {
    const inv = state.invoices.find(i => i.id === req.params.id);
    if (!inv) return res.status(404).json({ error: 'Invoice not found.' });
    inv.status = req.body.status;
    if (inv.status === 'PAID' && inv.customerId) {
      const cust = state.customers.find(c => c.id === inv.customerId);
      if (cust) {
        cust.outstandingBalance = Math.max(0, (cust.outstandingBalance || 0) - inv.total);
        if (cust.outstandingBalance <= cust.creditLimit) {
          cust.isCreditFrozen = false;
        }
      }
    }
    logAudit('Admin', 'INVOICE_STATUS', `${inv.id} marked as ${inv.status}`);
    persist();
    res.json(inv);
  });

  // --- 5. POS HOLD & RESUME ---
  router.get('/pos/held', (req, res) => res.json(state.heldBills));

  router.post('/pos/hold', (req, res) => {
    const { customerName, items, total } = req.body;
    const held = {
      id: `HOLD-${Date.now().toString().slice(-4)}`,
      time: new Date().toLocaleTimeString(),
      customerName: customerName || 'Walk-in Customer',
      items: items || [],
      total: total || 0
    };
    state.heldBills.unshift(held);
    logAudit('Cashier', 'HOLD_BILL', `Bill held for ${held.customerName} (₹${held.total})`);
    persist();
    res.status(201).json(held);
  });

  router.delete('/pos/held/:id', (req, res) => {
    state.heldBills = state.heldBills.filter(h => h.id !== req.params.id);
    persist();
    res.json({ message: 'Held bill cleared' });
  });

  // --- 6. QUOTATIONS ---
  router.get('/quotations', (req, res) => res.json(state.quotations));

  router.post('/quotations', (req, res) => {
    const { customerName, customerPhone, items, discount = 0 } = req.body;
    let subtotal = 0;
    let taxTotal = 0;
    const processed = items.map(i => {
      const line = (i.quantity || 1) * (i.unitPrice || 0);
      subtotal += line;
      taxTotal += line * ((i.taxRate || 18) / 100);
      return { ...i, total: line };
    });
    const total = subtotal + taxTotal - (parseFloat(discount) || 0);
    const newQt = {
      id: `QT-${new Date().getFullYear()}-${String(nextId('quotations')).padStart(3, '0')}`,
      customerName,
      customerPhone,
      date: new Date().toISOString().slice(0, 10),
      expiryDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      items: processed,
      subtotal,
      tax: taxTotal,
      discount: parseFloat(discount) || 0,
      total,
      status: 'PENDING'
    };
    state.quotations.unshift(newQt);
    logAudit('Admin', 'CREATE_QUOTATION', `Created ${newQt.id} for ${customerName}`);
    persist();
    res.status(201).json(newQt);
  });

  // Convert Quotation to Active Sales Invoice
  router.post('/quotations/:id/convert-to-invoice', (req, res) => {
    const qt = state.quotations.find(q => q.id === req.params.id);
    if (!qt) return res.status(404).json({ error: 'Quotation not found' });
    if (qt.status === 'CONVERTED') return res.status(400).json({ error: 'Quotation is already converted' });

    // Deduct stock for quote items
    qt.items.forEach(it => {
      const prod = state.products.find(p => p.id === it.id || p.name === it.name);
      if (prod) prod.stock = Math.max(0, prod.stock - (it.quantity || 1));
    });

    const newInvoice = {
      id: `INV-${new Date().getFullYear()}-${String(nextId('invoices')).padStart(3, '0')}`,
      type: 'INVOICE',
      customerName: qt.customerName,
      customerPhone: qt.customerPhone || '',
      customerGstin: '',
      date: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
      paymentMethod: req.body.paymentMethod || 'Credit',
      items: qt.items,
      subtotal: qt.subtotal,
      tax: qt.tax,
      discount: qt.discount,
      total: qt.total,
      status: (req.body.paymentMethod && req.body.paymentMethod !== 'Credit') ? 'PAID' : 'PENDING',
      quotationId: qt.id
    };

    qt.status = 'CONVERTED';
    state.invoices.unshift(newInvoice);
    logAudit('Admin', 'CONVERT_QUOTATION', `Converted Quotation ${qt.id} to Invoice ${newInvoice.id} for ₹${newInvoice.total}`);
    persist();
    res.json({ quotation: qt, invoice: newInvoice });
  });

  // --- 6B. SUBSCRIPTION BILLING (Zoho-Billing-style recurring plans) ---

  function addCycle(dateStr, cycle) {
    const d = new Date(dateStr);
    if (cycle === 'YEARLY') d.setFullYear(d.getFullYear() + 1);
    else if (cycle === 'QUARTERLY') d.setMonth(d.getMonth() + 3);
    else d.setMonth(d.getMonth() + 1); // MONTHLY (default)
    return d.toISOString().slice(0, 10);
  }

  // Builds and posts one invoice for a subscription's current cycle, reusing
  // the same shape/ledger/audit logic as POST /invoices. Caller is
  // responsible for calling persist() once after all subscriptions are done.
  function billSubscriptionOnce(sub) {
    const plan = state.plans.find(p => p.id === sub.planId);
    if (!plan) return null;

    let subtotal = plan.amount;
    const addOnTotal = (sub.addOnIds || []).reduce((sum, id) => {
      const addOn = state.addOns.find(a => a.id === id);
      return sum + (addOn ? addOn.amount : 0);
    }, 0);
    subtotal += addOnTotal;

    let discountAmt = 0;
    if (sub.couponCode) {
      const coupon = state.coupons.find(c => c.code === sub.couponCode && c.isActive);
      if (coupon) {
        discountAmt = coupon.type === 'PERCENT' ? subtotal * (coupon.value / 100) : coupon.value;
        coupon.timesRedeemed = (coupon.timesRedeemed || 0) + 1;
      }
    }

    const taxRate = parseFloat(plan.taxRate) || 0;
    const taxableAmount = Math.max(0, subtotal - discountAmt);
    const tax = taxableAmount * (taxRate / 100);
    const total = Math.round((taxableAmount + tax) * 100) / 100;

    const invoiceId = `INV-${new Date().getFullYear()}-${String(nextId('invoices')).padStart(3, '0')}`;
    const newInvoice = {
      id: invoiceId,
      type: 'INVOICE',
      customerId: sub.customerId || null,
      customerName: sub.customerName,
      customerPhone: '',
      customerGstin: '',
      date: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
      paymentMethod: 'Credit',
      items: [{ id: plan.id, name: plan.name, quantity: 1, unitPrice: plan.amount, taxRate, total: plan.amount }],
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      discount: Math.round(discountAmt * 100) / 100,
      total,
      status: 'PENDING',
      subscriptionId: sub.id
    };
    newInvoice.paymentLink = gateway.createPaymentLink(newInvoice).url;

    if (sub.customerId) {
      const cust = state.customers.find(c => c.id === sub.customerId);
      if (cust) {
        cust.outstandingBalance = (cust.outstandingBalance || 0) + total;
        if (cust.outstandingBalance > cust.creditLimit) cust.isCreditFrozen = true;
      }
      state.customerLedgers.push({
        id: `LED-${Date.now().toString().slice(-5)}`,
        customerId: sub.customerId,
        date: newInvoice.date,
        type: 'INVOICE',
        referenceId: newInvoice.id,
        description: `Subscription ${sub.id} (${plan.name}) cycle invoice`,
        debit: total,
        credit: 0,
        runningBalance: (state.customers.find(c => c.id === sub.customerId)?.outstandingBalance) || total
      });
    }

    state.invoices.unshift(newInvoice);
    sub.lastInvoiceId = newInvoice.id;
    sub.nextBillingDate = addCycle(sub.nextBillingDate, plan.billingCycle);
    logAudit('System', 'SUBSCRIPTION_BILLED', `Billed subscription ${sub.id} (${plan.name}) -> invoice ${newInvoice.id} for ₹${total}`);
    return newInvoice;
  }

  function runBillingCycle() {
    const today = new Date().toISOString().slice(0, 10);
    const generated = [];
    state.subscriptions
      .filter(s => s.status === 'ACTIVE' && s.nextBillingDate <= today)
      .forEach(sub => {
        const inv = billSubscriptionOnce(sub);
        if (inv) generated.push(inv);
      });
    if (generated.length > 0) persist();
    return generated;
  }

  // --- Plans ---
  router.get('/subscriptions/plans', (req, res) => res.json(state.plans));

  router.post('/subscriptions/plans', (req, res) => {
    const { name, description = '', amount, billingCycle = 'MONTHLY', taxRate = 18 } = req.body;
    if (!name || !amount) return res.status(400).json({ error: 'Plan name and amount are required.' });
    const newPlan = {
      id: `PLN-${String(nextId('plans')).padStart(3, '0')}`,
      name, description,
      amount: parseFloat(amount),
      billingCycle,
      taxRate: parseFloat(taxRate) || 0,
      isActive: true
    };
    state.plans.push(newPlan);
    logAudit('Admin', 'CREATE_PLAN', `Created plan ${newPlan.id} (${name})`);
    persist();
    res.status(201).json(newPlan);
  });

  router.patch('/subscriptions/plans/:id', (req, res) => {
    const plan = state.plans.find(p => p.id === req.params.id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    if (typeof req.body.isActive === 'boolean') plan.isActive = req.body.isActive;
    logAudit('Admin', 'UPDATE_PLAN', `Updated plan ${plan.id}`);
    persist();
    res.json(plan);
  });

  // --- Coupons & Add-ons ---
  router.get('/subscriptions/coupons', (req, res) => res.json(state.coupons));

  router.post('/subscriptions/coupons', (req, res) => {
    const { code, type = 'PERCENT', value, expiresAt, maxRedemptions = null } = req.body;
    if (!code || !value) return res.status(400).json({ error: 'Coupon code and value are required.' });
    const newCoupon = {
      id: `CPN-${String(nextId('coupons')).padStart(3, '0')}`,
      code: String(code).trim().toUpperCase(),
      type, value: parseFloat(value), isActive: true,
      expiresAt: expiresAt || null, maxRedemptions, timesRedeemed: 0
    };
    state.coupons.push(newCoupon);
    logAudit('Admin', 'CREATE_COUPON', `Created coupon ${newCoupon.code}`);
    persist();
    res.status(201).json(newCoupon);
  });

  router.get('/subscriptions/addons', (req, res) => res.json(state.addOns));

  router.post('/subscriptions/addons', (req, res) => {
    const { name, amount } = req.body;
    if (!name || !amount) return res.status(400).json({ error: 'Add-on name and amount are required.' });
    const newAddOn = { id: `ADD-${String(nextId('addOns')).padStart(3, '0')}`, name, amount: parseFloat(amount) };
    state.addOns.push(newAddOn);
    logAudit('Admin', 'CREATE_ADDON', `Created add-on ${newAddOn.id} (${name})`);
    persist();
    res.status(201).json(newAddOn);
  });

  // --- Subscriptions ---
  router.get('/subscriptions', (req, res) => res.json(state.subscriptions));

  router.post('/subscriptions', (req, res) => {
    const { customerId, planId, couponCode, addOnIds = [] } = req.body;
    const customer = state.customers.find(c => c.id === customerId);
    const plan = state.plans.find(p => p.id === planId);
    if (!customer) return res.status(400).json({ error: 'Valid customerId is required.' });
    if (!plan) return res.status(400).json({ error: 'Valid planId is required.' });

    const today = new Date().toISOString().slice(0, 10);
    const newSub = {
      id: `SUB-${String(nextId('subscriptions')).padStart(3, '0')}`,
      customerId: customer.id,
      customerName: customer.name,
      planId: plan.id,
      planName: plan.name,
      amount: plan.amount,
      couponCode: couponCode || null,
      addOnIds: Array.isArray(addOnIds) ? addOnIds : [],
      startDate: today,
      nextBillingDate: today,
      status: 'ACTIVE',
      lastInvoiceId: null,
      createdAt: new Date().toISOString()
    };
    state.subscriptions.unshift(newSub);
    logAudit('Admin', 'CREATE_SUBSCRIPTION', `Subscribed ${customer.name} to ${plan.name} (${newSub.id})`);
    persist();
    res.status(201).json(newSub);
  });

  function transitionSubscription(req, res, fromStatuses, toStatus, action) {
    const sub = state.subscriptions.find(s => s.id === req.params.id);
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });
    if (!fromStatuses.includes(sub.status)) {
      return res.status(400).json({ error: `Cannot ${action} a subscription that is ${sub.status}.` });
    }
    sub.status = toStatus;
    logAudit('Admin', `SUBSCRIPTION_${action.toUpperCase()}`, `${action[0].toUpperCase()}${action.slice(1)}d subscription ${sub.id}`);
    persist();
    res.json(sub);
  }

  router.post('/subscriptions/:id/pause', (req, res) => transitionSubscription(req, res, ['ACTIVE'], 'PAUSED', 'pause'));
  router.post('/subscriptions/:id/resume', (req, res) => transitionSubscription(req, res, ['PAUSED'], 'ACTIVE', 'resume'));
  router.post('/subscriptions/:id/cancel', (req, res) => transitionSubscription(req, res, ['ACTIVE', 'PAUSED'], 'CANCELLED', 'cancel'));
  router.post('/subscriptions/:id/reactivate', (req, res) => transitionSubscription(req, res, ['CANCELLED'], 'ACTIVE', 'reactivate'));

  function cycleDays(billingCycle) {
    if (billingCycle === 'YEARLY') return 365;
    if (billingCycle === 'QUARTERLY') return 91;
    return 30; // MONTHLY
  }

  // Changes a subscription's plan mid-cycle, prorating the unused portion of
  // the old plan against the new plan's rate for the rest of the current
  // cycle. nextBillingDate is left untouched — the next FULL cycle bills at
  // the new plan's rate from then on.
  router.post('/subscriptions/:id/change-plan', (req, res) => {
    const { newPlanId } = req.body;
    const sub = state.subscriptions.find(s => s.id === req.params.id);
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });
    if (sub.status !== 'ACTIVE') return res.status(400).json({ error: 'Only an ACTIVE subscription can change plan.' });

    const oldPlan = state.plans.find(p => p.id === sub.planId);
    const newPlan = state.plans.find(p => p.id === newPlanId);
    if (!newPlan) return res.status(400).json({ error: 'Valid newPlanId is required.' });

    // The current cycle ends at nextBillingDate, so it started
    // totalDaysInOldCycle before that — more reliable than startDate once a
    // subscription has run through several cycles already.
    const today = new Date();
    const totalDaysInOldCycle = cycleDays(oldPlan ? oldPlan.billingCycle : 'MONTHLY');
    const cycleStart = new Date(new Date(sub.nextBillingDate).getTime() - totalDaysInOldCycle * 86400000);
    const daysElapsed = Math.max(0, Math.min(totalDaysInOldCycle, Math.round((today.getTime() - cycleStart.getTime()) / 86400000)));
    const remainingDays = Math.max(0, totalDaysInOldCycle - daysElapsed);

    const oldDailyRate = oldPlan ? oldPlan.amount / cycleDays(oldPlan.billingCycle) : 0;
    const newDailyRate = newPlan.amount / cycleDays(newPlan.billingCycle);
    const credit = Math.round(oldDailyRate * remainingDays * 100) / 100;
    const charge = Math.round(newDailyRate * remainingDays * 100) / 100;
    const netProration = Math.round((charge - credit) * 100) / 100;

    sub.planId = newPlan.id;
    sub.planName = newPlan.name;
    sub.amount = newPlan.amount;
    logAudit('Admin', 'SUBSCRIPTION_CHANGE_PLAN', `Changed subscription ${sub.id} to plan ${newPlan.name} (net proration ₹${netProration})`);
    persist();
    res.json({ subscription: sub, proration: { remainingDays, credit, charge, netProration } });
  });

  // Dunning: flags unpaid subscription invoices past their due date, once
  // per day per invoice (tracked via lastReminderSentAt), reusing the same
  // dispatch-log shape as the existing customer debt reminders.
  function runDunningCheck() {
    const today = new Date().toISOString().slice(0, 10);
    let flagged = 0;
    state.invoices
      .filter(inv => inv.subscriptionId && inv.status === 'PENDING' && inv.dueDate < today && inv.lastReminderSentAt !== today)
      .forEach(inv => {
        const customer = state.customers.find(c => c.id === inv.customerId);
        state.debtReminders.push({
          id: `REM-${Date.now().toString().slice(-5)}`,
          customerId: inv.customerId,
          customerName: inv.customerName,
          customerPhone: customer ? customer.phone : '',
          channel: 'WHATSAPP',
          outstandingAmount: inv.total,
          paymentLink: inv.paymentLink || null,
          dispatchedAt: new Date().toISOString(),
          status: 'DELIVERED'
        });
        inv.lastReminderSentAt = today;
        flagged++;
      });
    if (flagged > 0) {
      logAudit('System', 'DUNNING_REMINDER', `Sent ${flagged} overdue-subscription-invoice reminder(s)`);
      persist();
    }
    return flagged;
  }

  router.post('/subscriptions/run-dunning-check', (req, res) => res.json({ flaggedCount: runDunningCheck() }));

  // Subscription analytics: MRR, status counts, simple 30-day churn.
  router.get('/subscriptions/analytics', (req, res) => {
    const monthlyEquivalent = (sub) => {
      const plan = state.plans.find(p => p.id === sub.planId);
      const cycle = plan ? plan.billingCycle : 'MONTHLY';
      if (cycle === 'YEARLY') return sub.amount / 12;
      if (cycle === 'QUARTERLY') return sub.amount / 3;
      return sub.amount;
    };

    const active = state.subscriptions.filter(s => s.status === 'ACTIVE');
    const mrr = Math.round(active.reduce((sum, s) => sum + monthlyEquivalent(s), 0) * 100) / 100;

    const statusCounts = { ACTIVE: 0, PAUSED: 0, CANCELLED: 0 };
    state.subscriptions.forEach(s => { statusCounts[s.status] = (statusCounts[s.status] || 0) + 1; });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const activeThirtyDaysAgo = state.subscriptions.filter(s => s.createdAt <= thirtyDaysAgo).length;
    const cancelledLast30Days = state.subscriptions.filter(s => s.status === 'CANCELLED').length; // cancellation dates aren't tracked separately yet
    const churnRate = activeThirtyDaysAgo > 0 ? Math.round((cancelledLast30Days / activeThirtyDaysAgo) * 1000) / 10 : 0;

    res.json({ mrr, statusCounts, churnRate, totalSubscriptions: state.subscriptions.length });
  });

  // Manual trigger (also runs automatically on a schedule below)
  router.post('/subscriptions/run-billing-cycle', (req, res) => {
    const generated = runBillingCycle();
    res.json({ generatedCount: generated.length, invoices: generated });
  });

  // Automatic recurring billing & dunning: check once at startup, then hourly.
  runBillingCycle();
  runDunningCheck();
  setInterval(runDunningCheck, 60 * 60 * 1000);
  setInterval(runBillingCycle, 60 * 60 * 1000);

  // --- 7. CUSTOMERS & CRM ACCOUNTS RECEIVABLE ---
  router.get('/customers', (req, res) => res.json(state.customers));

  router.post('/customers', (req, res) => {
    const { name, phone, email, gstin, address, group, creditLimit } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'Name and phone required' });
    const newCust = {
      id: `CUST-${String(nextId('customers')).padStart(3, '0')}`,
      name,
      phone,
      email: email || '',
      gstin: gstin ? String(gstin).toUpperCase() : '',
      address: address || '',
      group: group || 'Retail',
      outstandingBalance: 0,
      creditLimit: parseFloat(creditLimit) || 25000,
      loyaltyPoints: 0,
      walletBalance: 0,
      loyaltyTier: 'SILVER',
      isCreditFrozen: false
    };
    state.customers.unshift(newCust);
    logAudit('Admin', 'CREATE_CUSTOMER', `Added customer: ${newCust.name}`);
    persist();
    res.status(201).json(newCust);
  });

  // Customer Party Ledger Statement
  router.get('/customers/:id/ledger', (req, res) => {
    const cust = state.customers.find(c => c.id === req.params.id);
    if (!cust) return res.status(404).json({ error: 'Customer not found' });

    const entries = state.customerLedgers.filter(l => l.customerId === cust.id);
    res.json({
      customer: {
        id: cust.id,
        name: cust.name,
        outstandingBalance: cust.outstandingBalance,
        creditLimit: cust.creditLimit,
        isCreditFrozen: cust.isCreditFrozen
      },
      ledger: entries
    });
  });

  // Aging Analysis (0-30, 31-60, 61-90, 90+ days)
  router.get('/customers/:id/aging', (req, res) => {
    const cust = state.customers.find(c => c.id === req.params.id);
    if (!cust) return res.status(404).json({ error: 'Customer not found' });

    const now = Date.now();
    const buckets = {
      current: 0,       // 0 - 30 days
      bucket30to60: 0,  // 31 - 60 days
      bucket61to90: 0,  // 61 - 90 days
      bucketOver90: 0,  // 90+ days
      totalOutstanding: cust.outstandingBalance || 0
    };

    const pendingInvoices = state.invoices.filter(i => i.customerId === cust.id && i.status === 'PENDING');
    pendingInvoices.forEach(inv => {
      const invDate = new Date(inv.date).getTime();
      const ageDays = Math.floor((now - invDate) / 86400000);
      const amt = inv.total || 0;

      if (ageDays <= 30) buckets.current += amt;
      else if (ageDays <= 60) buckets.bucket30to60 += amt;
      else if (ageDays <= 90) buckets.bucket61to90 += amt;
      else buckets.bucketOver90 += amt;
    });

    res.json(buckets);
  });

  // Customer Wallet Top-up
  router.post('/customers/:id/wallet/topup', (req, res) => {
    const { amount, paymentMethod = 'UPI' } = req.body;
    const cust = state.customers.find(c => c.id === req.params.id);
    if (!cust) return res.status(404).json({ error: 'Customer not found' });

    const topupAmt = parseFloat(amount);
    if (!topupAmt || topupAmt <= 0) return res.status(400).json({ error: 'Valid positive topup amount required' });

    cust.walletBalance = (cust.walletBalance || 0) + topupAmt;

    state.customerLedgers.push({
      id: `LED-${Date.now().toString().slice(-5)}`,
      customerId: cust.id,
      date: new Date().toISOString().slice(0, 10),
      type: 'PAYMENT',
      referenceId: `TOPUP-${paymentMethod}`,
      description: `Wallet Deposit (prepaid store balance) via ${paymentMethod}`,
      debit: 0,
      credit: topupAmt,
      runningBalance: cust.outstandingBalance
    });

    logAudit('Admin', 'WALLET_TOPUP', `Credited ₹${topupAmt} to ${cust.name}'s prepaid wallet (New Balance: ₹${cust.walletBalance})`);
    persist();
    res.json({ message: 'Wallet top-up successful', walletBalance: cust.walletBalance });
  });

  // Redeem Customer Loyalty Points
  router.post('/customers/:id/loyalty/redeem', (req, res) => {
    const { pointsToRedeem } = req.body;
    const cust = state.customers.find(c => c.id === req.params.id);
    if (!cust) return res.status(404).json({ error: 'Customer not found' });

    const pts = parseInt(pointsToRedeem, 10);
    if (!pts || pts <= 0 || pts > (cust.loyaltyPoints || 0)) {
      return res.status(400).json({ error: `Invalid points. Available balance: ${cust.loyaltyPoints || 0}` });
    }

    cust.loyaltyPoints -= pts;
    logAudit('Cashier', 'REDEEM_LOYALTY', `Redeemed ${pts} loyalty points for ${cust.name} (Remaining: ${cust.loyaltyPoints})`);
    persist();
    res.json({ success: true, remainingPoints: cust.loyaltyPoints, discountEquivalent: pts });
  });

  // Automated Debt Collection Reminder (WhatsApp / SMS / Email)
  router.post('/customers/:id/send-reminder', (req, res) => {
    const { channel = 'WHATSAPP' } = req.body;
    const cust = state.customers.find(c => c.id === req.params.id);
    if (!cust) return res.status(404).json({ error: 'Customer not found' });

    if (!cust.outstandingBalance || cust.outstandingBalance <= 0) {
      return res.status(400).json({ error: 'Customer has no outstanding balance to collect' });
    }

    const reminder = {
      id: `REM-${Date.now().toString().slice(-5)}`,
      customerId: cust.id,
      customerName: cust.name,
      customerPhone: cust.phone,
      channel,
      outstandingAmount: cust.outstandingBalance,
      paymentLink: `https://pay.ziaenterprise.com/c/${cust.id}?amt=${cust.outstandingBalance}`,
      dispatchedAt: new Date().toISOString(),
      status: 'DELIVERED'
    };

    state.debtReminders.unshift(reminder);
    logAudit('Admin', 'DISPATCH_REMINDER', `Dispatched ${channel} payment reminder to ${cust.name} for ₹${cust.outstandingBalance}`);
    persist();
    res.json({ message: `Payment reminder successfully dispatched via ${channel}`, reminder });
  });

  // --- 8. SUPPLIERS & PURCHASES ---
  router.get('/suppliers', (req, res) => res.json(state.suppliers));

  router.post('/suppliers', (req, res) => {
    const { name, phone, email, gstin, address } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'Supplier name and phone required' });
    const newSup = {
      id: `SUPP-${String(nextId('suppliers')).padStart(3, '0')}`,
      name,
      phone,
      email: email || '',
      gstin: gstin ? String(gstin).toUpperCase() : '',
      address: address || '',
      payables: 0
    };
    state.suppliers.unshift(newSup);
    logAudit('Admin', 'CREATE_SUPPLIER', `Added vendor: ${newSup.name}`);
    persist();
    res.status(201).json(newSup);
  });

  router.get('/purchases', (req, res) => res.json(state.purchases));

  router.post('/purchases', (req, res) => {
    const { supplierId, items, paymentStatus = 'PAID' } = req.body;
    const supplier = state.suppliers.find(s => s.id === supplierId);
    if (!supplier || !items?.length) return res.status(400).json({ error: 'Supplier and items required' });

    let subtotal = 0;
    let taxTotal = 0;
    const processed = items.map(item => {
      const qty = parseInt(item.quantity, 10) || 1;
      const cost = parseFloat(item.unitCost) || 0;
      const rate = parseFloat(item.taxRate) || 18;
      const line = qty * cost;
      subtotal += line;
      taxTotal += line * (rate / 100);

      // Increment product stock
      const prod = state.products.find(p => p.id === item.productId);
      if (prod) {
        prod.stock += qty;
        prod.purchasePrice = cost; // update latest purchase price
      }
      return { ...item, total: line };
    });

    const total = subtotal + taxTotal;
    const newPur = {
      id: `PUR-${new Date().getFullYear()}-${String(nextId('purchases')).padStart(3, '0')}`,
      supplierId: supplier.id,
      supplierName: supplier.name,
      date: new Date().toISOString().slice(0, 10),
      items: processed,
      subtotal,
      tax: taxTotal,
      total,
      status: 'RECEIVED',
      paymentStatus
    };

    if (paymentStatus === 'UNPAID') {
      supplier.payables = (supplier.payables || 0) + total;
    }

    state.purchases.unshift(newPur);
    logAudit('Admin', 'PURCHASE_ENTRY', `Stock Inward ${newPur.id} from ${supplier.name} for ₹${total}`);
    persist();
    res.status(201).json(newPur);
  });

  // --- 8B. PURCHASE ORDERS (PO) & AUTO-REQUISITION ---
  router.get('/purchases/orders', (req, res) => res.json(state.purchaseOrders));

  router.post('/purchases/orders', (req, res) => {
    const { supplierId, branchId, items, expectedDeliveryDate } = req.body;
    const supplier = state.suppliers.find(s => s.id === supplierId) || state.suppliers[0];
    const branch = state.branches.find(b => b.id === branchId) || state.branches[0];

    if (!items || !items.length) return res.status(400).json({ error: 'Line items required for PO' });

    let subtotal = 0;
    let taxTotal = 0;
    const processedItems = items.map(it => {
      const qty = parseInt(it.quantityOrdered, 10) || 1;
      const cost = parseFloat(it.unitCost) || 0;
      const rate = parseFloat(it.taxRate) || 18;
      const lineSub = qty * cost;
      subtotal += lineSub;
      taxTotal += lineSub * (rate / 100);
      return {
        productId: it.productId,
        name: it.name,
        quantityOrdered: qty,
        quantityReceived: 0,
        unitCost: cost,
        taxRate: rate,
        total: lineSub
      };
    });

    const poSeq = nextId('purchaseOrders');
    const newPO = {
      id: `PO-${new Date().getFullYear()}-${String(poSeq).padStart(3, '0')}`,
      poNumber: `PO-${branch.branchCode}-${String(poSeq + 1000)}`,
      supplierId: supplier.id,
      supplierName: supplier.name,
      branchId: branch.id,
      branchName: branch.name,
      orderDate: new Date().toISOString().slice(0, 10),
      expectedDeliveryDate: expectedDeliveryDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      items: processedItems,
      subtotal,
      tax: taxTotal,
      total: subtotal + taxTotal,
      status: 'ISSUED',
      isAutoRequisition: false
    };

    state.purchaseOrders.unshift(newPO);
    logAudit('Storekeeper', 'CREATE_PO', `Issued PO ${newPO.poNumber} to ${supplier.name} for ₹${newPO.total}`);
    persist();
    res.status(201).json(newPO);
  });

  // Automated Requisition Generator based on reorder thresholds (stock <= minStock)
  router.post('/purchases/requisitions/auto-generate', (req, res) => {
    const lowStockItems = state.products.filter(p => p.stock <= p.minStock);
    if (!lowStockItems.length) {
      return res.json({ message: 'All items have healthy stock levels. No requisitions needed.', generatedPOs: [] });
    }

    const defaultSupplier = state.suppliers[0];
    const defaultBranch = state.branches.find(b => b.nodeType === 'CENTRAL_WAREHOUSE') || state.branches[0];

    const poItems = lowStockItems.map(p => {
      const orderQty = Math.max(10, (p.minStock * 2) - p.stock);
      const cost = p.purchasePrice || 100;
      const taxRate = p.taxRate || 18;
      const lineSub = orderQty * cost;
      return {
        productId: p.id,
        name: p.name,
        quantityOrdered: orderQty,
        quantityReceived: 0,
        unitCost: cost,
        taxRate,
        total: lineSub
      };
    });

    const subtotal = poItems.reduce((sum, i) => sum + i.total, 0);
    const tax = Math.round(subtotal * 0.18 * 100) / 100;

    const autoPoSeq = nextId('purchaseOrders');
    const autoPO = {
      id: `PO-${new Date().getFullYear()}-${String(autoPoSeq).padStart(3, '0')}`,
      poNumber: `AUTO-REQ-${String(autoPoSeq + 1000)}`,
      supplierId: defaultSupplier.id,
      supplierName: defaultSupplier.name,
      branchId: defaultBranch.id,
      branchName: defaultBranch.name,
      orderDate: new Date().toISOString().slice(0, 10),
      expectedDeliveryDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
      items: poItems,
      subtotal,
      tax,
      total: subtotal + tax,
      status: 'DRAFT',
      isAutoRequisition: true
    };

    state.purchaseOrders.unshift(autoPO);
    logAudit('System', 'AUTO_REQUISITION', `Auto-generated Purchase Requisition ${autoPO.poNumber} for ${lowStockItems.length} low-stock items`);
    persist();
    res.status(201).json({ message: `Generated auto-requisition for ${lowStockItems.length} items`, autoPO });
  });

  // --- 8C. GOODS RECEIVED NOTE (GRN) & WAREHOUSE INSPECTION ---
  router.get('/purchases/grn', (req, res) => res.json(state.goodsReceivedNotes));

  router.post('/purchases/grn', (req, res) => {
    const { purchaseOrderId, supplierId, branchId, invoiceBillNumber, inspectorName, items, discrepancyNotes } = req.body;
    if (!items || !items.length) return res.status(400).json({ error: 'Inspection line items required' });

    const po = state.purchaseOrders.find(p => p.id === purchaseOrderId);
    const supplier = state.suppliers.find(s => s.id === supplierId) || (po ? state.suppliers.find(s => s.id === po.supplierId) : state.suppliers[0]);
    const branch = state.branches.find(b => b.id === branchId) || state.branches[0];

    let totalAcceptedValue = 0;
    let hasDiscrepancy = false;

    const processedItems = items.map(it => {
      const ord = parseInt(it.orderedQty, 10) || 0;
      const rec = parseInt(it.receivedQty, 10) || 0;
      const dmg = parseInt(it.damagedQty, 10) || 0;
      const shrt = Math.max(0, ord - rec);
      const accepted = Math.max(0, rec - dmg);
      const cost = parseFloat(it.unitCost) || 0;

      if (dmg > 0 || shrt > 0) hasDiscrepancy = true;
      totalAcceptedValue += accepted * cost;

      // Update warehouse physical stock ONLY for accepted goods
      const prod = state.products.find(p => p.id === it.productId);
      if (prod) {
        prod.stock += accepted;
        prod.purchasePrice = cost;
      }

      // If damaged goods, log to RMA buffer
      if (dmg > 0 && prod) {
        state.rmaRecords.push({
          id: `RMA-${Date.now().toString().slice(-4)}`,
          branchId: branch.id,
          branchName: branch.name,
          itemId: prod.id,
          itemName: prod.name,
          serialOrImei: '',
          reason: 'TRANSIT_DAMAGE',
          action: 'RETURN_TO_VENDOR',
          reportedDate: new Date().toISOString().slice(0, 10),
          status: 'PENDING',
          costLoss: dmg * cost,
          notes: `Damaged during inward GRN shipment against ${invoiceBillNumber || 'PO'}`
        });
      }

      return {
        productId: it.productId,
        name: it.name,
        orderedQty: ord,
        receivedQty: rec,
        shortageQty: shrt,
        damagedQty: dmg,
        acceptedQty: accepted,
        unitCost: cost
      };
    });

    const newGRN = {
      id: `GRN-${new Date().getFullYear()}-${String(nextId('goodsReceivedNotes')).padStart(3, '0')}`,
      grnNumber: `GRN-${branch.branchCode}-${String(state.goodsReceivedNotes.length + 8001)}`,
      purchaseOrderId: po ? po.id : null,
      supplierId: supplier.id,
      supplierName: supplier.name,
      branchId: branch.id,
      branchName: branch.name,
      receivedDate: new Date().toISOString().slice(0, 10),
      inspectorName: inspectorName || 'Warehouse Inspector',
      items: processedItems,
      invoiceBillNumber: invoiceBillNumber || '',
      totalAcceptedValue,
      discrepancyNotes: discrepancyNotes || '',
      status: hasDiscrepancy ? 'ACCEPTED_WITH_DISCREPANCY' : 'ACCEPTED'
    };

    if (po) {
      po.status = 'FULFILLED';
    }

    // Add Accounts Payable (A/P) schedule
    state.apSchedules.push({
      id: `AP-${Date.now().toString().slice(-5)}`,
      supplierId: supplier.id,
      supplierName: supplier.name,
      purchaseBillId: newGRN.grnNumber,
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      amountDue: totalAcceptedValue,
      amountPaid: 0,
      status: 'PENDING'
    });
    supplier.payables = (supplier.payables || 0) + totalAcceptedValue;

    state.goodsReceivedNotes.unshift(newGRN);
    logAudit(inspectorName || 'Storekeeper', 'INWARD_GRN', `Completed GRN ${newGRN.grnNumber}: Accepted Value ₹${totalAcceptedValue} (Status: ${newGRN.status})`);
    persist();
    res.status(201).json(newGRN);
  });

  // --- 8D. ACCOUNTS PAYABLE (A/P) SCHEDULES & PAYMENTS ---
  router.get('/purchases/ap-schedule', (req, res) => res.json(state.apSchedules));

  router.post('/purchases/ap-schedule/:id/pay', (req, res) => {
    const { amountPaid, paymentMethod = 'Bank Transfer' } = req.body;
    const ap = state.apSchedules.find(a => a.id === req.params.id);
    if (!ap) return res.status(404).json({ error: 'A/P schedule not found' });

    const payAmt = parseFloat(amountPaid) || ap.amountDue;
    ap.amountPaid = (ap.amountPaid || 0) + payAmt;
    ap.amountDue = Math.max(0, ap.amountDue - payAmt);
    if (ap.amountDue === 0) ap.status = 'PAID';

    const supplier = state.suppliers.find(s => s.id === ap.supplierId);
    if (supplier) {
      supplier.payables = Math.max(0, (supplier.payables || 0) - payAmt);
    }

    logAudit('Admin', 'AP_PAYMENT', `Paid ₹${payAmt} to ${ap.supplierName} for ${ap.purchaseBillId} (${paymentMethod})`);
    persist();
    res.json({ message: 'Payment recorded successfully', apSchedule: ap });
  });

  // --- 8E. E-TAX COMPLIANCE: E-INVOICE (IRN) & E-WAY BILLS ---
  const crypto = require('crypto');

  router.post('/etax/e-invoice/generate-irn', (req, res) => {
    const { invoiceId } = req.body;
    const inv = state.invoices.find(i => i.id === invoiceId);
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });

    // Check plan entitlement feature flag
    if (!state.entitlement.features.eInvoicing) {
      return res.status(403).json({ error: 'E-Invoicing is not enabled on your subscription tier. Upgrade to Multi-Branch or National.' });
    }

    // Generate statutory 64-char hex IRN hash: SHA256(SupplierGSTIN + DocType + DocNum + FinYear)
    const rawPayload = `${state.companySettings.gstin || '29ABCDE1234F1Z5'}|INV|${inv.id}|2026-27`;
    const irnHash = crypto.createHash('sha256').update(rawPayload).digest('hex');
    const ackNo = `1226${Date.now().toString().slice(-10)}`;
    const ackDate = new Date().toISOString();
    const qrPayload = `IRN:${irnHash}|ACK:${ackNo}|DT:${ackDate}|TOT:${inv.total}|TAX:${inv.tax}`;

    inv.irnHash = irnHash;
    inv.irnQrCode = qrPayload;
    inv.irnAckNo = ackNo;
    inv.irnAckDate = ackDate;

    logAudit('System', 'GENERATE_IRN', `Generated IRP E-Invoice IRN for ${inv.id}: ${irnHash.slice(0, 12)}...`);
    persist();
    res.json({
      success: true,
      invoiceId: inv.id,
      irn: irnHash,
      ackNo,
      ackDate,
      qrCodePayload: qrPayload
    });
  });

  router.post('/etax/e-way-bill/generate', (req, res) => {
    const { documentType = 'INVOICE', docReferenceNo, transporterName, vehicleNumber } = req.body;
    
    let totalVal = 0;
    if (documentType === 'INVOICE') {
      const inv = state.invoices.find(i => i.id === docReferenceNo);
      if (inv) totalVal = inv.total;
    } else {
      const stn = state.stockTransfers.find(s => s.id === docReferenceNo || s.stnNumber === docReferenceNo);
      if (stn) totalVal = stn.totalValuation;
    }

    const ewbNumber = `29${Date.now().toString().slice(-10)}`;
    const newEWB = {
      id: `EWB-${Date.now().toString().slice(-4)}`,
      ewbNumber,
      documentType,
      docReferenceNo,
      sourceGstin: state.companySettings.gstin || '29ABCDE1234F1Z5',
      destGstin: '29AAACH7409R1ZZ',
      transporterName: transporterName || 'Standard Surface Logistics',
      vehicleNumber: vehicleNumber || 'KA-05-AB-1234',
      validUpto: new Date(Date.now() + 3 * 86400000).toISOString(),
      totalValue: totalVal || 55000,
      status: 'GENERATED'
    };

    state.eWayBills.unshift(newEWB);
    logAudit('Admin', 'GENERATE_EWAY_BILL', `Generated E-Way Bill ${ewbNumber} for ${docReferenceNo} (Value: ₹${newEWB.totalValue})`);
    persist();
    res.status(201).json(newEWB);
  });

  // GSTR-1 Return Summary (B2B, B2CS, and HSN Table)
  router.get('/etax/gstr1', (req, res) => {
    const period = req.query.period || '2026-10';
    let b2bCount = 0, b2bTaxableValue = 0, b2bTaxTotal = 0;
    let b2cCount = 0, b2cTaxableValue = 0, b2cTaxTotal = 0;
    const hsnMap = new Map();

    state.invoices.forEach(inv => {
      if (inv.customerGstin && inv.customerGstin.length === 15) {
        b2bCount++;
        b2bTaxableValue += inv.subtotal;
        b2bTaxTotal += inv.tax;
      } else {
        b2cCount++;
        b2cTaxableValue += inv.subtotal;
        b2cTaxTotal += inv.tax;
      }

      inv.items?.forEach(it => {
        const hsn = it.hsnCode || '8471';
        const existing = hsnMap.get(hsn) || { hsnCode: hsn, description: it.name, qty: 0, taxableValue: 0, taxAmount: 0 };
        existing.qty += (it.quantity || 1);
        existing.taxableValue += (it.unitPrice * (it.quantity || 1));
        existing.taxAmount += ((it.unitPrice * (it.quantity || 1)) * ((it.taxRate || 18) / 100));
        hsnMap.set(hsn, existing);
      });
    });

    res.json({
      period,
      b2bCount,
      b2bTaxableValue: Math.round(b2bTaxableValue * 100) / 100,
      b2bTaxTotal: Math.round(b2bTaxTotal * 100) / 100,
      b2cCount,
      b2cTaxableValue: Math.round(b2cTaxableValue * 100) / 100,
      b2cTaxTotal: Math.round(b2cTaxTotal * 100) / 100,
      hsnSummary: Array.from(hsnMap.values())
    });
  });

  // GSTR-3B Return Summary (Outward Supplies vs Inward Eligible ITC)
  router.get('/etax/gstr3b', (req, res) => {
    const period = req.query.period || '2026-10';
    const totalSales = state.invoices.reduce((sum, i) => sum + i.subtotal, 0);
    const totalOutputTax = state.invoices.reduce((sum, i) => sum + i.tax, 0);

    const totalInwardPurchases = state.purchases.reduce((sum, p) => sum + p.subtotal, 0);
    const totalITC = state.purchases.reduce((sum, p) => sum + p.tax, 0);

    const netTaxPayable = Math.max(0, totalOutputTax - totalITC);

    res.json({
      period,
      outwardTaxableSupplies: totalSales,
      igstPayable: Math.round(totalOutputTax * 0.2 * 100) / 100,
      cgstPayable: Math.round(totalOutputTax * 0.4 * 100) / 100,
      sgstPayable: Math.round(totalOutputTax * 0.4 * 100) / 100,
      eligibleITC: {
        itcIgst: Math.round(totalITC * 0.2 * 100) / 100,
        itcCgst: Math.round(totalITC * 0.4 * 100) / 100,
        itcSgst: Math.round(totalITC * 0.4 * 100) / 100
      },
      netTaxPayable: Math.round(netTaxPayable * 100) / 100
    });
  });

  // --- 8F. EXECUTIVE ANALYTICS: BRANCH RANKINGS, COGS & ASC 606 ---
  // Branch Financial Rankings
  router.get('/reports/branch-rankings', (req, res) => {
    const rankings = state.branches.map(b => {
      const branchInvoices = state.invoices.filter(i => i.branchId === b.id || (!i.branchId && b.nodeType === 'HEAD_OFFICE'));
      const totalRev = branchInvoices.reduce((sum, i) => sum + (i.status === 'PAID' ? i.total : 0), 0);
      const approxCogs = totalRev * 0.65; // 65% average cost
      const grossMargin = totalRev - approxCogs;
      const grossMarginPercent = totalRev > 0 ? Math.round((grossMargin / totalRev) * 1000) / 10 : 0;
      const netMargin = Math.round(grossMargin * 0.7 * 100) / 100;

      return {
        branchId: b.id,
        branchName: b.name,
        branchCode: b.branchCode,
        totalRevenue: Math.round(totalRev * 100) / 100,
        grossMarginPercent,
        netMargin,
        invoicesCount: branchInvoices.length
      };
    });

    // Sort descending by revenue and assign ranks
    rankings.sort((a, b) => b.totalRevenue - a.totalRevenue);
    rankings.forEach((r, idx) => { r.rank = idx + 1; });

    res.json(rankings);
  });

  // Real-Time COGS Valuation (FIFO & Weighted Average)
  router.get('/reports/cogs-valuation', (req, res) => {
    let totalValuationFIFO = 0;
    let totalValuationWeighted = 0;

    const itemValuations = state.products.map(p => {
      const stock = p.stock || 0;
      const fifoUnitCost = p.purchasePrice || 0;
      const weightedUnitCost = Math.round((p.purchasePrice * 0.98) * 100) / 100; // Historical batch blended
      const fifoTotal = stock * fifoUnitCost;
      const weightedTotal = stock * weightedUnitCost;

      totalValuationFIFO += fifoTotal;
      totalValuationWeighted += weightedTotal;

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        classification: p.classification || 'FINISHED_GOOD',
        stock,
        fifoUnitCost,
        weightedUnitCost,
        fifoValuation: fifoTotal,
        weightedValuation: weightedTotal
      };
    });

    res.json({
      totalValuationFIFO: Math.round(totalValuationFIFO * 100) / 100,
      totalValuationWeighted: Math.round(totalValuationWeighted * 100) / 100,
      items: itemValuations
    });
  });

  // ASC 606 / IFRS 15 Revenue Recognition Schedule
  router.get('/reports/asc606', (req, res) => {
    res.json(state.asc606Schedules);
  });

  // --- 8G. ADVANCED DOUBLE-ENTRY ACCOUNTING & GENERAL LEDGER ---
  
  // 1. Chart of Accounts (COA)
  router.get('/accounting/chart-of-accounts', (req, res) => {
    res.json(state.chartOfAccounts);
  });

  router.post('/accounting/chart-of-accounts', (req, res) => {
    const { accountCode, accountName, category, normalBalance, description } = req.body;
    if (!accountCode || !accountName || !category) {
      return res.status(400).json({ error: 'accountCode, accountName, and category are required' });
    }
    const exists = state.chartOfAccounts.find(a => a.accountCode === accountCode);
    if (exists) return res.status(400).json({ error: 'Account code already exists' });

    const newAcc = {
      accountCode,
      accountName,
      category,
      normalBalance: normalBalance || (['ASSET', 'EXPENSE'].includes(category) ? 'DEBIT' : 'CREDIT'),
      currentBalance: 0,
      description: description || '',
      isSystemAccount: false
    };

    state.chartOfAccounts.push(newAcc);
    logAudit('Admin', 'CREATE_ACCOUNT', `Added account ${accountCode} - ${accountName} (${category})`);
    persist();
    res.status(201).json(newAcc);
  });

  // 2. General Ledger Journal Entries
  router.get('/accounting/journal-entries', (req, res) => {
    const { branchId, referenceType } = req.query;
    let list = state.journalEntries;
    if (branchId) list = list.filter(j => j.branchId === branchId);
    if (referenceType) list = list.filter(j => j.referenceType === referenceType);
    res.json(list);
  });

  // Post Manual or Automated Double-Entry Journal Voucher
  router.post('/accounting/journal-entries', (req, res) => {
    const { date, referenceType = 'MANUAL_JOURNAL', referenceId, branchId, narration, lines } = req.body;
    if (!lines || lines.length < 2) {
      return res.status(400).json({ error: 'Journal voucher must have at least 2 lines (debit and credit)' });
    }

    let totalDebit = 0;
    let totalCredit = 0;
    lines.forEach(l => {
      totalDebit += parseFloat(l.debit) || 0;
      totalCredit += parseFloat(l.credit) || 0;
    });

    totalDebit = Math.round(totalDebit * 100) / 100;
    totalCredit = Math.round(totalCredit * 100) / 100;

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return res.status(400).json({
        error: 'UNBALANCED_JOURNAL_ENTRY',
        message: `Total Debits (₹${totalDebit}) must equal Total Credits (₹${totalCredit}). Variance: ₹${Math.abs(totalDebit - totalCredit)}`
      });
    }

    const branch = state.branches.find(b => b.id === branchId) || state.branches[0];
    const newJV = {
      id: `JV-${Date.now().toString().slice(-6)}`,
      voucherNumber: `JV-${branch.branchCode}-${String(state.journalEntries.length + 1001)}`,
      date: date || new Date().toISOString().slice(0, 10),
      referenceType,
      referenceId: referenceId || `REF-${Date.now().toString().slice(-4)}`,
      branchId: branch.id,
      branchName: branch.name,
      narration: narration || 'General Journal Entry',
      lines: lines.map(l => ({
        accountCode: l.accountCode,
        accountName: l.accountName || (state.chartOfAccounts.find(a => a.accountCode === l.accountCode)?.accountName || 'General Account'),
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
        note: l.note || ''
      })),
      totalDebit,
      totalCredit,
      isBalanced: true,
      postedBy: req.body.postedBy || 'Admin',
      createdAt: new Date().toISOString()
    };

    // Update account balances in Chart of Accounts
    newJV.lines.forEach(l => {
      const acc = state.chartOfAccounts.find(a => a.accountCode === l.accountCode);
      if (acc) {
        if (acc.normalBalance === 'DEBIT') {
          acc.currentBalance += (l.debit - l.credit);
        } else {
          acc.currentBalance += (l.credit - l.debit);
        }
      }
    });

    state.journalEntries.unshift(newJV);
    logAudit('Admin', 'POST_JOURNAL_VOUCHER', `Posted balanced JV ${newJV.voucherNumber} for ₹${totalDebit}`);
    persist();
    res.status(201).json(newJV);
  });

  // 3. Trial Balance Statement
  router.get('/accounting/trial-balance', (req, res) => {
    let totalDebitSum = 0;
    let totalCreditSum = 0;

    const rows = state.chartOfAccounts.map(a => {
      let debitBal = 0;
      let creditBal = 0;
      if (a.normalBalance === 'DEBIT') {
        debitBal = a.currentBalance >= 0 ? a.currentBalance : 0;
        creditBal = a.currentBalance < 0 ? Math.abs(a.currentBalance) : 0;
      } else {
        creditBal = a.currentBalance >= 0 ? a.currentBalance : 0;
        debitBal = a.currentBalance < 0 ? Math.abs(a.currentBalance) : 0;
      }
      totalDebitSum += debitBal;
      totalCreditSum += creditBal;

      return {
        accountCode: a.accountCode,
        accountName: a.accountName,
        category: a.category,
        debitBalance: Math.round(debitBal * 100) / 100,
        creditBalance: Math.round(creditBal * 100) / 100
      };
    });

    res.json({
      asOfDate: new Date().toISOString().slice(0, 10),
      totalDebits: Math.round(totalDebitSum * 100) / 100,
      totalCredits: Math.round(totalCreditSum * 100) / 100,
      isBalanced: Math.abs(totalDebitSum - totalCreditSum) < 1,
      rows
    });
  });

  // 4. Balance Sheet (Assets = Liabilities + Equity)
  router.get('/accounting/balance-sheet', (req, res) => {
    const assets = state.chartOfAccounts.filter(a => a.category === 'ASSET');
    const liabilities = state.chartOfAccounts.filter(a => a.category === 'LIABILITY');
    const equity = state.chartOfAccounts.filter(a => a.category === 'EQUITY');

    const totalAssets = assets.reduce((sum, a) => sum + a.currentBalance, 0);
    const totalLiabilities = liabilities.reduce((sum, a) => sum + a.currentBalance, 0);
    const totalEquity = equity.reduce((sum, a) => sum + a.currentBalance, 0);

    res.json({
      asOfDate: new Date().toISOString().slice(0, 10),
      assets: {
        items: assets.map(a => ({ code: a.accountCode, name: a.accountName, balance: a.currentBalance })),
        totalAssets: Math.round(totalAssets * 100) / 100
      },
      liabilities: {
        items: liabilities.map(a => ({ code: a.accountCode, name: a.accountName, balance: a.currentBalance })),
        totalLiabilities: Math.round(totalLiabilities * 100) / 100
      },
      equity: {
        items: equity.map(a => ({ code: a.accountCode, name: a.accountName, balance: a.currentBalance })),
        totalEquity: Math.round(totalEquity * 100) / 100
      },
      isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1,
      accountingEquation: `Assets (₹${totalAssets.toFixed(2)}) = Liabilities (₹${totalLiabilities.toFixed(2)}) + Equity (₹${totalEquity.toFixed(2)})`
    });
  });

  // --- 9. EXPENSES ---
  router.get('/expenses', (req, res) => res.json(state.expenses));
  router.get('/expenses/categories', (req, res) => res.json(state.expenseCategories));

  router.post('/expenses', (req, res) => {
    const { category, amount, paymentMethod = 'Cash', paidTo, note } = req.body;
    if (!category || !amount) return res.status(400).json({ error: 'Category and amount required.' });

    const newExp = {
      id: `EXP-${Date.now().toString().slice(-4)}`,
      category,
      amount: parseFloat(amount) || 0,
      paymentMethod,
      date: new Date().toISOString().slice(0, 10),
      paidTo: paidTo || 'Vendor',
      note: note || ''
    };
    state.expenses.unshift(newExp);
    logAudit('Admin', 'EXPENSE_ENTRY', `Recorded expense ₹${newExp.amount} for ${newExp.category}`);
    persist();
    res.status(201).json(newExp);
  });

  // --- 10. REPORTS & ANALYTICS ---
  router.get('/reports/summary', (req, res) => {
    const totalSales = state.invoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.total, 0);
    const totalPurchases = state.purchases.reduce((sum, p) => sum + p.total, 0);
    const totalExpenses = state.expenses.reduce((sum, e) => sum + e.amount, 0);

    // Approximate Cost of Goods Sold (COGS)
    let cogs = 0;
    state.invoices.forEach(inv => {
      inv.items?.forEach(item => {
        const prod = state.products.find(p => p.id === item.id || p.name === item.name);
        if (prod) cogs += (prod.purchasePrice || 0) * (item.quantity || 1);
      });
    });

    const grossProfit = Math.max(0, totalSales - cogs);
    const netProfit = grossProfit - totalExpenses;

    res.json({
      totalSales,
      cogs,
      grossProfit,
      totalExpenses,
      netProfit,
      totalReceivables: state.customers.reduce((sum, c) => sum + (c.outstandingBalance || 0), 0),
      totalPayables: state.suppliers.reduce((sum, s) => sum + (s.payables || 0), 0),
      totalStockValuation: state.products.reduce((sum, p) => sum + (p.purchasePrice * p.stock), 0)
    });
  });

  // --- 11. ADMINISTRATION, SETTINGS & MULTI-COUNTRY LOCALIZATION ---
  router.get('/settings/company', (req, res) => res.json(state.companySettings));

  router.post('/settings/company', (req, res) => {
    state.companySettings = { ...state.companySettings, ...req.body };
    logAudit('Admin', 'UPDATE_SETTINGS', 'Updated company profile, localization, and tax settings');
    persist();
    res.json(state.companySettings);
  });

  // Country Profile Switcher (e.g. India GST vs UAE VAT)
  router.get('/localization/countries', (req, res) => {
    res.json(state.countryConfigs);
  });

  router.post('/localization/switch-country', (req, res) => {
    const { countryCode } = req.body;
    if (!state.countryConfigs[countryCode]) {
      return res.status(400).json({ error: `Unsupported country code: ${countryCode}. Choose 'IN' or 'AE'` });
    }

    const cfg = state.countryConfigs[countryCode];
    state.companySettings.countryCode = cfg.countryCode;
    state.companySettings.currency = cfg.currency;
    state.companySettings.currencySymbol = cfg.currencySymbol;
    state.companySettings.timezone = cfg.timezone;
    state.companySettings.taxSystem = cfg.taxSystem;
    state.companySettings.taxRegistrationLabel = cfg.taxRegistrationLabel;
    state.companySettings.isRTL = cfg.supportsRTL;

    logAudit('Admin', 'SWITCH_COUNTRY_LOCALE', `Switched active country to ${cfg.countryName} (${cfg.currency}, ${cfg.timezone}, ${cfg.taxSystem})`);
    persist();
    res.json({
      message: `Active country successfully switched to ${cfg.countryName}`,
      companySettings: state.companySettings,
      countryConfig: cfg
    });
  });

  // Localized Time Endpoint
  router.get('/localization/current-time', (req, res) => {
    const tz = state.companySettings.timezone || 'Asia/Kolkata';
    const now = new Date();
    const formatted = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(now);

    res.json({
      iso: now.toISOString(),
      timezone: tz,
      localizedTime: formatted,
      countryCode: state.companySettings.countryCode
    });
  });

  // --- 11B. SYSTEM MODULE REGISTRY (ADMIN ADD / REMOVE / TOGGLE) ---
  router.get('/admin/modules', (req, res) => {
    res.json(state.systemModules);
  });

  // Toggle Module Status (Enable / Disable)
  router.patch('/admin/modules/:id/toggle', (req, res) => {
    const mod = state.systemModules.find(m => m.id === req.params.id);
    if (!mod) return res.status(404).json({ error: 'Module not found in registry' });

    if (mod.isRemovable === false && req.body.isEnabled === false) {
      return res.status(403).json({ error: `Core module '${mod.name}' cannot be disabled as it is required by the POS kernel.` });
    }

    mod.isEnabled = req.body.isEnabled !== undefined ? !!req.body.isEnabled : !mod.isEnabled;
    logAudit('Admin', 'TOGGLE_MODULE', `${mod.isEnabled ? 'Enabled' : 'Disabled'} system module: ${mod.name}`);
    persist();
    res.json({ message: `Module '${mod.name}' is now ${mod.isEnabled ? 'ENABLED' : 'DISABLED'}`, module: mod });
  });

  // Add Custom Module to Registry
  router.post('/admin/modules', (req, res) => {
    const { id, name, category, description, iconName } = req.body;
    if (!id || !name) return res.status(400).json({ error: 'id and name are required' });

    const exists = state.systemModules.find(m => m.id === id);
    if (exists) return res.status(400).json({ error: 'Module ID already exists in registry' });

    const newMod = {
      id: String(id).toLowerCase().replace(/\s+/g, '_'),
      name,
      category: category || 'OPERATIONS',
      description: description || '',
      isEnabled: true,
      isRemovable: true,
      iconName: iconName || 'Boxes'
    };

    state.systemModules.push(newMod);
    logAudit('Admin', 'INSTALL_MODULE', `Installed new system module: ${name} (${newMod.id})`);
    persist();
    res.status(201).json(newMod);
  });

  // Remove Custom Module
  router.delete('/admin/modules/:id', (req, res) => {
    const mod = state.systemModules.find(m => m.id === req.params.id);
    if (!mod) return res.status(404).json({ error: 'Module not found' });
    if (!mod.isRemovable) return res.status(403).json({ error: `Cannot delete protected core module '${mod.name}'.` });

    state.systemModules = state.systemModules.filter(m => m.id !== req.params.id);
    logAudit('Admin', 'UNINSTALL_MODULE', `Uninstalled system module: ${mod.name}`);
    persist();
    res.json({ message: `Successfully uninstalled module '${mod.name}'` });
  });

  // --- 11C. MULTI-CHANNEL MARKETING MODULES ---
  // 1. Marketing Campaigns (WhatsApp, Email, Facebook)
  router.get('/marketing/campaigns', (req, res) => {
    const { channel } = req.query;
    let list = state.marketingCampaigns;
    if (channel) list = list.filter(c => c.channel === String(channel).toUpperCase());
    res.json(list);
  });

  router.post('/marketing/campaigns', (req, res) => {
    const { channel, title, subjectOrHeadline, bodyContent, targetAudience = 'ALL_CUSTOMERS', budgetOrCost } = req.body;
    if (!channel || !title || !bodyContent) {
      return res.status(400).json({ error: 'channel, title, and bodyContent are required' });
    }

    // Verify if marketing module is enabled
    const modKey = channel.toLowerCase() + '_marketing';
    const mod = state.systemModules.find(m => m.id === modKey);
    if (mod && !mod.isEnabled) {
      return res.status(403).json({ error: `${channel} marketing module is currently disabled by Admin. Enable it in Admin Modules to broadcast.` });
    }

    // Calculate recipient count from customer CRM list
    let recipientCount = state.customers.length;
    if (targetAudience === 'WHOLESALE_ONLY') {
      recipientCount = state.customers.filter(c => c.group === 'Wholesale').length;
    } else if (targetAudience === 'RETAIL_ONLY') {
      recipientCount = state.customers.filter(c => c.group === 'Retail').length;
    } else if (targetAudience === 'OVERDUE_CUSTOMERS') {
      recipientCount = state.customers.filter(c => (c.outstandingBalance || 0) > 0).length;
    }

    const newCamp = {
      id: `MKT-${channel.slice(0, 2)}-${Date.now().toString().slice(-5)}`,
      channel: channel.toUpperCase(),
      title,
      subjectOrHeadline: subjectOrHeadline || '',
      bodyContent,
      targetAudience,
      recipientCount,
      deliveredCount: recipientCount,
      clickedCount: Math.round(recipientCount * 0.35),
      conversionCount: Math.round(recipientCount * 0.08),
      status: 'RUNNING',
      budgetOrCost: parseFloat(budgetOrCost) || 0,
      createdAt: new Date().toISOString()
    };

    state.marketingCampaigns.unshift(newCamp);
    logAudit('Admin', 'LAUNCH_CAMPAIGN', `Launched ${channel} campaign: "${title}" to ${recipientCount} recipients`);
    persist();
    res.status(201).json(newCamp);
  });

  // 2. WhatsApp Templates API
  router.get('/marketing/whatsapp/templates', (req, res) => {
    res.json(state.whatsappTemplates);
  });

  router.post('/marketing/whatsapp/templates', (req, res) => {
    const { templateName, category = 'MARKETING', language = 'en', bodyText, variables } = req.body;
    if (!templateName || !bodyText) return res.status(400).json({ error: 'templateName and bodyText required' });

    const newTpl = {
      id: `WAT-${Date.now().toString().slice(-4)}`,
      templateName: String(templateName).toLowerCase().replace(/\s+/g, '_'),
      category,
      language,
      status: 'APPROVED',
      bodyText,
      variables: variables || []
    };

    state.whatsappTemplates.push(newTpl);
    logAudit('Admin', 'CREATE_WA_TEMPLATE', `Registered WhatsApp Cloud API template: ${newTpl.templateName}`);
    persist();
    res.status(201).json(newTpl);
  });

  // 3. Facebook Catalog Feed & Product Sync API
  router.get('/marketing/facebook/sync-status', (req, res) => {
    res.json(state.facebookSyncSettings);
  });

  router.post('/marketing/facebook/sync-catalog', (req, res) => {
    // Generate Meta Catalog Feed JSON/CSV format
    const catalogProducts = state.products.map(p => ({
      id: p.id,
      title: p.name,
      description: `${p.name} - SKU: ${p.sku}`,
      availability: p.stock > 0 ? 'in stock' : 'out of stock',
      condition: 'new',
      price: `${p.sellingPrice} ${state.companySettings.currency || 'INR'}`,
      link: `https://shop.ziaenterprise.com/product/${p.id}`,
      image_link: `https://shop.ziaenterprise.com/assets/${p.id}.jpg`,
      brand: p.brand
    }));

    state.facebookSyncSettings.productsSynced = catalogProducts.length;
    state.facebookSyncSettings.lastSyncAt = new Date().toISOString();
    state.facebookSyncSettings.syncStatus = 'SUCCESS';

    logAudit('Admin', 'FB_CATALOG_SYNC', `Synchronized ${catalogProducts.length} catalog items to Facebook Commerce Manager`);
    persist();
    res.json({
      message: `Successfully synchronized ${catalogProducts.length} items to Facebook Commerce Catalog`,
      syncSettings: state.facebookSyncSettings,
      sampleFeed: catalogProducts.slice(0, 3)
    });
  });

  // --- 11D. WEBSITE VISITOR TRACKING & LEAD GENERATION MODULE ---

  // 1. Ingest Web Traffic Pixel Event
  router.post('/lead-generation/track-visitor', (req, res) => {
    // Check if lead generation module is enabled
    const leadMod = state.systemModules.find(m => m.id === 'lead_generation');
    if (leadMod && !leadMod.isEnabled) {
      return res.status(403).json({ error: 'Lead generation tracking module is disabled by Admin.' });
    }

    const { ipAddress, pageUrl, referralUrl, browser, operatingSystem, deviceType, city, country } = req.body;
    const ip = ipAddress || req.ip || '127.0.0.1';

    let visitor = state.websiteVisitors.find(v => v.ipAddress === ip);
    if (visitor) {
      visitor.pageViews += 1;
      if (!visitor.visitedPages.includes(pageUrl)) visitor.visitedPages.push(pageUrl);
      visitor.lastActiveAt = new Date().toISOString();
      visitor.durationSeconds += 30;
    } else {
      visitor = {
        id: `VIS-${Date.now().toString().slice(-4)}`,
        ipAddress: ip,
        city: city || (state.companySettings.countryCode === 'AE' ? 'Dubai' : 'Bengaluru'),
        country: country || (state.companySettings.countryCode === 'AE' ? 'United Arab Emirates' : 'India'),
        browser: browser || 'Chrome',
        operatingSystem: operatingSystem || 'Windows',
        deviceType: deviceType || 'DESKTOP',
        pageViews: 1,
        visitedPages: [pageUrl || '/home'],
        referralUrl: referralUrl || 'direct',
        firstSeenAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        durationSeconds: 30,
        isIdentified: false
      };
      state.websiteVisitors.unshift(visitor);
    }

    persist();
    res.status(200).json({ status: 'ok', visitorId: visitor.id });
  });

  // 2. Query Live Website Visitors
  router.get('/lead-generation/visitors', (req, res) => {
    res.json(state.websiteVisitors);
  });

  // 3. Query Captured Inbound Leads
  router.get('/lead-generation/leads', (req, res) => {
    const { status, source } = req.query;
    let list = state.websiteLeads;
    if (status) list = list.filter(l => l.status === status);
    if (source) list = list.filter(l => l.source === source);
    res.json(list);
  });

  // 4. Capture Website Lead (Web Form / Live Chat / Quote Request)
  router.post('/lead-generation/leads', (req, res) => {
    const { name, phone, email, companyName, interestCategory, capturedFormName, source = 'ORGANIC_SEARCH', ipAddress, city, country } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'Lead name and phone are required' });

    // Link to visitor record if IP matches
    const visitor = state.websiteVisitors.find(v => v.ipAddress === (ipAddress || '106.51.78.14'));
    const browsingDepth = visitor ? visitor.pageViews : 1;
    const computedScore = Math.min(100, 50 + (browsingDepth * 8) + (companyName ? 15 : 5));

    const newLead = {
      id: `LEAD-${Date.now().toString().slice(-4)}`,
      visitorId: visitor ? visitor.id : null,
      name,
      phone,
      email: email || '',
      companyName: companyName || '',
      interestCategory: interestCategory || 'Billing & Hardware Inquiry',
      capturedFormName: capturedFormName || 'Website Contact / Quote Form',
      source,
      ipAddress: ipAddress || (visitor ? visitor.ipAddress : req.ip || '127.0.0.1'),
      city: city || (visitor ? visitor.city : 'Bengaluru'),
      country: country || (visitor ? visitor.country : 'India'),
      leadScore: computedScore,
      status: 'NEW',
      notes: req.body.notes || 'Inbound website visitor submitted contact form.',
      createdAt: new Date().toISOString()
    };

    if (visitor) {
      visitor.isIdentified = true;
      visitor.leadId = newLead.id;
    }

    state.websiteLeads.unshift(newLead);
    logAudit('Website', 'CAPTURE_LEAD', `Captured web lead: ${newLead.name} (${newLead.phone}) - Score: ${computedScore}`);
    persist();
    res.status(201).json(newLead);
  });

  // 5. Update Lead Status
  router.patch('/lead-generation/leads/:id', (req, res) => {
    const lead = state.websiteLeads.find(l => l.id === req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    Object.assign(lead, req.body);
    logAudit('Admin', 'UPDATE_LEAD', `Updated status for lead ${lead.name} to ${lead.status}`);
    persist();
    res.json(lead);
  });

  // 6. Convert Website Lead Directly into Active CRM Customer
  router.post('/lead-generation/leads/:id/convert-to-customer', (req, res) => {
    const lead = state.websiteLeads.find(l => l.id === req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    if (lead.status === 'CONVERTED_CUSTOMER') {
      return res.status(400).json({ error: 'Lead is already converted to a customer' });
    }

    const newCustomer = {
      id: `CUST-${String(nextId('customers')).padStart(3, '0')}`,
      name: lead.companyName ? `${lead.name} (${lead.companyName})` : lead.name,
      phone: lead.phone,
      email: lead.email,
      gstin: req.body.gstin || '',
      address: req.body.address || `${lead.city}, ${lead.country}`,
      group: req.body.group || (lead.companyName ? 'Wholesale' : 'Retail'),
      outstandingBalance: 0,
      creditLimit: parseFloat(req.body.creditLimit) || 50000,
      loyaltyPoints: 100, // Welcome gift points
      walletBalance: 0,
      loyaltyTier: 'SILVER',
      isCreditFrozen: false
    };

    state.customers.unshift(newCustomer);
    lead.status = 'CONVERTED_CUSTOMER';
    lead.convertedCustomerId = newCustomer.id;

    logAudit('Admin', 'CONVERT_LEAD_TO_CUSTOMER', `Converted web lead ${lead.name} to CRM Customer ${newCustomer.id}`);
    persist();
    res.status(201).json({ message: 'Lead converted to active customer successfully', customer: newCustomer, lead });
  });

  router.get('/users', (req, res) => res.json(state.users));
  router.get('/security/audit-logs', (req, res) => res.json(state.auditLogs));

  // --- 12. SUBSCRIPTION & ENTITLEMENT ENGINE ---
  router.get('/entitlements', (req, res) => {
    res.json(state.entitlement);
  });

  router.post('/entitlements/tier', (req, res) => {
    const { tier } = req.body;
    if (!['SINGLE_BRANCH', 'MULTI_BRANCH', 'NATIONAL_BRANCH'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier. Choose SINGLE_BRANCH, MULTI_BRANCH, or NATIONAL_BRANCH' });
    }

    let maxBranches = 1;
    let maxSeats = 3;
    let maxRegisters = 2;
    let features = {
      interBranchSTN: false,
      jobSheets: false,
      eInvoicing: false,
      eWayBill: false,
      asc606Revenue: false,
      customRoles: false,
      advancedAudit: false
    };

    if (tier === 'MULTI_BRANCH') {
      maxBranches = 5;
      maxSeats = 15;
      maxRegisters = 10;
      features = {
        interBranchSTN: true,
        jobSheets: true,
        eInvoicing: true,
        eWayBill: true,
        asc606Revenue: false,
        customRoles: true,
        advancedAudit: true
      };
    } else if (tier === 'NATIONAL_BRANCH') {
      maxBranches = 99999;
      maxSeats = 99999;
      maxRegisters = 99999;
      features = {
        interBranchSTN: true,
        jobSheets: true,
        eInvoicing: true,
        eWayBill: true,
        asc606Revenue: true,
        customRoles: true,
        advancedAudit: true
      };
    }

    state.entitlement = {
      ...state.entitlement,
      tier,
      maxBranches,
      maxSeats,
      maxRegisters,
      features
    };

    logAudit('Admin', 'UPGRADE_TIER', `Subscription plan updated to: ${tier}`);
    persist();
    res.json(state.entitlement);
  });

  // --- 13. MULTI-BRANCH HIERARCHY ---
  router.get('/branches', (req, res) => {
    res.json(state.branches);
  });

  router.get('/branches/tree', (req, res) => {
    const branchMap = new Map();
    state.branches.forEach(b => branchMap.set(b.id, { ...b, children: [] }));
    const rootNodes = [];

    branchMap.forEach(b => {
      if (b.parentBranchId && branchMap.has(b.parentBranchId)) {
        branchMap.get(b.parentBranchId).children.push(b);
      } else {
        rootNodes.push(b);
      }
    });

    res.json(rootNodes);
  });

  router.post('/branches', (req, res) => {
    const { name, branchCode, nodeType, parentBranchId, state: bState, stateCode, city, address, phone, email, gstin } = req.body;
    
    // Entitlement branch limit check
    if (state.branches.length >= state.entitlement.maxBranches) {
      return res.status(403).json({
        error: `Plan entitlement limit reached. Your ${state.entitlement.tier} plan permits up to ${state.entitlement.maxBranches} branches. Upgrade tier to add more.`
      });
    }

    if (!name || !branchCode) {
      return res.status(400).json({ error: 'Branch name and unique branch code are required.' });
    }

    const newBranch = {
      id: `BR-${Date.now().toString().slice(-5)}`,
      parentBranchId: parentBranchId || null,
      nodeType: nodeType || 'BRANCH_STORE',
      branchCode: String(branchCode).toUpperCase(),
      name,
      gstin: gstin ? String(gstin).toUpperCase() : (state.companySettings.gstin || ''),
      state: bState || 'Karnataka',
      stateCode: stateCode || '29',
      city: city || 'Bengaluru',
      address: address || '',
      phone: phone || '',
      email: email || '',
      receiptHeader: `Zia Billing - ${name}`,
      receiptFooter: 'Thank you for your business.',
      isActive: true
    };

    state.branches.push(newBranch);
    logAudit('Admin', 'CREATE_BRANCH', `Added branch ${newBranch.name} (${newBranch.branchCode})`);
    persist();
    res.status(201).json(newBranch);
  });

  router.put('/branches/:id', (req, res) => {
    const branch = state.branches.find(b => b.id === req.params.id);
    if (!branch) return res.status(404).json({ error: 'Branch not found' });

    Object.assign(branch, req.body);
    logAudit('Admin', 'UPDATE_BRANCH', `Updated details for branch: ${branch.name}`);
    persist();
    res.json(branch);
  });

  // --- 14. RBAC, ROLES & SUPERVISOR OVERRIDE ---
  router.get('/roles', (req, res) => {
    res.json(state.roles);
  });

  router.post('/roles', (req, res) => {
    const { roleKey, displayName, permissions } = req.body;
    if (!roleKey || !displayName) return res.status(400).json({ error: 'roleKey and displayName required' });

    const newRole = {
      id: `ROLE-${Date.now().toString().slice(-4)}`,
      roleKey: String(roleKey).toUpperCase().replace(/\s+/g, '_'),
      displayName,
      isSystemRole: false,
      permissions: permissions || {}
    };

    state.roles.push(newRole);
    logAudit('Admin', 'CREATE_ROLE', `Created custom role: ${displayName}`);
    persist();
    res.status(201).json(newRole);
  });

  router.post('/users', (req, res) => {
    const { name, email, phone, roleKey, branchId, pinCode } = req.body;
    if (!name || !roleKey) return res.status(400).json({ error: 'Name and role are required' });

    const roleObj = state.roles.find(r => r.roleKey === roleKey);
    const branchObj = state.branches.find(b => b.id === branchId);

    const newUser = {
      id: `USR-${String(nextId('users')).padStart(3, '0')}`,
      name,
      role: roleObj ? roleObj.displayName : roleKey,
      roleKey,
      email: email || '',
      phone: phone || '',
      branchId: branchId || (state.branches[0] ? state.branches[0].id : null),
      branchName: branchObj ? branchObj.name : 'Head Office',
      active: true,
      pinCode: pinCode || '1234',
      mfaEnabled: false
    };

    state.users.push(newUser);
    logAudit('Admin', 'CREATE_USER', `Added user ${newUser.name} with role ${newUser.role}`);
    persist();
    res.status(201).json(newUser);
  });

  router.put('/users/:id', (req, res) => {
    const user = state.users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    Object.assign(user, req.body);
    logAudit('Admin', 'UPDATE_USER', `Updated user: ${user.name}`);
    persist();
    res.json(user);
  });

  // Supervisor Price Override Verification
  router.post('/auth/supervisor-override', (req, res) => {
    const { supervisorPin, requestedDiscount, cashierId } = req.body;
    // Check if PIN matches an Admin or Branch Manager
    const supervisor = state.users.find(
      u => u.pinCode === String(supervisorPin).trim() && (u.roleKey === 'SUPER_ADMIN' || u.roleKey === 'BRANCH_MGR' || u.role === 'Admin')
    );

    if (!supervisor) {
      return res.status(403).json({ success: false, error: 'Invalid Supervisor Authorization PIN' });
    }

    logAudit(supervisor.name, 'SUPERVISOR_OVERRIDE', `Approved ${requestedDiscount}% discount override requested by cashier ${cashierId || 'Terminal'}`);
    res.json({
      success: true,
      authorizedBy: supervisor.name,
      supervisorId: supervisor.id,
      timestamp: new Date().toISOString()
    });
  });

  // --- 15. POS REGISTERS & SHIFTS ---
  router.get('/pos/registers', (req, res) => {
    const { branchId } = req.query;
    if (branchId) {
      return res.json(state.posRegisters.filter(r => r.branchId === branchId));
    }
    res.json(state.posRegisters);
  });

  router.post('/pos/registers', (req, res) => {
    const { branchId, registerCode, name } = req.body;
    const branch = state.branches.find(b => b.id === branchId);
    if (!branch || !registerCode) return res.status(400).json({ error: 'Branch and register code required' });

    const newReg = {
      id: `REG-${Date.now().toString().slice(-4)}`,
      branchId,
      branchName: branch.name,
      registerCode: String(registerCode).toUpperCase(),
      name: name || registerCode,
      isActive: true
    };
    state.posRegisters.push(newReg);
    logAudit('Admin', 'CREATE_REGISTER', `Created POS register: ${newReg.registerCode} at ${branch.name}`);
    persist();
    res.status(201).json(newReg);
  });

  router.get('/pos/shifts/active', (req, res) => {
    const { registerId } = req.query;
    const active = state.posShifts.find(s => s.status === 'OPEN' && (!registerId || s.registerId === registerId));
    res.json(active || null);
  });

  router.post('/pos/shifts/open', (req, res) => {
    const { registerId, userId, openingFloatCash } = req.body;
    const reg = state.posRegisters.find(r => r.id === registerId) || state.posRegisters[0];
    const user = state.users.find(u => u.id === userId) || state.users[0];

    // Check if already open shift exists
    const existing = state.posShifts.find(s => s.registerId === reg.id && s.status === 'OPEN');
    if (existing) {
      return res.status(400).json({ error: 'A shift is already open on this register', shift: existing });
    }

    const newShift = {
      id: `SHIFT-${Date.now().toString().slice(-6)}`,
      registerId: reg.id,
      registerCode: reg.registerCode,
      userId: user.id,
      userName: user.name,
      branchId: reg.branchId,
      openedAt: new Date().toISOString(),
      closedAt: null,
      openingFloatCash: parseFloat(openingFloatCash) || 0,
      closingCountedCash: null,
      expectedCash: parseFloat(openingFloatCash) || 0,
      cashVariance: 0,
      totalSalesAmount: 0,
      totalRefundsAmount: 0,
      status: 'OPEN'
    };

    state.posShifts.unshift(newShift);
    logAudit(user.name, 'SHIFT_OPEN', `Opened register shift on ${reg.registerCode} with float ₹${newShift.openingFloatCash}`);
    persist();
    res.status(201).json(newShift);
  });

  router.post('/pos/shifts/close', (req, res) => {
    const { shiftId, closingCountedCash } = req.body;
    const shift = state.posShifts.find(s => s.id === shiftId);
    if (!shift || shift.status !== 'OPEN') return res.status(404).json({ error: 'Active shift not found' });

    const counted = parseFloat(closingCountedCash) || 0;
    shift.closingCountedCash = counted;
    shift.closedAt = new Date().toISOString();
    shift.cashVariance = counted - (shift.expectedCash || 0);
    shift.status = 'CLOSED';

    logAudit(shift.userName, 'SHIFT_CLOSE', `Closed shift ${shift.id}: Expected ₹${shift.expectedCash}, Counted ₹${counted}, Variance ₹${shift.cashVariance}`);
    persist();
    res.json(shift);
  });

  // --- 16. INTER-BRANCH STOCK TRANSFERS (STN) ---
  router.get('/stn', (req, res) => {
    const { branchId } = req.query;
    if (branchId) {
      return res.json(state.stockTransfers.filter(s => s.sourceBranchId === branchId || s.destinationBranchId === branchId));
    }
    res.json(state.stockTransfers);
  });

  router.post('/stn', (req, res) => {
    const { sourceBranchId, destinationBranchId, items, carrierName, trackingNumber, notes } = req.body;
    
    if (!state.entitlement.features.interBranchSTN) {
      return res.status(403).json({ error: 'STN is not enabled on your subscription tier. Upgrade to Multi-Branch or National.' });
    }

    const src = state.branches.find(b => b.id === sourceBranchId);
    const dest = state.branches.find(b => b.id === destinationBranchId);

    if (!src || !dest || src.id === dest.id) {
      return res.status(400).json({ error: 'Valid differing source and destination branches required' });
    }

    if (!items || !items.length) {
      return res.status(400).json({ error: 'STN must contain at least one item' });
    }

    let totalUnits = 0;
    let totalValuation = 0;
    const processedItems = items.map(it => {
      const qty = parseInt(it.dispatchedQty, 10) || 1;
      const cost = parseFloat(it.unitCost) || 0;
      totalUnits += qty;
      totalValuation += qty * cost;
      return {
        itemId: it.itemId,
        name: it.name,
        sku: it.sku || '',
        dispatchedQty: qty,
        receivedQty: 0,
        discrepancyQty: 0,
        unitCost: cost
      };
    });

    const newSTN = {
      id: `STN-${Date.now().toString().slice(-6)}`,
      stnNumber: `STN-${src.branchCode}-${String(nextId('stockTransfers')).padStart(3, '0')}`,
      sourceBranchId: src.id,
      sourceBranchName: src.name,
      destinationBranchId: dest.id,
      destinationBranchName: dest.name,
      status: 'DRAFT',
      items: processedItems,
      totalUnits,
      totalValuation,
      dispatchedBy: req.body.dispatchedBy || 'Storekeeper',
      carrierName: carrierName || '',
      trackingNumber: trackingNumber || '',
      eWayBillNumber: totalValuation > 50000 ? `EWB-${Date.now().toString().slice(-10)}` : '',
      notes: notes || ''
    };

    state.stockTransfers.unshift(newSTN);
    logAudit('Admin', 'CREATE_STN', `Drafted STN ${newSTN.stnNumber} from ${src.name} to ${dest.name} (${totalUnits} units)`);
    persist();
    res.status(201).json(newSTN);
  });

  router.post('/stn/:id/dispatch', (req, res) => {
    const stn = state.stockTransfers.find(s => s.id === req.params.id);
    if (!stn) return res.status(404).json({ error: 'STN not found' });
    if (stn.status !== 'DRAFT') return res.status(400).json({ error: `Cannot dispatch STN in status: ${stn.status}` });

    stn.status = 'IN_TRANSIT';
    stn.dispatchDate = new Date().toISOString();

    // Deduct stock from source branch
    stn.items.forEach(it => {
      const prod = state.products.find(p => p.id === it.itemId);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - it.dispatchedQty);
      }
    });

    logAudit('Admin', 'DISPATCH_STN', `Dispatched STN ${stn.stnNumber}. Stock in transit.`);
    persist();
    res.json(stn);
  });

  router.post('/stn/:id/receive', (req, res) => {
    const { receivedItems, receivedBy } = req.body;
    const stn = state.stockTransfers.find(s => s.id === req.params.id);
    if (!stn) return res.status(404).json({ error: 'STN not found' });
    if (stn.status !== 'IN_TRANSIT') return res.status(400).json({ error: `STN is not IN_TRANSIT (current: ${stn.status})` });

    let hasDiscrepancy = false;
    stn.items.forEach((it, idx) => {
      const rec = (receivedItems && receivedItems[idx]) ? parseInt(receivedItems[idx].receivedQty, 10) : it.dispatchedQty;
      it.receivedQty = isNaN(rec) ? it.dispatchedQty : rec;
      it.discrepancyQty = it.dispatchedQty - it.receivedQty;
      if (it.discrepancyQty !== 0) hasDiscrepancy = true;

      // Credit stock into destination branch
      const prod = state.products.find(p => p.id === it.itemId);
      if (prod) {
        prod.stock += it.receivedQty;
      }
    });

    stn.status = hasDiscrepancy ? 'DISCREPANCY_SHORTAGE' : 'RECEIVED';
    stn.receivedDate = new Date().toISOString();
    stn.receivedBy = receivedBy || 'Receiving Storekeeper';

    logAudit(stn.receivedBy, 'RECEIVE_STN', `Received STN ${stn.stnNumber} at ${stn.destinationBranchName}. Status: ${stn.status}`);
    persist();
    res.json(stn);
  });

  // --- 17. SPECIALIZED SPARE PARTS & COMPATIBILITY MATRIX ---
  router.get('/catalog/spares', (req, res) => {
    const spares = state.products.filter(p => p.classification === 'SPARE_PART');
    res.json(spares);
  });

  router.get('/catalog/spares/compatibility', (req, res) => {
    const { modelName } = req.query;
    if (modelName) {
      const filtered = state.spareCompatibility.filter(
        c => c.compatibleModelName.toLowerCase().includes(String(modelName).toLowerCase())
      );
      return res.json(filtered);
    }
    res.json(state.spareCompatibility);
  });

  router.post('/catalog/spares/compatibility', (req, res) => {
    const { spareItemId, compatibleModelName, compatibleModelYear, notes } = req.body;
    const spare = state.products.find(p => p.id === spareItemId);
    if (!spare || !compatibleModelName) {
      return res.status(400).json({ error: 'Valid spare part and compatible model name required' });
    }

    const newCompat = {
      id: `COMP-${Date.now().toString().slice(-4)}`,
      spareItemId: spare.id,
      spareItemName: spare.name,
      spareSku: spare.sku,
      compatibleModelName,
      compatibleModelYear: compatibleModelYear || 'ALL',
      notes: notes || ''
    };

    state.spareCompatibility.push(newCompat);
    logAudit('Admin', 'CREATE_SPARE_COMPAT', `Linked spare ${spare.name} to model ${compatibleModelName}`);
    persist();
    res.status(201).json(newCompat);
  });

  // --- 18. WAREHOUSE STORAGE LOCATIONS (BIN / RACK) ---
  router.get('/catalog/storage-locations', (req, res) => {
    const { branchId } = req.query;
    if (branchId) {
      return res.json(state.storageLocations.filter(l => l.branchId === branchId));
    }
    res.json(state.storageLocations);
  });

  router.post('/catalog/storage-locations', (req, res) => {
    const { branchId, zoneCode, rackNumber, shelfTier, binNumber, description } = req.body;
    if (!branchId || !zoneCode || !rackNumber || !binNumber) {
      return res.status(400).json({ error: 'Branch, zone, rack, and bin coordinates required' });
    }

    const newLoc = {
      id: `LOC-${Date.now().toString().slice(-4)}`,
      branchId,
      zoneCode: String(zoneCode).toUpperCase(),
      rackNumber: String(rackNumber).toUpperCase(),
      shelfTier: String(shelfTier || 'TIER-1').toUpperCase(),
      binNumber: String(binNumber).toUpperCase(),
      description: description || ''
    };

    state.storageLocations.push(newLoc);
    logAudit('Admin', 'CREATE_BIN_LOCATION', `Configured storage bin ${newLoc.zoneCode}-${newLoc.rackNumber}-${newLoc.binNumber}`);
    persist();
    res.status(201).json(newLoc);
  });

  // --- 19. SERIAL & IMEI UNIT TRACKING ---
  router.get('/catalog/serials', (req, res) => {
    const { itemId, branchId, status } = req.query;
    let list = state.serialUnits;
    if (itemId) list = list.filter(s => s.itemId === itemId);
    if (branchId) list = list.filter(s => s.branchId === branchId);
    if (status) list = list.filter(s => s.status === status);
    res.json(list);
  });

  router.post('/catalog/serials', (req, res) => {
    const { itemId, branchId, serialOrImei, costPrice, warrantyMonths } = req.body;
    const prod = state.products.find(p => p.id === itemId);
    if (!prod || !serialOrImei) {
      return res.status(400).json({ error: 'Valid serialized item and serial/IMEI required' });
    }

    const newSerial = {
      id: `SNU-${Date.now().toString().slice(-4)}`,
      itemId: prod.id,
      itemName: prod.name,
      branchId: branchId || 'BR-STR-01',
      serialOrImei: String(serialOrImei).trim(),
      status: 'AVAILABLE',
      costPrice: parseFloat(costPrice) || prod.purchasePrice || 0,
      warrantyMonths: parseInt(warrantyMonths, 10) || prod.warrantyMonths || 12
    };

    state.serialUnits.push(newSerial);
    logAudit('Admin', 'REGISTER_SERIAL', `Registered serial unit ${newSerial.serialOrImei} for ${prod.name}`);
    persist();
    res.status(201).json(newSerial);
  });

  // --- 20. SERVICE JOB SHEETS & REQUISITIONS ---
  router.get('/service/job-sheets', (req, res) => {
    const { branchId, status } = req.query;
    let list = state.serviceJobSheets;
    if (branchId) list = list.filter(j => j.branchId === branchId);
    if (status) list = list.filter(j => j.status === status);
    res.json(list);
  });

  router.post('/service/job-sheets', (req, res) => {
    const { customerName, customerPhone, deviceModel, deviceSerialImei, reportedFault, branchId, assignedTechnicianId } = req.body;
    if (!customerName || !customerPhone || !deviceModel || !reportedFault) {
      return res.status(400).json({ error: 'Customer name, phone, device model, and reported fault are required' });
    }

    const branch = state.branches.find(b => b.id === branchId) || state.branches[0];
    const tech = state.users.find(u => u.id === assignedTechnicianId);

    const newJob = {
      id: `JOB-${Date.now().toString().slice(-6)}`,
      jobNumber: `JOB-${branch.branchCode}-${String(nextId('serviceJobSheets')).padStart(4, '0')}`,
      branchId: branch.id,
      branchName: branch.name,
      customerId: req.body.customerId || null,
      customerName,
      customerPhone,
      deviceModel,
      deviceSerialImei: deviceSerialImei || '',
      reportedFault,
      technicianDiagnostic: '',
      assignedTechnicianId: tech ? tech.id : null,
      assignedTechnicianName: tech ? tech.name : 'Unassigned',
      status: 'IN_PROGRESS',
      spares: [],
      laborCharges: 0,
      sparesTotal: 0,
      tax: 0,
      grandTotal: 0,
      createdAt: new Date().toISOString()
    };

    state.serviceJobSheets.unshift(newJob);
    logAudit('Technician', 'CREATE_JOB_SHEET', `Opened job card ${newJob.jobNumber} for ${customerName} (${deviceModel})`);
    persist();
    res.status(201).json(newJob);
  });

  // Allocate and consume spare part for job sheet
  router.post('/service/job-sheets/:id/spares', (req, res) => {
    const { spareItemId, quantity = 1, unitPrice } = req.body;
    const job = state.serviceJobSheets.find(j => j.id === req.params.id);
    if (!job) return res.status(404).json({ error: 'Job sheet not found' });

    const spare = state.products.find(p => p.id === spareItemId);
    if (!spare) return res.status(404).json({ error: 'Spare part not found in catalog' });

    const qty = parseInt(quantity, 10) || 1;
    if (spare.stock < qty) {
      return res.status(400).json({ error: `Insufficient stock in branch inventory. Available: ${spare.stock}` });
    }

    // Deduct stock from warehouse
    spare.stock -= qty;

    const price = parseFloat(unitPrice) || spare.sellingPrice || 0;
    const spareAlloc = {
      id: `JSP-${Date.now().toString().slice(-4)}`,
      spareItemId: spare.id,
      name: spare.name,
      oemPartNumber: spare.oemPartNumber || '',
      quantity: qty,
      unitPrice: price,
      taxRate: spare.taxRate || 18,
      isConsumed: true,
      storageBin: spare.storageBin || 'GENERAL'
    };

    job.spares.push(spareAlloc);
    job.sparesTotal = job.spares.reduce((sum, s) => sum + (s.quantity * s.unitPrice), 0);
    const subtotal = job.sparesTotal + (job.laborCharges || 0);
    job.tax = Math.round(subtotal * 0.18 * 100) / 100;
    job.grandTotal = subtotal + job.tax;

    logAudit('Technician', 'CONSUME_SPARE', `Allocated ${qty}x ${spare.name} for Job ${job.jobNumber}. Stock deducted.`);
    persist();
    res.json(job);
  });

  // Convert completed job sheet to POS sales invoice
  router.post('/service/job-sheets/:id/convert-to-invoice', (req, res) => {
    const { laborCharges, diagnosticNotes } = req.body;
    const job = state.serviceJobSheets.find(j => j.id === req.params.id);
    if (!job) return res.status(404).json({ error: 'Job sheet not found' });
    if (job.status === 'CLOSED_BILLED') return res.status(400).json({ error: 'Job sheet is already billed' });

    if (laborCharges !== undefined) job.laborCharges = parseFloat(laborCharges) || 0;
    if (diagnosticNotes) job.technicianDiagnostic = diagnosticNotes;

    const subtotal = (job.sparesTotal || 0) + (job.laborCharges || 0);
    const tax = Math.round(subtotal * 0.18 * 100) / 100;
    const grandTotal = subtotal + tax;

    // Create Invoice items from job sheet spares + labor
    const invoiceItems = job.spares.map(s => ({
      id: s.spareItemId,
      name: `${s.name} (Spare Part)`,
      quantity: s.quantity,
      unitPrice: s.unitPrice,
      taxRate: s.taxRate,
      total: s.quantity * s.unitPrice
    }));

    if (job.laborCharges > 0) {
      invoiceItems.push({
        id: 'SRV-LABOR',
        name: `Service & Diagnostic Labor Charge (${job.deviceModel})`,
        quantity: 1,
        unitPrice: job.laborCharges,
        taxRate: 18,
        total: job.laborCharges
      });
    }

    const newInvoice = {
      id: `INV-${new Date().getFullYear()}-${String(nextId('invoices')).padStart(3, '0')}`,
      type: 'INVOICE',
      customerId: job.customerId || null,
      customerName: job.customerName,
      customerPhone: job.customerPhone,
      customerGstin: '',
      date: new Date().toISOString().slice(0, 10),
      dueDate: new Date().toISOString().slice(0, 10),
      paymentMethod: 'UPI',
      items: invoiceItems,
      subtotal,
      tax,
      discount: 0,
      total: grandTotal,
      status: 'PAID',
      jobSheetId: job.id
    };

    state.invoices.unshift(newInvoice);
    job.status = 'CLOSED_BILLED';
    job.invoiceId = newInvoice.id;
    job.completedAt = new Date().toISOString();

    logAudit('Technician', 'CONVERT_JOB_TO_INVOICE', `Generated Invoice ${newInvoice.id} from Job Sheet ${job.jobNumber} for ₹${grandTotal}`);
    persist();
    res.json({ job, invoice: newInvoice });
  });

  // --- 21. RMA, SCRAP & DEFECTIVE STOCK ---
  router.get('/service/rma', (req, res) => {
    const { branchId, status } = req.query;
    let list = state.rmaRecords;
    if (branchId) list = list.filter(r => r.branchId === branchId);
    if (status) list = list.filter(r => r.status === status);
    res.json(list);
  });

  router.post('/service/rma', (req, res) => {
    const { itemId, serialOrImei, branchId, reason, action, notes } = req.body;
    const prod = state.products.find(p => p.id === itemId);
    if (!prod || !reason || !action) {
      return res.status(400).json({ error: 'Item, reason, and action required' });
    }

    const branch = state.branches.find(b => b.id === branchId) || state.branches[0];

    // If unit is in available stock, isolate/deduct it
    if (prod.stock > 0) {
      prod.stock -= 1;
    }

    const newRMA = {
      id: `RMA-${Date.now().toString().slice(-4)}`,
      branchId: branch.id,
      branchName: branch.name,
      itemId: prod.id,
      itemName: prod.name,
      serialOrImei: serialOrImei || '',
      reason,
      action,
      reportedDate: new Date().toISOString().slice(0, 10),
      status: 'PENDING',
      costLoss: prod.purchasePrice || 0,
      notes: notes || ''
    };

    state.rmaRecords.unshift(newRMA);
    logAudit('Storekeeper', 'CREATE_RMA', `Logged RMA ${newRMA.id} for defective ${prod.name} (${reason})`);
    persist();
    res.status(201).json(newRMA);
  });

  // --- 22. BACKUP & RESTORE ---
  router.get('/backup/export', (req, res) => {
    res.setHeader('Content-Disposition', `attachment; filename=Zia_Billing_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(state, null, 2));
  });

  router.post('/backup/restore', (req, res) => {
    const importedData = req.body;
    if (!importedData || !Array.isArray(importedData.products) || !Array.isArray(importedData.invoices)) {
      return res.status(400).json({ error: 'Invalid backup JSON file structure.' });
    }
    state = { ...defaultState, ...importedData };
    logAudit('Admin', 'RESTORE_DATA', 'Restored system database from backup archive');
    persist();
    res.json({ message: 'Database restored successfully!', productsCount: state.products.length, invoicesCount: state.invoices.length });
  });

  return router;
}

module.exports = { createApiRouter };
