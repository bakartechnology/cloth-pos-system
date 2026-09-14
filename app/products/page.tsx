'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { BarcodeLabelSheet } from '@/components/print/BarcodeLabelSheet';
import {
  Package,
  Plus,
  Search,
  Barcode,
  Trash2,
  Edit2,
  Filter,
  ArrowUpDown,
  Download,
  Printer,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { productsService } from '@/services/productsService';
import { useToast } from '@/context/ToastContext';
import { Product, ProductCategory, UnitType } from '@/types';

export default function ProductsPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedUnit, setSelectedUnit] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'retailPrice'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Barcode quick print modal state
  const [barcodeProduct, setBarcodeProduct] = useState<Product | null>(null);
  const [barcodeType, setBarcodeType] = useState<'retail' | 'wholesale'>('retail');

  useEffect(() => {
    setProducts(productsService.getAll());
  }, []);

  const categories: (string | ProductCategory)[] = [
    'All',
    'Lawn',
    'Cotton',
    'Khaddar',
    'Wash & Wear',
    'Unstitched',
    'Suit',
    'Thaan',
    'Cut Piece',
    'Silk & Chiffon',
  ];

  const units: (string | UnitType)[] = [
    'All',
    'Unstitched Box',
    'Suit Packet',
    'Thaan',
    'Meter',
    'Cut Piece',
  ];

  const handleDeleteProduct = (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove "${name}" from inventory?`)) {
      productsService.delete(id);
      setProducts(productsService.getAll());
      toast({
        title: 'Product Removed',
        description: `${name} was deleted from catalog.`,
        type: 'info',
      });
    }
  };

  const filteredProducts = products
    .filter(p => {
      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchesUnit = selectedUnit === 'All' || p.unit === selectedUnit;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        p.supplier.toLowerCase().includes(q);
      return matchesCat && matchesUnit && matchesQuery;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') comparison = a.name.localeCompare(b.name);
      if (sortBy === 'stock') comparison = a.stock - b.stock;
      if (sortBy === 'retailPrice') comparison = a.retailPrice - b.retailPrice;
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  return (
    <ProtectedRoute permission="stock_view">
      <AppShell>
        <div className="space-y-6">
          {/* Top Title & Quick Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1 rounded bg-blue-50 text-blue-700 font-mono text-[10px] font-bold uppercase">
                  Catalog
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {products.length} registered fabric articles
                </span>
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Product Catalog & Fabric Management
              </h1>
            </div>

            <div className="flex items-center gap-2.5">
              <Link href="/products/add">
                <Button variant="primary" size="md" className="gap-2 font-bold shadow-sm">
                  <Plus className="w-4 h-4" /> Add New Fabric
                </Button>
              </Link>
            </div>
          </div>

          {/* Filters Bar */}
          <Card className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search fabric name, SKU, barcode..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium"
              >
                {categories.map(c => (
                  <option key={c} value={c}>
                    Category: {c}
                  </option>
                ))}
              </select>

              {/* Unit Filter */}
              <select
                value={selectedUnit}
                onChange={e => setSelectedUnit(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium"
              >
                {units.map(u => (
                  <option key={u} value={u}>
                    Unit: {u}
                  </option>
                ))}
              </select>

              {/* Sorting */}
              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium"
                >
                  <option value="name">Sort by Name</option>
                  <option value="stock">Sort by Stock</option>
                  <option value="retailPrice">Sort by Retail Price</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-2 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors"
                  title="Toggle Ascending / Descending"
                >
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          </Card>

          {/* Product Data Table */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {filteredProducts.length === 0 ? (
                <EmptyState
                  icon={<Package className="w-8 h-8 text-slate-400" />}
                  title="No fabrics found"
                  description="No articles matched your active filters or search terms. Try resetting filters."
                  actionLabel="Clear Filters"
                  onAction={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                    setSelectedUnit('All');
                  }}
                  className="m-6 border-none"
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">Fabric Details</th>
                        <th className="py-3 px-4">SKU / Barcode</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Unit</th>
                        <th className="py-3 px-4 text-right">Retail Rate</th>
                        <th className="py-3 px-4 text-right">Wholesale Rate</th>
                        <th className="py-3 px-4 text-center">Available Stock</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredProducts.map(prod => {
                        const isLow = prod.stock <= prod.minStockAlert;
                        const isOut = prod.stock <= 0;

                        return (
                          <tr key={prod.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4 max-w-xs">
                              <div className="font-bold text-slate-900 leading-tight">
                                {prod.name}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {prod.supplier}
                              </div>
                            </td>

                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="font-mono text-slate-800 font-semibold">{prod.sku}</div>
                              <div className="font-mono text-[10px] text-slate-400">{prod.barcode}</div>
                            </td>

                            <td className="py-3 px-4">
                              <Badge size="sm" variant="secondary">
                                {prod.category}
                              </Badge>
                            </td>

                            <td className="py-3 px-4 text-slate-600">{prod.unit}</td>

                            <td className="py-3 px-4 text-right font-black text-slate-900">
                              Rs. {prod.retailPrice.toLocaleString()}
                            </td>

                            <td className="py-3 px-4 text-right font-bold text-cyan-700">
                              Rs. {prod.wholesalePrice.toLocaleString()}
                            </td>

                            <td className="py-3 px-4 text-center font-bold">
                              <span className={isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-slate-800'}>
                                {prod.stock}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-center">
                              {isOut ? (
                                <Badge size="sm" variant="destructive">
                                  Out of Stock
                                </Badge>
                              ) : isLow ? (
                                <Badge size="sm" variant="warning">
                                  Low Stock
                                </Badge>
                              ) : (
                                <Badge size="sm" variant="success">
                                  In Stock
                                </Badge>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setBarcodeProduct(prod);
                                    setBarcodeType('retail');
                                  }}
                                  className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                                  title="Print Barcode Labels"
                                >
                                  <Barcode className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(prod.id, prod.name)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                  title="Delete Product"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Barcode Label Sheet Print Modal */}
        <Modal
          isOpen={!!barcodeProduct}
          onClose={() => setBarcodeProduct(null)}
          title={`Barcode Labels: ${barcodeProduct?.name || ''}`}
          maxWidth="4xl"
        >
          {barcodeProduct && (
            <BarcodeLabelSheet
              product={barcodeProduct}
              type={barcodeType}
              count={12}
              onClose={() => setBarcodeProduct(null)}
            />
          )}
        </Modal>
      </AppShell>
    </ProtectedRoute>
  );
}
