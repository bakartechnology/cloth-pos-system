'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import {
  Tag,
  ArrowLeft,
  CheckCircle2,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { productsService } from '@/services/productsService';
import { useToast } from '@/context/ToastContext';
import { Product } from '@/types';

export default function DiscountManagementPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);

  // Form State
  const [saleType, setSaleType] = useState<'Retail' | 'Wholesale'>('Retail');
  const [category, setCategory] = useState<'All' | 'Summer' | 'Winter'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(200);

  const loadProducts = () => {
    setProducts(productsService.getAll());
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Helper for product season
  const getProductSeason = (p: Product): 'Summer' | 'Winter' => {
    return (
      p.seasonCategory ||
      (['Khaddar', 'Wash & Wear'].includes(p.category) ? 'Winter' : 'Summer')
    );
  };

  // Search filter for specific product selection
  const searchMatchingProducts = products.filter(p => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.barcode.includes(q)
    );
  });

  // Calculate which products will be affected by the current configuration
  const targetProducts = products.filter(p => {
    if (selectedProduct) {
      return p.id === selectedProduct.id;
    }
    if (category === 'All') return true;
    return getProductSeason(p) === category;
  });

  const handleSelectProduct = (prod: Product) => {
    setSelectedProduct(prod);
    setSearchQuery(prod.name);
  };

  const handleClearProductSearch = () => {
    setSelectedProduct(null);
    setSearchQuery('');
  };

  const handleSaveDiscount = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanAmount = Math.max(0, Number(discountAmount) || 0);

    if (selectedProduct) {
      // 1. Specific product discount
      const result = productsService.applyBulkDiscount({
        saleType,
        category: 'All',
        discountAmount: cleanAmount,
        productId: selectedProduct.id,
      });

      loadProducts();
      toast({
        title: 'Product Discount Saved',
        description: `Applied Rs. ${cleanAmount.toLocaleString()} ${saleType} Discount to "${selectedProduct.name}". (Barcode preserved)`,
        type: 'success',
      });
    } else {
      // 2. Category-wide bulk discount
      const result = productsService.applyBulkDiscount({
        saleType,
        category,
        discountAmount: cleanAmount,
      });

      loadProducts();
      toast({
        title: 'Bulk Discount Applied',
        description: `Applied Rs. ${cleanAmount.toLocaleString()} ${saleType} Discount to ${result.count} ${category} product(s).`,
        type: 'success',
      });
    }
  };

  const totalSummer = products.filter(p => getProductSeason(p) === 'Summer').length;
  const totalWinter = products.filter(p => getProductSeason(p) === 'Winter').length;
  const activeRetailDiscounts = products.filter(p => (p.retailDiscount || 0) > 0).length;
  const activeWholesaleDiscounts = products.filter(p => (p.wholesaleDiscount || 0) > 0).length;

  return (
    <ProtectedRoute permission="stock_edit">
      <AppShell>
        <div className="space-y-6">
          {/* Top Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link href="/products">
                  <span className="p-1 rounded bg-amber-50 text-amber-700 font-mono text-[10px] font-bold uppercase hover:bg-amber-100 transition-colors">
                    Catalog / Discounts
                  </span>
                </Link>
                <span className="text-xs text-slate-500 font-medium">
                  Fixed Rupee Discounts for Retail & Wholesale
                </span>
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <Tag className="w-5 h-5 text-amber-600" /> Discount Management
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/products">
                <Button variant="outline" size="md" className="gap-1.5">
                  <ArrowLeft className="w-4 h-4" /> Back to Products
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Summer Collection
              </span>
              <div className="text-lg font-black text-amber-700 mt-0.5">
                {totalSummer} <span className="text-xs font-normal text-slate-500">articles</span>
              </div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Winter Collection
              </span>
              <div className="text-lg font-black text-blue-700 mt-0.5">
                {totalWinter} <span className="text-xs font-normal text-slate-500">articles</span>
              </div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Active Retail Discounts
              </span>
              <div className="text-lg font-black text-emerald-700 mt-0.5">
                {activeRetailDiscounts} <span className="text-xs font-normal text-slate-500">articles</span>
              </div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Active Wholesale Discounts
              </span>
              <div className="text-lg font-black text-cyan-700 mt-0.5">
                {activeWholesaleDiscounts} <span className="text-xs font-normal text-slate-500">articles</span>
              </div>
            </div>
          </div>

          {/* Discount Setup Form & Target Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Configuration Form */}
            <div className="lg:col-span-5 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-blue-600" /> Apply Discount Rule
                  </CardTitle>
                  <CardDescription>
                    Configure sale type, category, and rupee discount amount.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveDiscount} className="space-y-4">
                    {/* Sale Type Dropdown */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Sale Type *
                      </label>
                      <Select
                        value={saleType}
                        onChange={e => setSaleType(e.target.value as 'Retail' | 'Wholesale')}
                      >
                        <option value="Retail">Retail (Applies to Retail POS)</option>
                        <option value="Wholesale">Wholesale (Applies to Wholesale POS)</option>
                      </Select>
                      <span className="text-[11px] text-slate-400 mt-1 block">
                        {saleType === 'Retail'
                          ? 'Updates Retail Discount field only. Wholesale rates unaffected.'
                          : 'Updates Wholesale Discount field only. Retail rates unaffected.'}
                      </span>
                    </div>

                    {/* Category Dropdown */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Category *
                      </label>
                      <Select
                        value={category}
                        onChange={e => {
                          setCategory(e.target.value as 'All' | 'Summer' | 'Winter');
                          setSelectedProduct(null);
                        }}
                      >
                        <option value="All">All Categories (Summer + Winter)</option>
                        <option value="Summer">☀️ Summer Collection Only</option>
                        <option value="Winter">❄️ Winter Collection Only</option>
                      </Select>
                      <span className="text-[11px] text-slate-400 mt-1 block">
                        Target collection group to receive this discount.
                      </span>
                    </div>

                    {/* Product Search Field */}
                    <div className="relative">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Product Search (Optional)
                        </label>
                        {selectedProduct && (
                          <button
                            type="button"
                            onClick={handleClearProductSearch}
                            className="text-[11px] text-rose-600 hover:underline flex items-center gap-0.5"
                          >
                            <X className="w-3 h-3" /> Clear specific selection
                          </button>
                        )}
                      </div>

                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search specific product by name..."
                          value={searchQuery}
                          onChange={e => {
                            setSearchQuery(e.target.value);
                            if (selectedProduct && e.target.value !== selectedProduct.name) {
                              setSelectedProduct(null);
                            }
                          }}
                          className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={handleClearProductSearch}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Autocomplete Dropdown List */}
                      {!selectedProduct && searchQuery.trim().length > 0 && (
                        <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
                          {searchMatchingProducts.length === 0 ? (
                            <div className="p-3 text-xs text-slate-400 text-center">
                              No product matches &quot;{searchQuery}&quot;
                            </div>
                          ) : (
                            searchMatchingProducts.slice(0, 8).map(p => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => handleSelectProduct(p)}
                                className="w-full text-left p-2.5 hover:bg-blue-50/60 transition-colors flex items-center justify-between text-xs"
                              >
                                <div>
                                  <div className="font-bold text-slate-900">{p.name}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    {p.sku} • {getProductSeason(p)}
                                  </div>
                                </div>
                                <span className="font-mono text-slate-600 font-medium text-[11px]">
                                  Rs. {saleType === 'Retail' ? p.retailPrice : p.wholesalePrice}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      )}

                      {selectedProduct ? (
                        <div className="mt-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-blue-700 uppercase block">
                              Targeting Single Article:
                            </span>
                            <span className="font-bold text-blue-950">{selectedProduct.name}</span>
                          </div>
                          <Badge variant="secondary" size="sm" className="bg-blue-100 text-blue-800">
                            {getProductSeason(selectedProduct)}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 mt-1 block">
                          Leave empty or clear to apply to all products in &quot;{category}&quot; category.
                        </span>
                      )}
                    </div>

                    {/* Discount Amount (Rs) Field */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Discount Amount (Rs) *
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="10"
                        placeholder="e.g. 300"
                        value={discountAmount}
                        onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)}
                        required
                        className="font-mono text-base font-bold"
                      />
                      <span className="text-[11px] text-slate-500 block">
                        Must be a fixed rupee discount (Rs.), not a percentage. Replaces any prior discount.
                      </span>
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      className="w-full gap-2 font-bold shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Save Discount
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Rules Reference Card */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  Discount Application Rules:
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px]">
                  <li>
                    <strong className="text-slate-800">Wholesale + Summer:</strong> Updates all Summer products&apos; Wholesale Discount.
                  </li>
                  <li>
                    <strong className="text-slate-800">Wholesale + Winter:</strong> Updates all Winter products&apos; Wholesale Discount.
                  </li>
                  <li>
                    <strong className="text-slate-800">Retail + Summer:</strong> Updates all Summer products&apos; Retail Discount.
                  </li>
                  <li>
                    <strong className="text-slate-800">Retail + Winter:</strong> Updates all Winter products&apos; Retail Discount.
                  </li>
                  <li>
                    <strong className="text-slate-800">Specific Product:</strong> Updates only the searched product, preserving others.
                  </li>
                  <li>
                    <strong className="text-slate-800">Barcodes:</strong> Barcodes and IDs are never regenerated or modified.
                  </li>
                </ul>
              </div>
            </div>

            {/* Right: Affected Products Live Preview Table */}
            <div className="lg:col-span-7">
              <Card className="overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold">
                        Affected Products Preview ({targetProducts.length})
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {selectedProduct
                          ? `Targeting single product "${selectedProduct.name}"`
                          : `Matching Category: "${category}" (${targetProducts.length} articles)`}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" size="sm">
                      {saleType} Discount: Rs. {discountAmount}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 bg-slate-100/90 backdrop-blur z-10">
                        <tr className="border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-3.5">Product & Category</th>
                          <th className="py-2.5 px-3 text-right">Original Rate</th>
                          <th className="py-2.5 px-3 text-right">Current Discount</th>
                          <th className="py-2.5 px-3 text-right">Projected Discount</th>
                          <th className="py-2.5 px-3 text-right">Projected Final Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {targetProducts.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-400">
                              No products matched your active category/search filter.
                            </td>
                          </tr>
                        ) : (
                          targetProducts.map(prod => {
                            const season = getProductSeason(prod);
                            const originalRate =
                              saleType === 'Retail' ? prod.retailPrice : prod.wholesalePrice;
                            const currentDiscount =
                              saleType === 'Retail'
                                ? prod.retailDiscount || 0
                                : prod.wholesaleDiscount || 0;
                            const newDiscount = Math.max(0, discountAmount || 0);
                            const projectedFinal = Math.max(0, originalRate - newDiscount);

                            return (
                              <tr key={prod.id} className="hover:bg-slate-50/60 transition-colors">
                                <td className="py-2.5 px-3.5 max-w-xs">
                                  <div className="font-bold text-slate-900 truncate">
                                    {prod.name}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span
                                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                        season === 'Winter'
                                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                                          : 'bg-amber-50 text-amber-700 border-amber-200'
                                      }`}
                                    >
                                      {season === 'Winter' ? '❄️ Winter' : '☀️ Summer'}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {prod.sku}
                                    </span>
                                  </div>
                                </td>

                                <td className="py-2.5 px-3 text-right font-medium text-slate-600">
                                  Rs. {originalRate.toLocaleString()}
                                </td>

                                <td className="py-2.5 px-3 text-right">
                                  {currentDiscount > 0 ? (
                                    <span className="font-bold text-emerald-600">
                                      Rs. {currentDiscount.toLocaleString()}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">None</span>
                                  )}
                                </td>

                                <td className="py-2.5 px-3 text-right font-bold text-amber-600">
                                  Rs. {newDiscount.toLocaleString()}
                                </td>

                                <td className="py-2.5 px-3 text-right font-black text-slate-900 font-mono">
                                  Rs. {projectedFinal.toLocaleString()}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
