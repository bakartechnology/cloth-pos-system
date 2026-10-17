import { Pandi, Bill } from '@/types';
import { storageService } from './storageService';
import { salesService } from './salesService';

export const pandisService = {
  getAll(): Pandi[] {
    return storageService.getPandis();
  },

  getActive(): Pandi[] {
    return storageService.getPandis().filter(p => p.status === 'Active');
  },

  getById(id: string): Pandi | undefined {
    return storageService.getPandis().find(p => p.id === id);
  },

  search(query: string): Pandi[] {
    const list = storageService.getPandis();
    const q = (query || '').toLowerCase().trim();
    if (!q) return list;

    return list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.phone && p.phone.includes(q)) ||
      (p.marketZone && p.marketZone.toLowerCase().includes(q)) ||
      (p.transportMode && p.transportMode.toLowerCase().includes(q))
    );
  },

  add(data: Omit<Pandi, 'id' | 'createdAt'>): Pandi {
    const pandis = storageService.getPandis();
    const newPandi: Pandi = {
      ...data,
      id: `pnd-${Date.now().toString().slice(-6)}`,
      totalTrips: data.totalTrips || 0,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString(),
    };

    storageService.setPandis([newPandi, ...pandis]);
    return newPandi;
  },

  update(id: string, updates: Partial<Pandi>): Pandi | undefined {
    const pandis = storageService.getPandis();
    const index = pandis.findIndex(p => p.id === id);
    if (index === -1) return undefined;

    const updated: Pandi = {
      ...pandis[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    pandis[index] = updated;
    storageService.setPandis([...pandis]);
    return updated;
  },

  delete(id: string): boolean {
    const pandis = storageService.getPandis();
    const filtered = pandis.filter(p => p.id !== id);
    if (filtered.length === pandis.length) return false;
    storageService.setPandis(filtered);
    return true;
  },

  findOrCreateByName(name: string, phone?: string): Pandi {
    const clean = (name || '').trim();
    if (!clean) throw new Error('Pandi name cannot be empty');

    const pandis = storageService.getPandis();
    const existing = pandis.find(p => p.name.toLowerCase().trim() === clean.toLowerCase());
    if (existing) {
      if (phone && !existing.phone) {
        return this.update(existing.id, { phone }) || existing;
      }
      return existing;
    }

    return this.add({
      name: clean,
      phone: phone || '',
      transportMode: 'Rehri / Handcart',
      marketZone: 'Main Cloth Market',
      status: 'Active',
      totalTrips: 0,
    });
  },

  /**
   * Retrieves all bills / dispatches carried by this Pandi
   * matching optional date / month / year filter
   */
  getPandiOrders(
    pandiIdentifier: string, // ID or Name
    filters?: { date?: string; month?: string; year?: string }
  ): Bill[] {
    const allBills = storageService.getBills();
    const cleanIdentifier = (pandiIdentifier || '').toLowerCase().trim();

    return allBills.filter(bill => {
      // Check if bill has this Pandi either by ID, Name or in Notes
      const matchesPandi =
        (bill.pandiId && bill.pandiId.toLowerCase() === cleanIdentifier) ||
        (bill.pandiName && bill.pandiName.toLowerCase().includes(cleanIdentifier)) ||
        (bill.notes && bill.notes.toLowerCase().includes(cleanIdentifier));

      if (!matchesPandi) return false;

      const billDate = new Date(bill.date);
      const billDateStr = billDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const billYearStr = billDate.getFullYear().toString();
      const billMonthStr = `${billYearStr}-${String(billDate.getMonth() + 1).padStart(2, '0')}`;

      if (filters?.date && billDateStr !== filters.date) {
        return false;
      }
      if (filters?.month && billMonthStr !== filters.month) {
        return false;
      }
      if (filters?.year && filters.year !== 'All' && billYearStr !== filters.year) {
        return false;
      }

      return true;
    });
  },

  /**
   * Summary statistics for a specific Pandi
   */
  getPandiMetrics(pandi: Pandi, filters?: { date?: string; month?: string; year?: string }) {
    const orders = this.getPandiOrders(pandi.name, filters);
    const todayStr = new Date().toISOString().split('T')[0];
    const todayOrders = this.getPandiOrders(pandi.name, { date: todayStr });

    const totalOrders = orders.length;
    const totalAmount = orders.reduce((sum, b) => sum + (b.grandTotal || 0), 0);

    // Group orders by unique customer/client
    const clientsMap = new Map<string, { name: string; count: number; total: number }>();
    orders.forEach(b => {
      const clientKey = b.clientName || b.customerName || 'Walk-in';
      const existing = clientsMap.get(clientKey) || { name: clientKey, count: 0, total: 0 };
      existing.count += 1;
      existing.total += b.grandTotal || 0;
      clientsMap.set(clientKey, existing);
    });

    return {
      todayCount: todayOrders.length,
      periodCount: totalOrders,
      periodAmount: totalAmount,
      uniqueClientsCount: clientsMap.size,
      clientsList: Array.from(clientsMap.values()),
      orders,
    };
  },
};
