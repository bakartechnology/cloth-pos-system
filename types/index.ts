export type UnitType =
  | 'Thaan'
  | 'Meter'
  | 'Unstitched Box'
  | 'Suit Packet'
  | 'Cut Piece';

export type ProductCategory =
  | 'Lawn'
  | 'Cotton'
  | 'Khaddar'
  | 'Wash & Wear'
  | 'Unstitched'
  | 'Suit'
  | 'Shalwar Kameez'
  | 'Cut Piece'
  | 'Thaan'
  | 'Silk & Chiffon';

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: ProductCategory;
  subcategory: string;
  unit: UnitType;
  retailPrice: number;
  wholesalePrice: number;
  costPrice: number;
  stock: number;
  minStockAlert: number;
  supplier: string;
  description: string;
  barcode: string;
  wholesaleBarcode: string;
  image?: string;
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
  totalPurchased: number;
  totalPaid: number;
  lastTransactionDate?: string;
  createdAt: string;
}

export type SaleType = 'Retail' | 'Wholesale' | 'Khata';

export type PaymentMethod = 'Cash' | 'Card' | 'Bank Transfer' | 'Credit/Khata' | 'Other';

export interface CartItem {
  product: Product;
  quantity: number;
  price: number; // retailPrice or wholesalePrice depending on POS mode
  discountPercent: number;
  lineTotal: number;
}

export interface BillItem {
  productId: string;
  productName: string;
  sku: string;
  unit: UnitType;
  quantity: number;
  price: number;
  discountPercent: number;
  subtotal: number;
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
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerBusiness?: string;
  notes?: string;
  status: 'Completed' | 'Returned' | 'Draft' | 'Partially Returned' | 'Exchanged';
  returns?: ReturnTransaction[];
  exchanges?: ExchangeTransaction[];
  createdAt?: string;
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
  | 'barcode_view'
  | 'customers_view'
  | 'bills_view'
  | 'reports_view'
  | 'staff_view'
  | 'attendance_view'
  | 'payment_collection'
  | 'settings_view';

export interface Staff {
  id: string;
  name: string;
  phone: string;
  username: string;
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
  newBalance: number;
  paymentMethod: PaymentMethod;
  date: string;
  notes?: string;
  receiptNumber: string;
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
}
