'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Layers,
  Search,
  AlertTriangle,
  Package,
  TrendingUp,
  Plus,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { productsService } from '@/services/productsService';
import { inventoryService } from '@/services/inventoryService';
import { Product, UnitType } from '@/types';

export default function StockOverviewPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [valuation, setValuation] = useState({
    totalItems: 0,
    totalStockCount: 0,
    totalRetailValue: 0,
    totalWholesaleValue: 0,
    totalCostValue: 0,
  });
  const [categoryBreakdown, setCategoryBreakdown] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Low' | 'Out'>('All');

  useEffect(() => {
    setProducts(productsService.getAll());
    setValuation(inventoryService.getInventoryValuation());
    setCategoryBreakdown(inventoryService.getCategoryBreakdown());
  }, []);

  const units: (string | UnitType)[] = [
    'All',
    'Thaan',
    'Meter',
    'Unstitched Box',
    'Suit Packet',
    'Cut Piece',
  ];

  const filteredProducts = products.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    const matchesUnit = selectedUnit === 'All' || p.unit === selectedUnit;
    const matchesStatus =
      statusFilter === 'All'
        ? true
        : statusFilter === 'Low'
        ? p.stock <= p.minStockAlert && p.stock > 0
        : p.stock <= 0;

    return matchesQuery && matchesUnit && matchesStatus;
  });

  const lowStockCount = products.filter(p => p.stock <= p.minStockAlert && p.stock > 0).length;
  const outOfStockCount = products.filter(p => p.stock <= 0).length;

  return (
    <ProtectedRoute permission="stock_view">
      <AppShell>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1 rounded bg-blue-50 text-blue-700 font-mono text-[10px] font-bold uppercase">
                  Inventory
                </span>
                <span className="text-xs text-slate-500 font-medium">Warehouse & Showroom Valuation</span>
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Live Stock Valuation & Fabric Holdings
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/inventory/stock-history">
                <Button variant="outline" size="md" className="gap-1.5">
                  <TrendingUp className="w-4 h-4" /> Movement Audit Log
                </Button>
              </Link>
              <Link href="/products/add">
                <Button variant="primary" size="md" className="gap-1.5 font-bold">
                  <Plus className="w-4 h-4" /> Add New Stock
                </Button>
              </Link>
            </div>
          </div>

          {/* Valuation KPI Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Stock Quantity
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {valuation.totalStockCount.toLocaleString()}{' '}
                <span className="text-xs font-normal text-slate-500">units/meters</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">{valuation.totalItems} distinct catalog items</div>
            </Card>

            <Card className="p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Retail Valuation
              </span>
              <div className="text-2xl font-black text-blue-600 mt-1">
                Rs. {(valuation.totalRetailValue / 100000).toFixed(2)} Lakh
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Rs. {valuation.totalRetailValue.toLocaleString()} full retail
              </div>
            </Card>

            <Card className="p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Wholesale Valuation
              </span>
              <div className="text-2xl font-black text-cyan-600 mt-1">
                Rs. {(valuation.totalWholesaleValue / 100000).toFixed(2)} Lakh
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Rs. {valuation.totalWholesaleValue.toLocaleString()} B2B rate
              </div>
            </Card>

            <Card className="p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Reorder Alerts
              </span>
              <div className="text-2xl font-black text-amber-600 mt-1">
                {lowStockCount + outOfStockCount}{' '}
                <span className="text-xs font-normal text-slate-500">articles</span>
              </div>
              <div className="text-xs text-rose-600 font-semibold mt-1">
                {outOfStockCount} Out of Stock • {lowStockCount} Low
              </div>
            </Card>
          </div>

          {/* Unit / Category Breakdown Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {categoryBreakdown.slice(0, 5).map(cat => (
              <div key={cat.category} className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-xs font-bold text-slate-900 truncate">{cat.category}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{cat.count} articles</div>
                <div className="text-xs font-black text-slate-800 mt-2">
                  {cat.stock.toLocaleString()} <span className="font-normal text-[10px] text-slate-400">held</span>
                </div>
              </div>
            ))}
          </div>

          {/* Search & Filter Toolbar */}
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by product name, SKU..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                {/* Unit selector */}
                <select
                  value={selectedUnit}
                  onChange={e => setSelectedUnit(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:bg-white focus:outline-none"
                >
                  {units.map(u => (
                    <option key={u} value={u}>
                      Unit: {u}
                    </option>
                  ))}
                </select>

                {/* Status Toggle */}
                <div className="flex items-center p-0.5 bg-slate-100 rounded-lg text-xs font-semibold">
                  <button
                    onClick={() => setStatusFilter('All')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      statusFilter === 'All' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setStatusFilter('Low')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      statusFilter === 'Low' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Low ({lowStockCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter('Out')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      statusFilter === 'Out' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Out ({outOfStockCount})
                  </button>
                </div>
              </div>
            </div>
          </Card>

          {/* Stock Table */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Product Name</th>
                      <th className="py-3 px-4">SKU</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-center">In-Stock Qty</th>
                      <th className="py-3 px-4">Unit</th>
                      <th className="py-3 px-4 text-right">Retail Rate</th>
                      <th className="py-3 px-4 text-right">Wholesale Rate</th>
                      <th className="py-3 px-4 text-right">Stock Valuation</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map(prod => {
                      const isOut = prod.stock <= 0;
                      const isLow = prod.stock <= prod.minStockAlert;
                      const stockValuation = prod.stock * prod.retailPrice;

                      return (
                        <tr key={prod.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900 max-w-xs">{prod.name}</td>
                          <td className="py-3 px-4 font-mono text-slate-600">{prod.sku}</td>
                          <td className="py-3 px-4">
                            <Badge size="sm" variant="secondary">
                              {prod.category}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-sm">
                            <span className={isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-slate-900'}>
                              {prod.stock}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500">{prod.unit}</td>
                          <td className="py-3 px-4 text-right font-medium">Rs. {prod.retailPrice.toLocaleString()}</td>
                          <td className="py-3 px-4 text-right font-bold text-cyan-700">
                            Rs. {prod.wholesalePrice.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-slate-900">
                            Rs. {stockValuation.toLocaleString()}
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
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
