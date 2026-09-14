import { Product } from '@/types';
import { storageService } from './storageService';

export const productsService = {
  getAll(): Product[] {
    return storageService.getProducts();
  },

  getById(id: string): Product | undefined {
    const products = storageService.getProducts();
    return products.find(p => p.id === id);
  },

  getByBarcodeOrSku(query: string): Product | undefined {
    const clean = query.trim().toLowerCase();
    const products = storageService.getProducts();
    return products.find(
      p =>
        p.barcode.toLowerCase() === clean ||
        p.wholesaleBarcode.toLowerCase() === clean ||
        p.sku.toLowerCase() === clean
    );
  },

  search(query: string, category?: string): Product[] {
    const clean = query.trim().toLowerCase();
    let products = storageService.getProducts();

    if (category && category !== 'All') {
      products = products.filter(p => p.category === category);
    }

    if (!clean) return products;

    return products.filter(
      p =>
        p.name.toLowerCase().includes(clean) ||
        p.sku.toLowerCase().includes(clean) ||
        p.barcode.includes(clean) ||
        p.wholesaleBarcode.includes(clean) ||
        p.category.toLowerCase().includes(clean) ||
        p.subcategory.toLowerCase().includes(clean)
    );
  },

  add(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product {
    const products = storageService.getProducts();
    const newProduct: Product = {
      ...productData,
      id: `prd-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };

    const updated = [newProduct, ...products];
    storageService.setProducts(updated);
    return newProduct;
  },

  update(id: string, updates: Partial<Product>): Product | null {
    const products = storageService.getProducts();
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return null;

    const updatedProduct = {
      ...products[index],
      ...updates,
      updatedAt: new Date().toISOString().split('T')[0],
    };

    products[index] = updatedProduct;
    storageService.setProducts([...products]);
    return updatedProduct;
  },

  delete(id: string): boolean {
    const products = storageService.getProducts();
    const filtered = products.filter(p => p.id !== id);
    if (filtered.length === products.length) return false;
    storageService.setProducts(filtered);
    return true;
  },

  updateStock(productId: string, quantityDelta: number): boolean {
    const products = storageService.getProducts();
    const index = products.findIndex(p => p.id === productId);
    if (index === -1) return false;

    const current = products[index];
    const newStock = Math.max(0, current.stock + quantityDelta);
    products[index] = { ...current, stock: newStock };
    storageService.setProducts([...products]);
    return true;
  },
};
