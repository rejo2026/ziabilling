// ============================================================
// Multi-Country & Localization Configurations (India & UAE)
// ============================================================

import { 
  CountryTaxConfig, 
  SupportedCountry, 
  SupportedLanguage,
  SupportedCurrency,
  SupportedTimezone
} from './types';

export const COUNTRY_PROFILES: Record<SupportedCountry, CountryTaxConfig> = {
  IN: {
    countryCode: 'IN',
    countryName: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    currencySubUnit: 'Paise',
    timezone: 'Asia/Kolkata',
    defaultLanguage: 'en',
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
    currencySubUnit: 'Fils',
    timezone: 'Asia/Dubai',
    defaultLanguage: 'en',
    taxSystem: 'VAT',
    taxRegistrationLabel: 'TRN',
    standardTaxRates: [0, 5],
    eInvoicingStandard: 'ZATCA_PEPPOL_EIDAS',
    taxIdRegex: '^100[0-9]{12}$', // 15-digit UAE Tax Registration Number starting with 100
    supportsRTL: true
  },
  GLOBAL: {
    countryCode: 'GLOBAL',
    countryName: 'International / Multi-Region',
    currency: 'USD',
    currencySymbol: '$',
    currencySubUnit: 'Cents',
    timezone: 'UTC',
    defaultLanguage: 'en',
    taxSystem: 'VAT',
    taxRegistrationLabel: 'TRN',
    standardTaxRates: [0, 5, 10, 15, 20],
    eInvoicingStandard: 'ZATCA_PEPPOL_EIDAS',
    taxIdRegex: '^[A-Z0-9]{8,15}$',
    supportsRTL: false
  }
};

// ============================================================
// Dictionary for Multi-Language Support (English, Arabic, Hindi)
// ============================================================

export const TRANSLATIONS: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    dashboard: 'Dashboard',
    posBilling: 'POS Fast Billing',
    invoices: 'Invoices & Billing',
    inventory: 'Inventory & Stock',
    spareParts: 'Auto Parts & Fitment',
    compatibility: 'Vehicle Compatibility',
    barcodes: 'Barcode Scanning & Labels',
    purchases: 'Inward Purchases',
    suppliers: 'Suppliers & Vendors',
    customers: 'Customers & Garages',
    salesReturns: 'Sales Returns & Credit Notes',
    purchaseReturns: 'Purchase Returns',
    warranty: 'Warranty Claims',
    cashRegister: 'Cash Register Shifts',
    expenses: 'Branch Expenses',
    vatReport: 'UAE FTA VAT 201 Return',
    reports: 'Financial Reports & P&L',
    settings: 'Settings & Administration',
    modulesAdmin: 'Module Manager',
    fieldsAdmin: 'Dynamic Fields',
    themeAdmin: 'Theme Customizer',
    loginAdmin: 'Login Designer',
    regionalAdmin: 'UAE Regional Settings',
    auditLogs: 'Audit Logs',
    backupAdmin: 'Backup & Restore',
    taxLabel: 'UAE VAT (5%)',
    taxNumber: 'TRN (Tax ID)',
    subtotal: 'Subtotal',
    discount: 'Discount',
    total: 'Grand Total',
    paid: 'Paid',
    pending: 'Pending Overdue',
    checkout: 'Complete Checkout',
    currencySymbol: 'AED',
    printReceipt: 'Print Tax Invoice',
    bilingualNotice: 'Simplified Tax Invoice • فاتورة ضريبية مبسطة',
    partTypeGenuine: 'Genuine',
    partTypeOem: 'OEM',
    partTypeAftermarket: 'Aftermarket',
    oemNumber: 'OEM Part #',
    fitmentYear: 'Model Years',
    cash: 'Cash AED',
    card: 'Card',
    transfer: 'Bank Transfer',
    creditAccount: 'Garage Credit'
  },
  ar: {
    dashboard: 'لوحة القيادة',
    posBilling: 'نقطة البيع السريعة',
    invoices: 'الفواتير والمبيعات',
    inventory: 'المخزون والمستودع',
    spareParts: 'قطع غيار السيارات والتوافق',
    compatibility: 'توافق المركبات والموديلات',
    barcodes: 'مسح الباركود وطباعة الملصقات',
    purchases: 'المشتريات والتوريد',
    suppliers: 'الموردين والشركات',
    customers: 'العملاء وورش الصيانة',
    salesReturns: 'مرتجعات المبيعات والإشعارات الدائنة',
    purchaseReturns: 'مرتجعات المشتريات والإشعارات المدينة',
    warranty: 'مطالبات الضمان وقطع الغيار',
    cashRegister: 'صندوق النقدية والورديات',
    expenses: 'مصاريف الفرع',
    vatReport: 'إقرار ضريبة القيمة المضافة 201',
    reports: 'التقارير المالية والأرباح',
    settings: 'الإعدادات والإدارة المركزية',
    modulesAdmin: 'إدارة وحدات النظام',
    fieldsAdmin: 'إدارة الحقول المخصصة',
    themeAdmin: 'تخصيص المظهر والألوان',
    loginAdmin: 'تصميم صفحة الدخول',
    regionalAdmin: 'إعدادات دولة الإمارات والضرائب',
    auditLogs: 'سجلات التدقيق والعمليات',
    backupAdmin: 'النسخ الاحتياطي والاستعادة',
    taxLabel: 'ضريبة القيمة المضافة (5%)',
    taxNumber: 'رقم التسجيل الضريبي (TRN)',
    subtotal: 'المجموع الفرعي',
    discount: 'الخصم',
    total: 'الإجمالي النهائي',
    paid: 'المدفوع',
    pending: 'المتبقي المستحق',
    checkout: 'إتمام الفاتورة',
    currencySymbol: 'د.إ',
    printReceipt: 'طباعة الفاتورة الضريبية',
    bilingualNotice: 'فاتورة ضريبية مبسطة • Simplified Tax Invoice',
    partTypeGenuine: 'أصلي وكالة',
    partTypeOem: 'مصنع أصلي OEM',
    partTypeAftermarket: 'تجاري معتمد',
    oemNumber: 'رقم القطعة الأصلي OEM',
    fitmentYear: 'سنوات الصنع المتوافقة',
    cash: 'نقداً بالدرهم',
    card: 'بطاقة مصرفية',
    transfer: 'تحويل بنكي',
    creditAccount: 'حساب آجل للورش'
  },
  hi: {
    dashboard: 'डैशबोर्ड',
    posBilling: 'पीओएस फास्ट बिलिंग',
    invoices: 'चालान और बिलिंग',
    inventory: 'इन्वेंटरी और स्टॉक',
    spareParts: 'स्पेयर पार्ट्स और कम्पैटिबिलिटी',
    jobSheets: 'सर्विस जॉब शीट्स',
    customers: 'ग्राहक और सीआरएम',
    suppliers: 'आपूर्तिकर्ता और विक्रेता',
    purchases: 'आवक खरीद',
    reports: 'वित्तीय रिपोर्ट और लाभ-हानि',
    settings: 'सेटिंग्स और कंपनी प्रोफाइल',
    taxLabel: 'कर (जीएसटी / वैट)',
    taxNumber: 'जीएसटीिन / टैक्स आईडी',
    subtotal: 'उप-योग',
    discount: 'छूट',
    total: 'कुल राशि',
    paid: 'भुगतान किया गया',
    pending: 'बकाया',
    checkout: 'बिल पूरा करें',
    currencySymbol: '₹',
    printReceipt: 'टैक्स इनवॉइस प्रिंट करें',
    bilingualNotice: 'टैक्स इनवॉइस'
  },
  kn: {
    dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    posBilling: 'ಪಿಒಎಸ್ ಬಿಲ್ಲಿಂಗ್',
    invoices: 'ಇನ್‌ವಾಯ್ಸ್‌ಗಳು',
    inventory: 'ದಾಸ್ತಾನು & ಸ್ಟಾಕ್',
    spareParts: 'ಬಿಡಿ ಭಾಗಗಳು',
    jobSheets: 'ಸರ್ವೀಸ್ ಜಾಬ್ ಶೀಟ್‌ಗಳು',
    customers: 'ಗ್ರಾಹಕರು',
    suppliers: 'ಸರಬರಾಜುದಾರರು',
    purchases: 'ಖರೀದಿಗಳು',
    reports: 'ವರದಿಗಳು',
    settings: 'ಸಂಯೋಜನೆಗಳು',
    taxLabel: 'ತೆರಿಗೆ (ಜಿಎಸ್‌ಟಿ)',
    taxNumber: 'ಜಿಎಸ್‌ಟಿ ಸಂಖ್ಯೆ',
    subtotal: 'ಉಪ ಮೊತ್ತ',
    discount: 'ರಿಯಾಯಿತಿ',
    total: 'ಒಟ್ಟು ಮೊತ್ತ',
    paid: 'ಪಾವತಿಸಲಾಗಿದೆ',
    pending: 'ಬಾಕಿ ಇದೆ',
    checkout: 'ಪಾವತಿಸಿ',
    currencySymbol: '₹',
    printReceipt: 'ರಸೀದಿ ಮುದ್ರಿಸಿ',
    bilingualNotice: 'ತೆರಿಗೆ ಸರಕುಪಟ್ಟಿ'
  },
  ta: {
    dashboard: 'டாஷ்போர்டு',
    posBilling: 'பிஓஎஸ் பில்லிங்',
    invoices: 'விலைப்பட்டியல்கள்',
    inventory: 'சரக்கு இருப்பு',
    spareParts: 'உதிரி பாகங்கள்',
    jobSheets: 'சேவை வேலைத்தாள்கள்',
    customers: 'வாடிக்கையாளர்கள்',
    suppliers: 'சப்ளையர்கள்',
    purchases: 'கொள்முதல்',
    reports: 'நிதி அறிக்கைகள்',
    settings: 'அமைப்புகள்',
    taxLabel: 'வரி (ஜிஎஸ்டி / வாட்)',
    taxNumber: 'வரி எண்',
    subtotal: 'கூடுதல் தொகை',
    discount: 'தள்ளுபடி',
    total: 'மொத்தத் தொகை',
    paid: 'செலுத்தப்பட்டது',
    pending: 'நிலுவையில் உள்ளது',
    checkout: 'பணம் செலுத்து',
    currencySymbol: '₹',
    printReceipt: 'ரசீது அச்சிடுக',
    bilingualNotice: 'வரி விலைப்பட்டியல்'
  },
  te: {
    dashboard: 'డాష్‌బోర్డ్',
    posBilling: 'పిఓఎస్ బిల్లింగ్',
    invoices: 'ఇన్వాయిస్‌లు',
    inventory: 'ఇన్వెంటరీ & స్టాక్',
    spareParts: 'విడిభాగాలు',
    jobSheets: 'సర్వీస్ జాబ్ షీట్లు',
    customers: 'కస్టమర్లు',
    suppliers: 'సరఫరాదారులు',
    purchases: 'కొనుగోళ్లు',
    reports: 'ఆర్థిక నివేదికలు',
    settings: 'సెట్టింగ్‌లు',
    taxLabel: 'పన్ను (జీఎస్టీ / వ్యాట్)',
    taxNumber: 'పన్ను సంఖ్య',
    subtotal: 'ఉప మొత్తం',
    discount: 'డిస్కౌంట్',
    total: 'మొత్తం',
    paid: 'చెల్లించబడింది',
    pending: 'బాకీ',
    checkout: 'పూర్తి చేయండి',
    currencySymbol: '₹',
    printReceipt: 'రసీదును ముద్రించండి',
    bilingualNotice: 'పన్ను ఇన్వాయిస్'
  }
};

// ============================================================
// Multi-Timezone & Date Formatter
// ============================================================

export function formatLocalizedDateTime(
  dateInput: string | Date,
  timezone: SupportedTimezone = 'Asia/Kolkata',
  locale: string = 'en-IN'
): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(d);
}

// ============================================================
// Multi-Currency Currency Formatter
// ============================================================

export function formatLocalizedCurrency(
  amount: number,
  currency: SupportedCurrency = 'INR',
  locale: string = 'en-IN'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}
