'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  TrendingUp,
  ShoppingCart,
  Truck,
  BookOpen,
  Package,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  ArrowRight,
  Calendar,
  Layers,
  Banknote,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { reportsService } from '@/services/reportsService';
import { salesService } from '@/services/salesService';
import { inventoryService } from '@/services/inventoryService';
import { useAuth } from '@/context/AuthContext';
import { Bill, Product } from '@/types';

export default function DashboardPage() {
  const { currentStaff } = useAuth();
  const [kpis, setKpis] = useState({
    todayRetailSales: 13415,
    todayWholesaleSales: 66470,
    todayKhataCollection: 50000,
    totalStockValue: 4850000,
    lowStockCount: 6,
    outstandingKhataBalance: 1198600,
    todayTransactionsCount: 4,
  });

  const [activeChartTab, setActiveChartTab] = useState<'both' | 'retail' | 'wholesale'>('both');
  const [activeTimeframe, setActiveTimeframe] = useState<'today' | 'week' | 'month' | 'multi-year'>('week');
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentBills, setRecentBills] = useState<Bill[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);

  useEffect(() => {
    // Load live metrics from services
    const metrics = reportsService.getDashboardMetrics();
    setKpis(metrics);

    const bills = salesService.getAllBills().slice(0, 5);
    setRecentBills(bills);

    const lowStock = inventoryService.getLowStockProducts(10).slice(0, 5);
    setLowStockProducts(lowStock);
  }, []);

  useEffect(() => {
    const data = reportsService.getSalesByPeriod(activeTimeframe);
    setChartData(data);
  }, [activeTimeframe]);

  // Compute maximum chart value for proportional SVG bar heights
  const maxVal = Math.max(
    ...chartData.map(d => Math.max(d.retail || 0, d.wholesale || 0, d.total || 0, 1)),
    100
  );

  return (
    <ProtectedRoute permission="dashboard_view">
      <AppShell>
        <div className="space-y-6">
          {/* Welcome Greeting & Action Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-2xl text-white shadow-md">
            <div>
              <div className="flex items-center gap-2 mb-1 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" /> Commercial POS Intelligence
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                Assalam-o-Alaikum, {currentStaff?.name || 'Administrator'}
              </h1>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                Here is your store summary for today. Active branch:{' '}
                <span className="font-semibold text-white">Liberty Market Main Showroom</span>.
              </p>
            </div>

            {/* Quick POS Triggers */}
            <div className="flex items-center gap-2 flex-wrap">
              <Link href="/pos/retail">
                <Button variant="primary" size="md" className="gap-2 font-bold shadow-md">
                  <ShoppingCart className="w-4 h-4" /> Retail POS (F4)
                </Button>
              </Link>
              <Link href="/pos/wholesale">
                <Button variant="secondary" size="md" className="gap-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 font-bold">
                  <Truck className="w-4 h-4 text-cyan-400" /> Wholesale (F5)
                </Button>
              </Link>
            </div>
          </div>

          {/* 6 Core KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* 1. Today's Retail Sales */}
            <Card hoverEffect className="p-4 border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Today's Retail
                </span>
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-black text-slate-900 tracking-tight">
                Rs. {kpis.todayRetailSales.toLocaleString()}
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 mt-1.5">
                <ArrowUpRight className="w-3.5 h-3.5" /> +14.2%
                <span className="text-slate-400 font-normal ml-0.5">vs yesterday</span>
              </div>
            </Card>

            {/* 2. Today's Wholesale Sales */}
            <Card hoverEffect className="p-4 border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Today's Wholesale
                </span>
                <div className="w-7 h-7 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-black text-slate-900 tracking-tight">
                Rs. {kpis.todayWholesaleSales.toLocaleString()}
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 mt-1.5">
                <ArrowUpRight className="w-3.5 h-3.5" /> +8.5%
                <span className="text-slate-400 font-normal ml-0.5">vs yesterday</span>
              </div>
            </Card>

            {/* 3. Today's Khata Collection */}
            <Card hoverEffect className="p-4 border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Khata Recovery
                </span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Banknote className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-black text-slate-900 tracking-tight">
                Rs. {kpis.todayKhataCollection.toLocaleString()}
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 mt-1.5">
                <ArrowUpRight className="w-3.5 h-3.5" /> +22.0%
                <span className="text-slate-400 font-normal ml-0.5">field recovery</span>
              </div>
            </Card>

            {/* 4. Total Stock Value */}
            <Card hoverEffect className="p-4 border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Total Inventory
                </span>
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-black text-slate-900 tracking-tight">
                Rs. {(kpis.totalStockValue / 100000).toFixed(1)} Lakh
              </div>
              <div className="text-[11px] text-slate-500 mt-1.5">
                52 catalog fabric lines
              </div>
            </Card>

            {/* 5. Low Stock Items */}
            <Card hoverEffect className="p-4 border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Low Stock Alert
                </span>
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-black text-amber-600 tracking-tight">
                {kpis.lowStockCount} Products
              </div>
              <Link href="/inventory/stock" className="text-[11px] font-semibold text-blue-600 hover:underline mt-1.5 flex items-center gap-0.5">
                Review & reorder <ArrowRight className="w-3 h-3" />
              </Link>
            </Card>

            {/* 6. Outstanding Khata Balance */}
            <Card hoverEffect className="p-4 border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Khata Receivables
                </span>
                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-black text-rose-600 tracking-tight">
                Rs. {(kpis.outstandingKhataBalance / 100000).toFixed(1)} Lakh
              </div>
              <Link href="/customers/khata" className="text-[11px] font-semibold text-rose-600 hover:underline mt-1.5 flex items-center gap-0.5">
                8 active accounts <ArrowRight className="w-3 h-3" />
              </Link>
            </Card>
          </div>

          {/* Sales Analytics Chart Section */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" /> Sales Trend & Channel Performance
                </CardTitle>
                <CardDescription>
                  Comparative volume between Retail walk-in sales and Wholesale bulk distribution.
                </CardDescription>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* Channel Selector */}
                <div className="flex items-center p-1 bg-slate-100 rounded-lg text-xs">
                  <button
                    onClick={() => setActiveChartTab('both')}
                    className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                      activeChartTab === 'both' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Both Channels
                  </button>
                  <button
                    onClick={() => setActiveChartTab('retail')}
                    className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                      activeChartTab === 'retail' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Retail
                  </button>
                  <button
                    onClick={() => setActiveChartTab('wholesale')}
                    className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                      activeChartTab === 'wholesale' ? 'bg-white text-cyan-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Wholesale
                  </button>
                </div>

                {/* Period Selector */}
                <div className="flex items-center p-1 bg-slate-100 rounded-lg text-xs">
                  {(['today', 'week', 'month', 'multi-year'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setActiveTimeframe(p)}
                      className={`px-2.5 py-1 rounded-md capitalize font-semibold transition-colors ${
                        activeTimeframe === p ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {p === 'multi-year' ? '5-Year' : p}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {/* Interactive SVG Bar Visualization */}
              <div className="pt-4 pb-2">
                <div className="overflow-x-auto pb-2 scrollbar-thin">
                  <div className="h-64 flex items-end justify-between gap-1.5 sm:gap-3 border-b border-slate-200 pb-2 min-w-[580px] lg:min-w-0">
                    {chartData.map((bar, idx) => {
                      const label = bar.time || bar.day || bar.label || bar.year;
                      const retailVal = bar.retail || 0;
                      const wholesaleVal = bar.wholesale || 0;
                      const retailHeight = Math.max(8, Math.round((retailVal / maxVal) * 200));
                      const wholesaleHeight = Math.max(8, Math.round((wholesaleVal / maxVal) * 200));

                      return (
                        <div key={idx} className="flex-1 min-w-0 flex flex-col items-center gap-1.5 h-full justify-end group relative">
                          {/* Tooltip value */}
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono bg-slate-900 text-white px-2 py-1.5 rounded-md shadow-xl pointer-events-none whitespace-nowrap z-30">
                            {activeChartTab !== 'wholesale' && <div>Retail: Rs. {retailVal.toLocaleString()}</div>}
                            {activeChartTab !== 'retail' && <div>Wholesale: Rs. {wholesaleVal.toLocaleString()}</div>}
                          </div>

                          <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 max-w-[48px]">
                            {(activeChartTab === 'both' || activeChartTab === 'retail') && (
                              <div
                                style={{ height: `${retailHeight}px` }}
                                className="flex-1 bg-blue-600 rounded-t-sm sm:rounded-t-md hover:bg-blue-500 transition-all min-w-[3px]"
                                title={`Retail: Rs. ${retailVal.toLocaleString()}`}
                              />
                            )}
                            {(activeChartTab === 'both' || activeChartTab === 'wholesale') && (
                              <div
                                style={{ height: `${wholesaleHeight}px` }}
                                className="flex-1 bg-cyan-500 rounded-t-sm sm:rounded-t-md hover:bg-cyan-400 transition-all min-w-[3px]"
                                title={`Wholesale: Rs. ${wholesaleVal.toLocaleString()}`}
                              />
                            )}
                          </div>
                          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 truncate w-full text-center">
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-6 mt-4 text-xs font-semibold text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-blue-600" />
                    <span>Retail Sales (Cash / Walk-in)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-cyan-500" />
                    <span>Wholesale Bulk Volume</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bottom Grid: Recent Sales Bills & Low Stock Fabric Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Completed Bills */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <div>
                    <CardTitle className="text-sm font-bold">Recent Completed Bills</CardTitle>
                    <CardDescription>Latest sales transactions across counters</CardDescription>
                  </div>
                  <Link href="/bills">
                    <Button variant="ghost" size="sm" className="gap-1 text-xs text-blue-600">
                      View All Bills <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 text-xs">
                  {recentBills.map(bill => (
                    <div key={bill.id} className="p-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">#{bill.invoiceNumber}</span>
                          <Badge
                            size="sm"
                            variant={
                              bill.saleType === 'Retail'
                                ? 'default'
                                : bill.saleType === 'Wholesale'
                                ? 'cyan'
                                : 'warning'
                            }
                          >
                            {bill.saleType}
                          </Badge>
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          {bill.customerName || 'Cash Walk-in'} • {bill.items.length} item(s) • {bill.paymentMethod}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-bold text-slate-900 text-sm">
                          Rs. {bill.grandTotal.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {new Date(bill.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Low Stock Items Alert */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" /> Low Stock Fabrics
                    </CardTitle>
                    <CardDescription>Items running below safety reorder levels</CardDescription>
                  </div>
                  <Link href="/inventory/stock">
                    <Button variant="ghost" size="sm" className="gap-1 text-xs text-blue-600">
                      Stock Manager <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 text-xs">
                  {lowStockProducts.map(prod => (
                    <div key={prod.id} className="p-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                      <div className="min-w-0 pr-2">
                        <div className="font-semibold text-slate-900 truncate">{prod.name}</div>
                        <div className="text-[11px] text-slate-500">
                          SKU: {prod.sku} • {prod.unit}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-bold text-rose-600">
                          {prod.stock} {prod.unit} left
                        </div>
                        <div className="text-[10px] text-slate-400">Min Alert: {prod.minStockAlert}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
