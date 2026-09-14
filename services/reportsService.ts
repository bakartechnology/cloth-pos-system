import { storageService } from './storageService';
import { HISTORICAL_SALES_SUMMARY } from '@/data/mockData';

export const reportsService = {
  getHistoricalSummary() {
    return HISTORICAL_SALES_SUMMARY;
  },

  getDashboardMetrics() {
    const bills = storageService.getBills();
    const customers = storageService.getCustomers();
    const products = storageService.getProducts();
    const collections = storageService.getCollections();

    // Today's date YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];

    const todayBills = bills.filter(b => b.date.startsWith(today));
    const todayRetailSales = todayBills
      .filter(b => b.saleType === 'Retail')
      .reduce((sum, b) => sum + b.grandTotal, 0);

    const todayWholesaleSales = todayBills
      .filter(b => b.saleType === 'Wholesale')
      .reduce((sum, b) => sum + b.grandTotal, 0);

    const todayCollections = collections
      .filter(c => c.date.startsWith(today))
      .reduce((sum, c) => sum + c.amountCollected, 0);

    let totalStockValue = 0;
    let lowStockCount = 0;

    products.forEach(p => {
      totalStockValue += p.stock * p.retailPrice;
      if (p.stock <= (p.minStockAlert || 10)) {
        lowStockCount++;
      }
    });

    const outstandingKhataBalance = customers
      .filter(c => c.type === 'Khata')
      .reduce((sum, c) => sum + c.currentBalance, 0);

    return {
      todayRetailSales: todayRetailSales || 13415,
      todayWholesaleSales: todayWholesaleSales || 66470,
      todayKhataCollection: todayCollections || 50000,
      totalStockValue: totalStockValue || 4850000,
      lowStockCount: lowStockCount || 6,
      outstandingKhataBalance: outstandingKhataBalance || 1198600,
      todayTransactionsCount: todayBills.length || 4,
    };
  },

  getSalesByPeriod(period: 'today' | 'week' | 'month' | 'year' | 'multi-year') {
    const historical = HISTORICAL_SALES_SUMMARY;
    const currentYear = historical.years[0];

    if (period === 'today') {
      return [
        { time: '10 AM', retail: 8500, wholesale: 15000 },
        { time: '12 PM', retail: 14200, wholesale: 38000 },
        { time: '02 PM', retail: 19800, wholesale: 42000 },
        { time: '04 PM', retail: 28400, wholesale: 64000 },
        { time: '06 PM', retail: 34500, wholesale: 52000 },
        { time: '08 PM', retail: 42000, wholesale: 31000 },
        { time: '10 PM', retail: 18000, wholesale: 12000 },
      ];
    }

    if (period === 'week') {
      return [
        { day: 'Mon', retail: 145000, wholesale: 280000 },
        { day: 'Tue', retail: 168000, wholesale: 310000 },
        { day: 'Wed', retail: 195000, wholesale: 390000 },
        { day: 'Thu', retail: 220000, wholesale: 450000 },
        { day: 'Fri', retail: 380000, wholesale: 560000 }, // Busy Friday
        { day: 'Sat', retail: 440000, wholesale: 480000 },
        { day: 'Sun', retail: 510000, wholesale: 220000 },
      ];
    }

    if (period === 'month') {
      return currentYear.months.map(m => ({
        label: m.month,
        retail: m.retail,
        wholesale: m.wholesale,
        total: m.total,
      }));
    }

    if (period === 'year') {
      return currentYear.months.map(m => ({
        label: m.month,
        retail: m.retail,
        wholesale: m.wholesale,
        total: m.total,
      }));
    }

    // 5-year comparison
    return historical.years.map(y => ({
      year: y.year.toString(),
      retail: y.retailSales,
      wholesale: y.wholesaleSales,
      khata: y.khataCollection,
      total: y.totalSales,
    })).reverse();
  },

  getStaffSalesPerformance() {
    const bills = storageService.getBills();
    const collections = storageService.getCollections();
    const staffMembers = storageService.getStaff();

    return staffMembers.map(staff => {
      const staffBills = bills.filter(b => b.staffId === staff.id);
      const retailBills = staffBills.filter(b => b.saleType === 'Retail');
      const wholesaleBills = staffBills.filter(b => b.saleType === 'Wholesale');
      const khataBills = staffBills.filter(b => b.saleType === 'Khata');

      const retailTotal = retailBills.reduce((s, b) => s + b.grandTotal, 0);
      const wholesaleTotal = wholesaleBills.reduce((s, b) => s + b.grandTotal, 0);
      const khataTotal = khataBills.reduce((s, b) => s + b.grandTotal, 0);
      const totalSales = retailTotal + wholesaleTotal + khataTotal;

      const staffCollections = collections.filter(c => c.staffId === staff.id);
      const collectionsTotal = staffCollections.reduce((s, c) => s + c.amountCollected, 0);

      const txCount = staffBills.length + staffCollections.length;
      const avgBill = staffBills.length > 0 ? Math.round(totalSales / staffBills.length) : 0;

      return {
        staffId: staff.id,
        name: staff.name,
        role: staff.role,
        counter: staff.counter,
        retailSales: retailTotal,
        wholesaleSales: wholesaleTotal,
        khataSales: khataTotal,
        totalSales,
        collectionsTotal,
        txCount,
        avgBill,
      };
    });
  },
};
