import { StockMovement, Product } from '@/types';
import { storageService } from './storageService';

export const inventoryService = {
  getMovements(): StockMovement[] {
    return storageService.getStockMovements();
  },

  recordMovement(data: Omit<StockMovement, 'id' | 'date'>): StockMovement {
    const movements = storageService.getStockMovements();
    const newMovement: StockMovement = {
      ...data,
      id: `mov-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString(),
    };

    storageService.setStockMovements([newMovement, ...movements]);
    return newMovement;
  },

  getLowStockProducts(threshold = 10): Product[] {
    const products = storageService.getProducts();
    return products.filter(p => p.stock <= (p.minStockAlert || threshold));
  },

  getOutOfStockProducts(): Product[] {
    const products = storageService.getProducts();
    return products.filter(p => p.stock <= 0);
  },

  getInventoryValuation(): {
    totalItems: number;
    totalStockCount: number;
    totalRetailValue: number;
    totalWholesaleValue: number;
    totalCostValue: number;
  } {
    const products = storageService.getProducts();
    let totalStockCount = 0;
    let totalRetailValue = 0;
    let totalWholesaleValue = 0;
    let totalCostValue = 0;

    products.forEach(p => {
      totalStockCount += p.stock;
      totalRetailValue += p.stock * p.retailPrice;
      totalWholesaleValue += p.stock * p.wholesalePrice;
      totalCostValue += p.stock * (p.costPrice || 0);
    });

    return {
      totalItems: products.length,
      totalStockCount,
      totalRetailValue,
      totalWholesaleValue,
      totalCostValue,
    };
  },

  getCategoryBreakdown(): { category: string; count: number; stock: number; value: number }[] {
    const products = storageService.getProducts();
    const map = new Map<string, { count: number; stock: number; value: number }>();

    products.forEach(p => {
      const existing = map.get(p.category) || { count: 0, stock: 0, value: 0 };
      map.set(p.category, {
        count: existing.count + 1,
        stock: existing.stock + p.stock,
        value: existing.value + p.stock * p.retailPrice,
      });
    });

    return Array.from(map.entries()).map(([category, data]) => ({
      category,
      count: data.count,
      stock: data.stock,
      value: data.value,
    }));
  },
};
