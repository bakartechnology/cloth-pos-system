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
  ACTIVE_STAFF_ID: 'anf_pos_active_staff_id_v1',
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

  // Domain accessors with default seeding
  getProducts() {
    return this.getItem(KEYS.PRODUCTS, INITIAL_PRODUCTS);
  }

  setProducts(data: typeof INITIAL_PRODUCTS) {
    this.setItem(KEYS.PRODUCTS, data);
  }

  getCustomers() {
    return this.getItem(KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  }

  setCustomers(data: typeof INITIAL_CUSTOMERS) {
    this.setItem(KEYS.CUSTOMERS, data);
  }

  getStaff() {
    return this.getItem(KEYS.STAFF, INITIAL_STAFF);
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

  getSettings() {
    return this.getItem(KEYS.SETTINGS, INITIAL_SETTINGS);
  }

  setSettings(data: typeof INITIAL_SETTINGS) {
    this.setItem(KEYS.SETTINGS, data);
  }

  getActiveStaffId(): string {
    return this.getItem(KEYS.ACTIVE_STAFF_ID, 'stf-001'); // Default to Admin
  }

  setActiveStaffId(id: string) {
    this.setItem(KEYS.ACTIVE_STAFF_ID, id);
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
    window.location.reload();
  }
}

export const storageService = new StorageService();
