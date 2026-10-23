import { Product, Pandi, StoreSettings } from '@/types';
import {
  INITIAL_PRODUCTS,
  INITIAL_CUSTOMERS,
  INITIAL_STAFF,
  INITIAL_BILLS,
  INITIAL_KHATA_TRANSACTIONS,
  INITIAL_PAYMENT_COLLECTIONS,
  INITIAL_ATTENDANCE,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_SETTINGS,
  INITIAL_PANDIS,
} from '@/data/mockData';

const KEYS = {
  PRODUCTS: 'anf_pos_products_v1',
  CUSTOMERS: 'anf_pos_customers_v1',
  STAFF: 'anf_pos_staff_v1',
  BILLS: 'anf_pos_bills_v1',
  KHATA: 'anf_pos_khata_tx_v1',
  COLLECTIONS: 'anf_pos_collections_v1',
  ATTENDANCE: 'anf_pos_attendance_v1',
  MOVEMENTS: 'anf_pos_stock_mov_v1',
  SETTINGS: 'anf_pos_settings_v1',
  PANDIS: 'anf_pos_pandis_v1',
  ACTIVE_STAFF_ID: 'anf_pos_active_staff_id_v1',
  RETAIL_INVOICE_SEQ: 'anf_pos_retail_invoice_seq_v1',
  WHOLESALE_INVOICE_SEQ: 'anf_pos_wholesale_invoice_seq_v1',
  KHATA_INVOICE_SEQ: 'anf_pos_khata_invoice_seq_v1',
  WHOLESALE_RETURN_SEQ: 'anf_pos_wholesale_return_seq_v1',
  WHOLESALE_EXCHANGE_SEQ: 'anf_pos_wholesale_exchange_seq_v1',
  RETURNS: 'anf_pos_returns_v1',
  EXCHANGES: 'anf_pos_exchanges_v1',
};

class StorageService {
  private isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  getItem<T>(key: string, fallback: T): T {
    if (!this.isBrowser()) return fallback;
    try {
      const stored = localStorage.getItem(key);
      if (!stored) {
        this.setItem(key, fallback);
        return fallback;
      }
      return JSON.parse(stored) as T;
    } catch {
      return fallback;
    }
  }

  setItem<T>(key: string, value: T): void {
    if (!this.isBrowser()) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`StorageService error writing key ${key}:`, e);
    }
  }

  removeItem(key: string): void {
    if (!this.isBrowser()) return;
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error(`StorageService error removing key ${key}:`, e);
    }
  }

  // Domain accessors with default seeding
  getProducts(): Product[] {
    const products = this.getItem<Product[]>(KEYS.PRODUCTS, INITIAL_PRODUCTS);
    return products.map(p => ({
      ...p,
      seasonCategory: p.seasonCategory || (['Khaddar', 'Wash & Wear'].includes(p.category) ? 'Winter' : 'Summer'),
      retailDiscount: typeof p.retailDiscount === 'number' ? p.retailDiscount : 0,
      wholesaleDiscount: typeof p.wholesaleDiscount === 'number' ? p.wholesaleDiscount : 0,
      khataPrice: typeof p.khataPrice === 'number' ? p.khataPrice : (p.wholesalePrice ? Math.round(p.wholesalePrice * 1.05) : undefined),
      khataDiscount: typeof p.khataDiscount === 'number' ? p.khataDiscount : 0,
    }));
  }

  setProducts(data: Product[]) {
    this.setItem(KEYS.PRODUCTS, data);
  }

  getCustomers() {
    return this.getItem(KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  }

  setCustomers(data: typeof INITIAL_CUSTOMERS) {
    this.setItem(KEYS.CUSTOMERS, data);
  }

  getStaff() {
    const staff = this.getItem(KEYS.STAFF, INITIAL_STAFF);
    // Enforce that ONLY Admin role has dashboard_view permission
    return staff.map(s => {
      if (s.role !== 'Admin') {
        return {
          ...s,
          permissions: s.permissions.filter(p => p !== 'dashboard_view'),
        };
      }
      return s;
    });
  }

  setStaff(data: typeof INITIAL_STAFF) {
    this.setItem(KEYS.STAFF, data);
  }

  getBills() {
    return this.getItem(KEYS.BILLS, INITIAL_BILLS);
  }

  setBills(data: typeof INITIAL_BILLS) {
    this.setItem(KEYS.BILLS, data);
  }

  getKhataTransactions() {
    return this.getItem(KEYS.KHATA, INITIAL_KHATA_TRANSACTIONS);
  }

  setKhataTransactions(data: typeof INITIAL_KHATA_TRANSACTIONS) {
    this.setItem(KEYS.KHATA, data);
  }

  getCollections() {
    return this.getItem(KEYS.COLLECTIONS, INITIAL_PAYMENT_COLLECTIONS);
  }

  setCollections(data: typeof INITIAL_PAYMENT_COLLECTIONS) {
    this.setItem(KEYS.COLLECTIONS, data);
  }

  getAttendance() {
    return this.getItem(KEYS.ATTENDANCE, INITIAL_ATTENDANCE);
  }

  setAttendance(data: typeof INITIAL_ATTENDANCE) {
    this.setItem(KEYS.ATTENDANCE, data);
  }

  getStockMovements() {
    return this.getItem(KEYS.MOVEMENTS, INITIAL_STOCK_MOVEMENTS);
  }

  setStockMovements(data: typeof INITIAL_STOCK_MOVEMENTS) {
    this.setItem(KEYS.MOVEMENTS, data);
  }

  getSettings(): StoreSettings {
    const s = this.getItem<StoreSettings>(KEYS.SETTINGS, INITIAL_SETTINGS);
    return {
      ...s,
      defaultFabricGender: s.defaultFabricGender || 'Both',
      storeBusinessMode: s.storeBusinessMode || 'Both',
    };
  }

  setSettings(data: StoreSettings) {
    this.setItem(KEYS.SETTINGS, data);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('anf_settings_updated'));
    }
  }

  getPandis(): Pandi[] {
    return this.getItem(KEYS.PANDIS, INITIAL_PANDIS);
  }

  setPandis(data: Pandi[]) {
    this.setItem(KEYS.PANDIS, data);
  }

  getActiveStaffId(): string | null {
    if (!this.isBrowser()) return null;
    try {
      const stored = localStorage.getItem(KEYS.ACTIVE_STAFF_ID);
      if (!stored) return null;
      return JSON.parse(stored) as string;
    } catch {
      return null;
    }
  }

  setActiveStaffId(id: string | null) {
    if (!id) {
      this.removeItem(KEYS.ACTIVE_STAFF_ID);
    } else {
      this.setItem(KEYS.ACTIVE_STAFF_ID, id);
    }
  }

  clearActiveStaff() {
    this.removeItem(KEYS.ACTIVE_STAFF_ID);
  }

  getNextRetailInvoiceNumber(): string {
    const currentYear = new Date().getFullYear();
    const currentSeq = this.getItem<number>(KEYS.RETAIL_INVOICE_SEQ, 1245);
    const nextSeq = currentSeq + 1;
    this.setItem(KEYS.RETAIL_INVOICE_SEQ, nextSeq);
    const padded = String(nextSeq).padStart(6, '0');
    return `RET-${currentYear}-${padded}`;
  }

  peekNextRetailInvoiceNumber(): string {
    const currentYear = new Date().getFullYear();
    const currentSeq = this.getItem<number>(KEYS.RETAIL_INVOICE_SEQ, 1245);
    const nextSeq = currentSeq + 1;
    const padded = String(nextSeq).padStart(6, '0');
    return `RET-${currentYear}-${padded}`;
  }

  getNextWholesaleInvoiceNumber(): string {
    const currentYear = new Date().getFullYear();
    const currentSeq = this.getItem<number>(KEYS.WHOLESALE_INVOICE_SEQ, 1000);
    const nextSeq = currentSeq + 1;
    this.setItem(KEYS.WHOLESALE_INVOICE_SEQ, nextSeq);
    const padded = String(nextSeq).padStart(6, '0');
    return `WHO-${currentYear}-${padded}`;
  }

  peekNextWholesaleInvoiceNumber(): string {
    const currentYear = new Date().getFullYear();
    const currentSeq = this.getItem<number>(KEYS.WHOLESALE_INVOICE_SEQ, 1000);
    const nextSeq = currentSeq + 1;
    const padded = String(nextSeq).padStart(6, '0');
    return `WHO-${currentYear}-${padded}`;
  }

  getNextKhataInvoiceNumber(): string {
    const currentYear = new Date().getFullYear();
    const currentSeq = this.getItem<number>(KEYS.KHATA_INVOICE_SEQ, 1000);
    const nextSeq = currentSeq + 1;
    this.setItem(KEYS.KHATA_INVOICE_SEQ, nextSeq);
    const padded = String(nextSeq).padStart(6, '0');
    return `KHT-${currentYear}-${padded}`;
  }

  peekNextKhataInvoiceNumber(): string {
    const currentYear = new Date().getFullYear();
    const currentSeq = this.getItem<number>(KEYS.KHATA_INVOICE_SEQ, 1000);
    const nextSeq = currentSeq + 1;
    const padded = String(nextSeq).padStart(6, '0');
    return `KHT-${currentYear}-${padded}`;
  }

  getNextWholesaleReturnNumber(): string {
    const currentYear = new Date().getFullYear();
    const currentSeq = this.getItem<number>(KEYS.WHOLESALE_RETURN_SEQ, 100);
    const nextSeq = currentSeq + 1;
    this.setItem(KEYS.WHOLESALE_RETURN_SEQ, nextSeq);
    const padded = String(nextSeq).padStart(6, '0');
    return `RET-WHO-${currentYear}-${padded}`;
  }

  getNextWholesaleExchangeNumber(): string {
    const currentYear = new Date().getFullYear();
    const currentSeq = this.getItem<number>(KEYS.WHOLESALE_EXCHANGE_SEQ, 100);
    const nextSeq = currentSeq + 1;
    this.setItem(KEYS.WHOLESALE_EXCHANGE_SEQ, nextSeq);
    const padded = String(nextSeq).padStart(6, '0');
    return `EXC-WHO-${currentYear}-${padded}`;
  }

  getReturns() {
    return this.getItem(KEYS.RETURNS, []);
  }

  setReturns(data: unknown[]) {
    this.setItem(KEYS.RETURNS, data);
  }

  getExchanges() {
    return this.getItem(KEYS.EXCHANGES, []);
  }

  setExchanges(data: unknown[]) {
    this.setItem(KEYS.EXCHANGES, data);
  }

  resetAllData() {
    if (!this.isBrowser()) return;
    localStorage.removeItem(KEYS.PRODUCTS);
    localStorage.removeItem(KEYS.CUSTOMERS);
    localStorage.removeItem(KEYS.STAFF);
    localStorage.removeItem(KEYS.BILLS);
    localStorage.removeItem(KEYS.KHATA);
    localStorage.removeItem(KEYS.COLLECTIONS);
    localStorage.removeItem(KEYS.ATTENDANCE);
    localStorage.removeItem(KEYS.MOVEMENTS);
    localStorage.removeItem(KEYS.SETTINGS);
    localStorage.removeItem(KEYS.ACTIVE_STAFF_ID);
    localStorage.removeItem(KEYS.RETAIL_INVOICE_SEQ);
    localStorage.removeItem(KEYS.WHOLESALE_INVOICE_SEQ);
    localStorage.removeItem(KEYS.KHATA_INVOICE_SEQ);
    localStorage.removeItem(KEYS.WHOLESALE_RETURN_SEQ);
    localStorage.removeItem(KEYS.WHOLESALE_EXCHANGE_SEQ);
    window.location.reload();
  }
}

export const storageService = new StorageService();
