// ============================================================
// Shared Types for Zia-Billing
// ============================================================

export type PaymentMethod = 'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Credit';
export type InvoiceStatus = 'PAID' | 'PENDING' | 'REFUNDED' | 'OVERDUE';
export type InvoiceType = 'INVOICE' | 'POS' | 'QUOTATION';

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  hsnCode?: string;
  category: string;
  brand: string;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  taxRate: number;
  stock: number;
  minStock: number;
  batch?: string;
  expiry?: string;
}

export interface InvoiceItem {
  id?: string;
  name: string;
  hsnCode?: string;
  quantity: number;
  unitPrice: number;
  sellingPrice?: number;
  taxRate: number;
  total: number;
}

export interface Invoice {
  id: string;
  type: InvoiceType;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerGstin?: string;
  date: string;
  dueDate?: string;
  paymentMethod?: PaymentMethod;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: InvoiceStatus;
}

export interface Quotation {
  id: string;
  customerName: string;
  customerPhone?: string;
  date: string;
  expiryDate: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CONVERTED';
}

// Customer-facing recurring billing (Zoho-Billing-style). Distinct from
// SubscriptionFeatures/SubscriptionEntitlement below, which describe this
// app's own software license tier, not a billed customer's plan.
export interface RecurringPlan {
  id: string;
  name: string;
  description?: string;
  amount: number;
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  taxRate: number;
  isActive: boolean;
}

export interface CustomerSubscription {
  id: string;
  customerId: string;
  customerName: string;
  planId: string;
  planName: string;
  amount: number;
  couponCode?: string | null;
  addOnIds: string[];
  startDate: string;
  nextBillingDate: string;
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED';
  lastInvoiceId?: string | null;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'PERCENT' | 'FLAT';
  value: number;
  isActive: boolean;
  expiresAt?: string | null;
  maxRedemptions?: number | null;
  timesRedeemed: number;
}

export interface AddOn {
  id: string;
  name: string;
  amount: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  gstin?: string;
  address?: string;
  group: 'Retail' | 'Wholesale' | 'VIP';
  outstandingBalance: number;
  creditLimit: number;
  loyaltyPoints?: number;
  createdAt?: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email?: string;
  gstin?: string;
  address?: string;
  payables: number;
}

export interface Purchase {
  id: string;
  supplierId: string;
  supplierName: string;
  date: string;
  items: any[];
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  paymentStatus: 'PAID' | 'UNPAID' | 'PARTIAL';
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  paymentMethod: string;
  date: string;
  paidTo: string;
  note?: string;
}

export interface HeldBill {
  id: string;
  time: string;
  customerName: string;
  items: any[];
  total: number;
}

export interface CompanySettings {
  name?: string;
  legalName?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
  pan?: string;
  state?: string;
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
  upiId?: string;
  receiptFooter?: string;
}

export interface AuditLog {
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

export interface DashboardStats {
  todaySales?: number;
  todayInvoicesCount?: number;
  totalRevenue?: number;
  outstandingPayments?: number;
  paymentSplit?: { Cash: number; UPI: number; Card: number; Bank: number };
  lowStockCount?: number;
  lowStockAlerts?: Product[];
  topProducts?: { name: string; qty: number }[];
  totalCustomers?: number;
  totalSuppliers?: number;
  totalProductsCount?: number;
  totalInvoices?: number;
}

export interface ReportSummary {
  totalSales?: number;
  cogs?: number;
  grossProfit?: number;
  totalExpenses?: number;
  netProfit?: number;
  totalReceivables?: number;
  totalPayables?: number;
  totalStockValuation?: number;
}

// ============================================================
// Enterprise Phase 1 Types: Multi-Branch, SaaS & RBAC
// ============================================================

export type SubscriptionTier = 'SINGLE_BRANCH' | 'MULTI_BRANCH' | 'NATIONAL_BRANCH';

export interface SubscriptionFeatures {
  interBranchSTN: boolean;
  jobSheets: boolean;
  eInvoicing: boolean;
  eWayBill: boolean;
  asc606Revenue: boolean;
  customRoles: boolean;
  advancedAudit: boolean;
}

export interface SubscriptionEntitlement {
  tier: SubscriptionTier;
  maxBranches: number;
  maxSeats: number;
  maxRegisters: number;
  features: SubscriptionFeatures;
  billingCycle: 'MONTHLY' | 'ANNUAL' | 'LIFETIME';
  expiresAt: string;
}

export type BranchNodeType = 'HEAD_OFFICE' | 'REGIONAL_ZONE' | 'BRANCH_STORE' | 'CENTRAL_WAREHOUSE';

export interface Branch {
  id: string;
  tenantId?: string;
  parentBranchId?: string | null;
  nodeType: BranchNodeType;
  branchCode: string;
  name: string;
  gstin?: string;
  state: string;
  stateCode: string;
  city: string;
  address: string;
  phone?: string;
  email?: string;
  receiptHeader?: string;
  receiptFooter?: string;
  isActive: boolean;
  children?: Branch[];
}

export type STNStatus = 
  | 'DRAFT' 
  | 'DISPATCHED' 
  | 'IN_TRANSIT' 
  | 'RECEIVED' 
  | 'DISCREPANCY_SHORTAGE' 
  | 'CANCELLED';

export interface StockTransferItem {
  itemId: string;
  name: string;
  sku?: string;
  dispatchedQty: number;
  receivedQty?: number;
  discrepancyQty?: number;
  serialNumbers?: string[];
  unitCost: number;
}

export interface StockTransfer {
  id: string;
  stnNumber: string;
  sourceBranchId: string;
  sourceBranchName: string;
  destinationBranchId: string;
  destinationBranchName: string;
  status: STNStatus;
  items: StockTransferItem[];
  totalUnits: number;
  totalValuation: number;
  dispatchDate?: string;
  receivedDate?: string;
  dispatchedBy?: string;
  receivedBy?: string;
  carrierName?: string;
  trackingNumber?: string;
  eWayBillNumber?: string;
  notes?: string;
}

export type StandardRoleKey = 
  | 'SUPER_ADMIN' 
  | 'REGIONAL_MGR' 
  | 'BRANCH_MGR' 
  | 'CASHIER' 
  | 'STOREKEEPER' 
  | 'TECHNICIAN';

export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'approve' | 'export' | 'override' | '*';

export interface RolePermissionMatrix {
  [moduleKey: string]: PermissionAction[];
}

export interface UserRole {
  id: string;
  roleKey: string;
  displayName: string;
  isSystemRole: boolean;
  permissions: RolePermissionMatrix;
}

export interface SystemUser {
  id: string;
  name: string;
  role: string;
  roleId?: string;
  email: string;
  phone: string;
  branchId?: string;
  branchName?: string;
  active: boolean;
  pinCode?: string;
  mfaEnabled?: boolean;
}

export interface POSRegister {
  id: string;
  branchId: string;
  branchName?: string;
  registerCode: string;
  name: string;
  macAddress?: string;
  isActive: boolean;
}

export interface POSShift {
  id: string;
  registerId: string;
  registerCode?: string;
  userId: string;
  userName?: string;
  branchId: string;
  openedAt: string;
  closedAt?: string;
  openingFloatCash: number;
  closingCountedCash?: number;
  expectedCash?: number;
  cashVariance?: number;
  totalSalesAmount: number;
  totalRefundsAmount: number;
  status: 'OPEN' | 'CLOSED' | 'RECONCILED';
}

// ============================================================
// Enterprise Phase 2 Types: Specialized Inventory & Job Sheets
// ============================================================

export type ItemClassification = 'FINISHED_GOOD' | 'SPARE_PART' | 'CONSUMABLE' | 'SERVICE_LABOR';

export interface StorageLocation {
  id: string;
  branchId: string;
  zoneCode: string;
  rackNumber: string;
  shelfTier: string;
  binNumber: string;
  description?: string;
}

export interface SpareCompatibility {
  id: string;
  spareItemId: string;
  spareItemName: string;
  spareSku: string;
  compatibleModelName: string;
  compatibleModelYear?: string;
  notes?: string;
}

export type SerialUnitStatus = 'AVAILABLE' | 'ALLOCATED' | 'SOLD' | 'IN_TRANSIT' | 'UNDER_SERVICE' | 'RMA_SCRAP';

export interface SerialUnit {
  id: string;
  itemId: string;
  itemName: string;
  branchId: string;
  serialOrImei: string;
  status: SerialUnitStatus;
  costPrice: number;
  warrantyMonths: number;
  soldInvoiceId?: string;
}

export type JobSheetStatus = 
  | 'ESTIMATE' 
  | 'IN_PROGRESS' 
  | 'WAITING_SPARE_PARTS' 
  | 'TESTING' 
  | 'READY_FOR_DELIVERY' 
  | 'CLOSED_BILLED' 
  | 'CANCELLED';

export interface JobSheetSpareItem {
  id: string;
  spareItemId: string;
  name: string;
  oemPartNumber?: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  isConsumed: boolean;
  storageBin?: string;
}

export interface ServiceJobSheet {
  id: string;
  jobNumber: string;
  branchId: string;
  branchName?: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  deviceModel: string;
  deviceSerialImei?: string;
  reportedFault: string;
  technicianDiagnostic?: string;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  status: JobSheetStatus;
  spares: JobSheetSpareItem[];
  laborCharges: number;
  sparesTotal: number;
  tax: number;
  grandTotal: number;
  invoiceId?: string;
  createdAt: string;
  completedAt?: string;
}

export interface RMARecord {
  id: string;
  branchId: string;
  branchName?: string;
  itemId: string;
  itemName: string;
  serialOrImei?: string;
  reason: 'DEFECTIVE_OUT_OF_BOX' | 'CUSTOMER_WARRANTY_RETURN' | 'TRANSIT_DAMAGE' | 'SCRAP_OBSOLETE';
  action: 'RETURN_TO_VENDOR' | 'REPLACE_CUSTOMER' | 'SCRAP_WRITE_OFF';
  reportedDate: string;
  status: 'PENDING' | 'DISPATCHED_TO_OEM' | 'CREDIT_RECEIVED' | 'SCRAPPED';
  costLoss: number;
  notes?: string;
}

// ============================================================
// Enterprise Phase 3 Types: POS Tenders, CRM Ledger & Aging
// ============================================================

export interface PaymentTender {
  method: 'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Store Credit' | 'Loyalty Points';
  amount: number;
  referenceTxId?: string;
}

export interface CustomerAgingBucket {
  current: number;       // 0-30 days
  bucket30to60: number;  // 31-60 days
  bucket61to90: number;  // 61-90 days
  bucketOver90: number;  // >90 days
  totalOutstanding: number;
}

export interface CustomerLedgerEntry {
  id: string;
  customerId: string;
  date: string;
  type: 'INVOICE' | 'PAYMENT' | 'CREDIT_NOTE' | 'REFUND';
  referenceId: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface LoyaltyWallet {
  customerId: string;
  customerName?: string;
  pointsBalance: number;
  walletDepositBalance: number;
  tier: 'SILVER' | 'GOLD' | 'PLATINUM';
  lifetimeSpent: number;
}

export interface DebtReminderDispatch {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  channel: 'WHATSAPP' | 'SMS' | 'EMAIL';
  outstandingAmount: number;
  paymentLink: string;
  dispatchedAt: string;
  status: 'SENT' | 'DELIVERED';
}

// ============================================================
// Enterprise Phase 4 Types: PO/GRN, E-Tax & Executive Financials
// ============================================================

export type POStatus = 'DRAFT' | 'ISSUED' | 'PARTIALLY_RECEIVED' | 'FULFILLED' | 'CANCELLED';

export interface PurchaseOrderItem {
  productId: string;
  name: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
  taxRate: number;
  total: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  branchId: string;
  branchName?: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: POStatus;
  isAutoRequisition?: boolean;
}

export interface GRNItem {
  productId: string;
  name: string;
  orderedQty: number;
  receivedQty: number;
  shortageQty: number;
  damagedQty: number;
  acceptedQty: number;
  unitCost: number;
}

export interface GoodsReceivedNote {
  id: string;
  grnNumber: string;
  purchaseOrderId?: string;
  supplierId: string;
  supplierName: string;
  branchId: string;
  branchName?: string;
  receivedDate: string;
  inspectorName: string;
  items: GRNItem[];
  invoiceBillNumber?: string;
  totalAcceptedValue: number;
  discrepancyNotes?: string;
  status: 'ACCEPTED' | 'ACCEPTED_WITH_DISCREPANCY' | 'REJECTED';
}

export interface APPaymentSchedule {
  id: string;
  supplierId: string;
  supplierName: string;
  purchaseBillId: string;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
}

export interface EInvoiceIRN {
  invoiceId: string;
  irn: string;
  ackNo: string;
  ackDate: string;
  signedQrCode: string;
  signedInvoiceData: string;
  status: 'ACTIVE' | 'CANCELLED';
}

export interface EWayBill {
  id: string;
  ewbNumber: string;
  documentType: 'INVOICE' | 'STN';
  docReferenceNo: string;
  sourceGstin: string;
  destGstin: string;
  transporterName: string;
  vehicleNumber: string;
  validUpto: string;
  totalValue: number;
  status: 'GENERATED' | 'IN_TRANSIT' | 'CANCELLED';
}

export interface GSTR1Summary {
  period: string;
  b2bCount: number;
  b2bTaxableValue: number;
  b2bTaxTotal: number;
  b2cCount: number;
  b2cTaxableValue: number;
  b2cTaxTotal: number;
  hsnSummary: { hsnCode: string; description: string; qty: number; taxableValue: number; taxAmount: number }[];
}

export interface GSTR3BSummary {
  period: string;
  outwardTaxableSupplies: number;
  igstPayable: number;
  cgstPayable: number;
  sgstPayable: number;
  eligibleITC: {
    itcIgst: number;
    itcCgst: number;
    itcSgst: number;
  };
  netTaxPayable: number;
}

export interface ASC606RevenueSchedule {
  id: string;
  contractNumber: string;
  customerName: string;
  totalContractValue: number;
  startDate: string;
  endDate: string;
  durationMonths: number;
  monthlyRecognizedRevenue: number;
  earnedRevenueToDate: number;
  deferredRevenueRemaining: number;
  performanceObligation: string;
}

export interface BranchFinancialRanking {
  branchId: string;
  branchName: string;
  totalRevenue: number;
  grossMarginPercent: number;
  netMargin: number;
  invoicesCount: number;
  rank: number;
}

// ============================================================
// Enterprise Advanced Accounting (Double-Entry General Ledger)
// ============================================================

export type AccountCategory = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

export interface ChartOfAccount {
  accountCode: string;       // e.g. '1010' for Cash, '4010' for Sales Revenue
  accountName: string;
  category: AccountCategory;
  normalBalance: 'DEBIT' | 'CREDIT';
  currentBalance: number;
  description?: string;
  isSystemAccount: boolean;
}

export interface JournalLineItem {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  note?: string;
}

export interface JournalEntry {
  id: string;
  voucherNumber: string;
  date: string;
  referenceType: 'POS_SALE' | 'B2B_INVOICE' | 'PURCHASE_BILL' | 'EXPENSE' | 'MANUAL_JOURNAL';
  referenceId: string;
  branchId: string;
  branchName?: string;
  narration: string;
  lines: JournalLineItem[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;       // Debit === Credit
  postedBy: string;
  createdAt: string;
}

export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  category: AccountCategory;
  debitBalance: number;
  creditBalance: number;
}

export interface BalanceSheetStatement {
  asOfDate: string;
  assets: {
    currentAssets: { name: string; amount: number }[];
    totalCurrentAssets: number;
    fixedAssets: { name: string; amount: number }[];
    totalFixedAssets: number;
    totalAssets: number;
  };
  liabilities: {
    currentLiabilities: { name: string; amount: number }[];
    totalCurrentLiabilities: number;
    longTermLiabilities: { name: string; amount: number }[];
    totalLongTermLiabilities: number;
    totalLiabilities: number;
  };
  equity: {
    retainedEarnings: number;
    ownerEquity: number;
    totalEquity: number;
  };
  isBalanced: boolean; // Assets === Liabilities + Equity
}

export interface BankReconciliationRecord {
  id: string;
  bankAccountId: string;
  statementDate: string;
  statementOpeningBalance: number;
  statementClosingBalance: number;
  bookClosingBalance: number;
  uncreditedDeposits: number;
  unpresentedCheques: number;
  reconciledVariance: number;
  status: 'BALANCED' | 'UNRECONCILED';
}


export type SupportedCountry = 'IN' | 'AE' | 'GLOBAL';
export type SupportedLanguage = 'en' | 'ar' | 'hi' | 'kn' | 'ta' | 'te';
export type SupportedCurrency = 'INR' | 'AED' | 'USD';
export type SupportedTimezone = 'Asia/Kolkata' | 'Asia/Dubai' | 'UTC';

export interface CountryTaxConfig {
  countryCode: SupportedCountry;
  countryName: string;
  currency: SupportedCurrency;
  currencySymbol: string;
  currencySubUnit: string; // e.g. 'Paisa' or 'Fils'
  timezone: SupportedTimezone;
  defaultLanguage: SupportedLanguage;
  taxSystem: 'GST' | 'VAT';
  taxRegistrationLabel: 'GSTIN' | 'TRN'; // GSTIN for India, TRN (15 digits) for UAE
  standardTaxRates: number[]; // India: [0, 5, 12, 18, 28], UAE: [0, 5]
  eInvoicingStandard: 'NIC_IRP' | 'ZATCA_PEPPOL_EIDAS'; // India: NIC/IRP, UAE: Federal Tax Authority / E-Invoicing
  taxIdRegex: string; // India: 15-char alpha-numeric, UAE: 15-digit numeric starting with 100
  supportsRTL: boolean; // Arabic RTL support for UAE
}

export interface LocalizationProfile {
  activeCountry: SupportedCountry;
  activeLanguage: SupportedLanguage;
  activeCurrency: SupportedCurrency;
  activeTimezone: SupportedTimezone;
  isRTL: boolean;
  taxConfig: CountryTaxConfig;
}

export interface BilingualReceiptText {
  en: string;
  ar?: string;
  hi?: string;
}

// ============================================================
// System Modular Registry (Admin Module Toggles & Dynamic Navigation)
// ============================================================

export interface SystemModuleConfig {
  id: string;
  name: string;
  category: 'CORE' | 'OPERATIONS' | 'MARKETING' | 'COMPLIANCE' | 'FINANCE';
  description: string;
  isEnabled: boolean;
  isRemovable: boolean;
  requiredPlanTier?: SubscriptionTier;
  iconName: string;
}

// ============================================================
// Multi-Channel Marketing Modules (WhatsApp, Email, Facebook)
// ============================================================

export type MarketingChannel = 'WHATSAPP' | 'EMAIL' | 'FACEBOOK';
export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'PAUSED';

export interface MarketingCampaign {
  id: string;
  channel: MarketingChannel;
  title: string;
  subjectOrHeadline?: string;
  bodyContent: string;
  targetAudience: 'ALL_CUSTOMERS' | 'WHOLESALE_ONLY' | 'RETAIL_ONLY' | 'VIP_ONLY' | 'OVERDUE_CUSTOMERS';
  recipientCount: number;
  deliveredCount: number;
  clickedCount: number;
  conversionCount: number;
  status: CampaignStatus;
  scheduledTime?: string;
  createdAt: string;
  budgetOrCost?: number;
  metaCampaignId?: string; // For Facebook Ads Manager synchronization
}

export interface WhatsAppTemplate {
  id: string;
  templateName: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  bodyText: string;
  variables: string[]; // e.g. {{customer_name}}, {{discount_pct}}, {{payment_link}}
}

export interface EmailMarketingBroadcast {
  id: string;
  subject: string;
  previewText: string;
  senderEmail: string;
  senderName: string;
  htmlContent: string;
  recipientTags: string[];
  sentAt?: string;
  openRatePercent: number;
  clickRatePercent: number;
}

export interface FacebookCatalogSync {
  id: string;
  pixelId?: string;
  catalogId?: string;
  productsSynced: number;
  lastSyncAt: string;
  syncStatus: 'SUCCESS' | 'SYNCING' | 'FAILED';
  autoSyncInventory: boolean;
}

// ============================================================
// Website Visitor Tracking & Lead Generation Module
// ============================================================

export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED_CUSTOMER' | 'JUNK';
export type LeadSource = 'ORGANIC_SEARCH' | 'GOOGLE_ADS' | 'FACEBOOK_ADS' | 'WHATSAPP_CAMPAIGN' | 'DIRECT' | 'REFERRAL';

export interface WebsiteVisitor {
  id: string;
  ipAddress: string;
  city?: string;
  country?: string;
  browser: string;
  operatingSystem: string;
  deviceType: 'DESKTOP' | 'MOBILE' | 'TABLET';
  pageViews: number;
  visitedPages: string[];
  referralUrl: string;
  firstSeenAt: string;
  lastActiveAt: string;
  durationSeconds: number;
  isIdentified: boolean;
  leadId?: string;
}

export interface VehicleMake {
  id: string;
  name: string;
  country?: string;
  popular?: boolean;
  isActive: boolean;
}

export interface VehicleModel {
  id: string;
  makeId: string;
  makeName: string;
  name: string;
  yearFrom?: number;
  yearTo?: number;
  engineType?: string;
}

export interface VehicleCompatibility {
  make: string;
  model: string;
  yearFrom?: number;
  yearTo?: number;
  engineCode?: string;
  chassisCode?: string;
  position?: string;
  side?: string;
  notes?: string;
}

export type AutoPartType = 'GENUINE' | 'OEM' | 'AFTERMARKET' | 'USED' | 'REFURBISHED' | 'UNIVERSAL';

export interface AutomotiveProduct extends Product {
  oemNumber?: string;
  manufacturerPartNo?: string;
  altPartNumbers?: string[];
  partType?: AutoPartType;
  wholesalePrice?: number;
  dealerPrice?: number;
  minSellingPrice?: number;
  rack?: string;
  bin?: string;
  countryOfOrigin?: string;
  warrantyMonths?: number;
  compatibility?: VehicleCompatibility[];
  customFields?: Record<string, any>;
}

export interface StockAdjustment {
  id: string;
  adjustmentNo: string;
  date: string;
  productId: string;
  productName: string;
  sku: string;
  branchId: string;
  warehouseId: string;
  type: 'INCREASE' | 'DECREASE' | 'DAMAGE' | 'MISSING' | 'FOUND' | 'CORRECTION';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  notes?: string;
  approvedBy: string;
}

export interface StockLedgerEntry {
  id: string;
  date: string;
  transactionType: 'SALE' | 'PURCHASE' | 'RETURN' | 'ADJUSTMENT' | 'TRANSFER';
  productId: string;
  productName: string;
  sku: string;
  branchId: string;
  branchName: string;
  qtyIn: number;
  qtyOut: number;
  balanceAfter: number;
  referenceNo: string;
  notes?: string;
  userName: string;
}

export interface SalesReturn {
  id: string;
  creditNoteNo: string;
  date: string;
  originalInvoiceId: string;
  customerId: string;
  customerName: string;
  branchId: string;
  items: Array<{
    productId?: string;
    name: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
  }>;
  subtotal: number;
  taxRefund: number;
  grandTotalRefund: number;
  returnReason: string;
  restockCondition: 'RESALABLE' | 'DAMAGED' | 'SCRAP';
  refundMethod: 'CASH' | 'CARD' | 'CREDIT_WALLET';
  status: string;
  notes?: string;
}

export interface CashRegisterShift {
  id: string;
  registerId: string;
  branchId: string;
  openedAt: string;
  closedAt: string | null;
  cashierId: string;
  cashierName: string;
  openingFloatCash: number;
  cashSales: number;
  cardSales: number;
  creditSales: number;
  cashExpenses: number;
  closingCountedCash?: number;
  expectedCash?: number;
  cashVariance?: number;
  status: 'OPEN' | 'CLOSED';
  notes?: string;
}

export interface DynamicCustomField {
  id: string;
  targetEntity: 'products' | 'customers' | 'invoices' | 'suppliers';
  fieldKey: string;
  fieldLabel: string;
  fieldType: 'text' | 'number' | 'date' | 'dropdown' | 'toggle' | 'currency';
  isRequired: boolean;
  isVisible: boolean;
  options?: string[];
  displayOrder: number;
}

export interface ThemeConfig {
  themeMode: 'light' | 'dark';
  primaryColor: string;
  accentColor: string;
  sidebarColor: string;
  buttonRadius: string;
  cardRadius: string;
  tableDensity: 'compact' | 'normal' | 'spacious';
  fontSize: string;
  fontFamily: string;
}

export interface LoginDesignerConfig {
  companyName: string;
  loginHeading: string;
  subtitle: string;
  announcementText: string;
  logoUrl?: string;
  backgroundColor: string;
  buttonColor: string;
  showLanguageSelector: boolean;
  showPasswordRecovery: boolean;
  contactSupportUrl?: string;
}








