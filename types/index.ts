export type UnitType =
  | 'Thaan'
  | 'Meter'
  | 'Unstitched Box'
  | 'Suit Box'
  | 'Suit Packet'
  | 'Stitched Suit'
  | 'Cut Piece'
  | '3-Piece Box (3PC)'
  | '2-Piece Suit (2PC)'
  | '1-Piece'
  | '1-Piece / Kurti'
  | 'Suit Packet (Standard 4.5m / 4.0m)'
  | 'Suit (4.5m)'
  | 'Men Suit'
  | 'Thaan (Roll: 20m - 40m)'
  | 'Thaan (Roll: 30m - 40m)'
  | 'Meter (Running Yardage)'
  | 'Dupatta / Shawl'
  | (string & {});

export type ProductCategory =
  | 'Cotton Suit'
  | 'Wash & Wear'
  | 'Blended Fabric'
  | 'Lawn'
  | 'Cambric'
  | 'Khaddar'
  | 'Linen'
  | 'Boski'
  | 'Karandi'
  | 'Latha'
  | 'Tropical'
  | 'Wool'
  | 'Tweed'
  | 'Flannel'
  | 'Fleece'
  | 'Velvet'
  | 'Pashmina-style Fabric'
  | 'Blended Wool'
  | 'Heavy Khaddar'
  | 'Winter Wash & Wear'
  | 'Chiffon'
  | 'Georgette'
  | 'Silk'
  | 'Satin'
  | 'Organza'
  | 'Net'
  | 'Marina'
  | 'Jacquard'
  | 'Embroidered Fabric'
  | 'Printed Fabric'
  | 'Plain Fabric'
  | 'Cotton'
  | 'Silk & Chiffon'
  | 'Unstitched'
  | 'Suit'
  | 'Shalwar Kameez'
  | 'Cut Piece'
  | 'Thaan'
  | (string & {});

export type SeasonCategory = 'Summer' | 'Winter';

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: ProductCategory;
  seasonCategory?: SeasonCategory;
  subcategory: string;
  unit: UnitType;
  channel?: 'Retail' | 'Wholesale' | 'Both';
  retailPrice: number;
  wholesalePrice: number;
  khataPrice?: number;
  costPrice?: number;
  taxRate?: number;
  retailDiscount?: number;
  wholesaleDiscount?: number;
  khataDiscount?: number;
  stock: number;
  minStockAlert: number;
  wholesaleMinStockAlert?: number;
  retailMinStockAlert?: number;
  supplier: string;
  description: string;
  barcode: string;
  wholesaleBarcode?: string;
  suitBarcode?: string;
  image?: string;
  packagingConfig?: {
    type?: 'box' | 'thaan' | 'suit';
    suitsPerBox?: number;
    totalBoxes?: number;
    wholesaleBoxes?: number;
    retailBoxes?: number;
    retailSuitsPerBox?: number;
    wholesaleMinStockAlert?: number;
    retailMinStockAlert?: number;
    pricePerSuit?: number;
    retailPricePerSuit?: number;
    boxRetailPrice?: number;
    boxWholesalePrice?: number;
    thaanMeasurement?: 'Meter' | 'Yard';
    retailThaanMeasurement?: 'Meter' | 'Yard';
    thaanType?: 'Single' | '3Thaan' | 'Sets';
    retailThaanType?: 'Single' | '3Thaan' | 'Sets';
    thaanLengthMode?: 'Equal' | 'Individual';
    thaanEqualLength?: number;
    retailThaanEqualLength?: number;
    thaanKameezLength?: number;
    thaanShalwarLength?: number;
    thaanDupattaLength?: number;
    totalLength?: number;
    totalRolls?: number;
    retailTotalRolls?: number;
    perUnitRate?: number;
    retailPerUnitRate?: number;
    thaanRetailRollPrice?: number;
    thaanSetsCount?: number;
    retailThaanSetsCount?: number;
    thaanSetType?: string;
    retailThaanSetType?: string;
    thaanSuitsPerSet?: number;
    retailThaanSuitsPerSet?: number;
    thaanSetWholesaleRate?: number;
    thaanSetRetailRate?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export type CustomerType = 'Retail' | 'Wholesale' | 'Khata';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  type: CustomerType;
  businessName?: string;
  creditLimit: number;
  currentBalance: number; // positive = customer owes store (debit)
  balance?: number; // alias for currentBalance
  totalPurchased: number;
  totalPaid: number;
  lastTransactionDate?: string;
  createdAt: string;
}

export type SaleType = 'Retail' | 'Wholesale' | 'Khata';

export type PaymentMethod = 'Cash' | 'Card' | 'Bank Transfer' | 'Credit/Khata' | 'Cheque' | 'Split' | 'Other';

export type SplitMode = 'CashCard' | 'CashBank' | 'CashCheque' | 'BankCheque' | 'CashBankCheque';

export interface SplitPaymentDetail {
  mode?: SplitMode;
  cashAmount: number;
  bankAmount?: number;
  chequeAmount?: number;
  primaryMethod?: 'Cash' | 'Bank Transfer';
  primaryAmount?: number;
  secondaryMethod: 'Card' | 'Bank Transfer' | 'Cheque';
  secondaryAmount: number;
  cardTransactionId?: string;
  bankDetails?: {
    bankId: string;
    bankName: string;
    accountTitle: string;
    accountNumber: string;
    iban: string;
    confirmedByStaffId: string;
    confirmedByStaffName: string;
    confirmedAt: string;
  };
  slipReference?: string;
  // Cheque details for Cash + Cheque or Bank Transfer + Cheque
  chequeNumber?: string;
  chequeBankName?: string;
  chequeClearingDate?: string; // YYYY-MM-DD (date & month)
  chequeStatus?: 'Pending' | 'Passed' | 'Bounced';
  chequePassedAt?: string;
  // Multiple cheques support
  cheques?: {
    id: string;
    bankName: string;
    chequeNumber?: string;
    amount: number;
    clearingDate: string;
    status?: 'Pending' | 'Passed' | 'Bounced';
  }[];
}

export interface ChequeItem {
  id: string;
  chequeAmount: number;
  clearingDate: string; // YYYY-MM-DD
  chequeNumber?: string;
  bankName?: string;
  status?: 'Pending' | 'Passed' | 'Bounced';
  passedAt?: string;
  invoiceNumber?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  saleType?: SaleType;
}

export interface ChequeDetails {
  chequeCount?: number;
  chequeNumber?: string;
  chequeAmount?: number;
  clearingDate?: string; // Date cheque is scheduled to clear / pass
  bankName?: string;
}

export interface StaffKhataCheque {
  id: string;
  amount: number;
  chequeNumber?: string;
  bankName?: string;
  passingDate?: string;
}

export interface StaffKhataRecord {
  id: string;
  recordNumber: string;
  staffId?: string;
  staffName: string;
  cities: string[];
  date: string;
  cashAmount: number;
  cheques: StaffKhataCheque[];
  chequeCount: number;
  totalChequeAmount: number;
  grandTotal: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  price: number; // retailPrice or wholesalePrice depending on POS mode
  selectedUnit?: 'Box' | 'Suit' | string; // For Box products sold as full Box or single Suit
  discountPerUnit?: number; // fixed discount in Rs per unit (catalog discount)
  discountPercent: number; // percentage discount (for retail or backwards compatibility)
  extraDiscountRupees?: number; // fixed manual extra discount in Rs. per unit
  lineTotal: number;
}

export interface BillItem {
  productId: string;
  productName: string;
  sku: string;
  unit: UnitType;
  selectedUnit?: 'Box' | 'Suit' | string;
  quantity: number;
  price: number;
  discountPerUnit?: number;
  discountPercent: number;
  extraDiscountRupees?: number;
  subtotal: number;
  lineTotal?: number;
}

export interface ReturnItemDetail {
  productId: string;
  productName: string;
  sku: string;
  unit: UnitType;
  quantityReturned: number;
  originalPrice: number;
  refundAmount: number;
}

export interface ReturnTransaction {
  id: string;
  originalInvoiceNumber: string;
  date: string;
  items: ReturnItemDetail[];
  totalRefundAmount: number;
  reason: string;
  staffId: string;
  staffName: string;
  customerName?: string;
  notes?: string;
}

export interface ExchangeTransaction {
  id: string;
  originalInvoiceNumber: string;
  date: string;
  returnedItem: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  };
  newItem: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  };
  priceDifference: number; // positive: customer pays, negative: refund due, 0: even
  amountPaidOrRefunded: number;
  staffId: string;
  staffName: string;
  customerName?: string;
  notes?: string;
}

export interface Bill {
  id: string;
  invoiceNumber: string;
  saleType: SaleType;
  date: string;
  items: BillItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  amountReceived: number;
  changeDue: number;
  cardTransactionId?: string;
  staffId: string;
  staffName: string;
  counter?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerBusiness?: string;
  clientId?: string;
  clientName?: string;
  bankDetails?: {
    bankId: string;
    bankName: string;
    accountTitle: string;
    accountNumber: string;
    iban: string;
    confirmedByStaffId: string;
    confirmedByStaffName: string;
    confirmedAt: string;
  };
  splitPayment?: SplitPaymentDetail;
  notes?: string;
  pandiId?: string;
  pandiName?: string;
  pandiPhone?: string;
  status: 'Completed' | 'Returned' | 'Draft' | 'Partially Returned' | 'Exchanged';
  returns?: ReturnTransaction[];
  exchanges?: ExchangeTransaction[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Pandi {
  id: string;
  name: string;
  phone: string;
  cnic?: string;
  transportMode: 'Rehri / Handcart' | 'Loader Rickshaw' | 'Motorcycle' | 'On Foot' | 'Cargo / Builty' | 'Other';
  marketZone?: string;
  status: 'Active' | 'Inactive';
  notes?: string;
  totalTrips?: number;
  createdAt: string;
  updatedAt?: string;
}

export type HardwareStatusType = 'connected' | 'ready' | 'simulated' | 'error' | 'disconnected';

export interface HardwareStatus {
  barcodeScanner: {
    status: HardwareStatusType;
    label: string;
    description: string;
  };
  receiptPrinter: {
    status: HardwareStatusType;
    label: string;
    description: string;
  };
  cashDrawer: {
    status: HardwareStatusType;
    label: string;
    description: string;
  };
  cardTerminal: {
    status: HardwareStatusType;
    label: string;
    description: string;
  };
}

export type KhataTransactionType = 'DEBIT' | 'CREDIT';

export interface KhataTransaction {
  id: string;
  customerId: string;
  customerName: string;
  date: string;
  invoiceId?: string;
  type: KhataTransactionType; // DEBIT = sale (increases balance owed), CREDIT = payment received (decreases balance)
  amount: number;
  balanceAfter: number;
  description: string;
  staffId: string;
  staffName: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
}

export type StaffRole =
  | 'Admin'
  | 'Retail Cashier'
  | 'Wholesale Cashier'
  | 'Khata Staff'
  | 'Stock Manager'
  | 'Payment Collection Staff';

export type PermissionKey =
  | 'dashboard_view'
  | 'pos_retail'
  | 'pos_wholesale'
  | 'pos_khata'
  | 'stock_view'
  | 'stock_add'
  | 'stock_edit'
  | 'stock_delete'
  | 'catalog_view'
  | 'discount_view'
  | 'barcode_view'
  | 'customers_view'
  | 'khata_ledger_view'
  | 'retail_statement_view'
  | 'wholesale_statement_view'
  | 'bills_view'
  | 'payment_collection'
  | 'wholesale_recovery'
  | 'staff_khata'
  | 'pandi_view'
  | 'pandi_manage'
  | 'reports_view'
  | 'staff_view'
  | 'staff_create'
  | 'staff_edit'
  | 'attendance_view'
  | 'cheque_notifications'
  | 'settings_view'
  | 'action_print'
  | 'action_export_pdf';

export interface Staff {
  id: string;
  name: string;
  phone: string;
  username: string;
  password?: string;
  role: StaffRole;
  status: 'Active' | 'Inactive';
  counter: string;
  permissions: PermissionKey[];
  avatar?: string;
  joinedDate: string;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Leave';

export interface StaffAttendance {
  id: string;
  staffId: string;
  staffName: string;
  role: StaffRole;
  date: string;
  checkIn: string;
  checkOut?: string;
  workingHours: number;
  status: AttendanceStatus;
  notes?: string;
}

export interface PaymentCollectionRecord {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerCity: string;
  staffId: string;
  staffName: string;
  previousBalance: number;
  amountCollected: number;
  cashAmount?: number;
  chequeAmount?: number;
  cheques?: ChequeItem[];
  newBalance: number;
  paymentMethod: PaymentMethod;
  date: string;
  notes?: string;
  receiptNumber: string;
  chequeDetails?: ChequeDetails;
  collectionType?: 'Khata' | 'Wholesale';
  clientId?: string;
  clientName?: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  movementType: 'Sale' | 'Restock' | 'Return' | 'Adjustment' | 'Initial';
  quantityChange: number; // negative for sales, positive for restock
  previousStock: number;
  newStock: number;
  date: string;
  staffName: string;
  referenceId?: string; // Bill ID or Supplier PO
  notes?: string;
}

export type POSChannel = 'Retail' | 'Wholesale' | 'Khata';

export interface BankAccount {
  id: string;
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  iban: string;
  branchName?: string;
  isActive: boolean;
  channels?: POSChannel[];
}

export interface CardTerminalConfig {
  enabled?: boolean;
  terminalName?: string;
  connectionType?: 'Wired (USB / Ethernet)' | 'Wireless (Wi-Fi / Bluetooth)';
  deviceModel?: string;
  ipOrPort?: string;
  merchantId?: string;
  autoPrintSlip?: boolean;
}

export type StoreBusinessMode = 'Retail' | 'Wholesale' | 'Both';

export interface StoreSettings {
  storeName: string;
  storeTagline: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  ntnNumber: string;
  currency: 'PKR' | 'Rs.';
  defaultTaxRate: number;
  allowNegativeStock: boolean;
  lowStockThreshold: number;
  receiptFooterMessage: string;
  dataRetentionYears: number;
  bankAccounts?: BankAccount[];
  retailCardTerminal?: CardTerminalConfig;
  wholesaleCardTerminal?: CardTerminalConfig;
  khataCardTerminal?: CardTerminalConfig;
  defaultFabricGender?: 'Male' | 'Female' | 'Both';
  storeBusinessMode?: StoreBusinessMode;
}

export interface WholesaleSessionDraft {
  id: string;
  staffId: string;
  timestamp: string;
  customerName?: string;
  selectedClient?: Customer | null;
  cartItems: CartItem[];
  paymentMethod: PaymentMethod;
  amountReceived: number;
  selectedBankId?: string;
  bankPaymentConfirmed?: boolean;
  notes?: string;
  subtotal: number;
  grandTotal: number;
}

export type KhataSessionDraft = WholesaleSessionDraft;


