'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  TrendingUp,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  SlidersHorizontal,
  ArrowLeft,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';
import { inventoryService } from '@/services/inventoryService';
import { StockMovement } from '@/types';

export default function StockHistoryPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');

  useEffect(() => {
    setMovements(inventoryService.getMovements());
  }, []);

  const filtered = movements.filter(m => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      m.productName.toLowerCase().includes(q) ||
      m.sku.toLowerCase().includes(q) ||
      (m.referenceId && m.referenceId.toLowerCase().includes(q));
    const matchesType = typeFilter === 'All' || m.movementType === typeFilter;
    return matchesQuery && matchesType;
  });

  return (
    <ProtectedRoute permission="stock_view">
      <AppShell>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-3">
              <Link href="/inventory/stock">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ArrowLeft className="w-4 h-4" /> Stock Overview
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Stock Movement & Inventory Audit Trail
                </h1>
                <p className="text-xs text-slate-500">
                  Real-time ledger of sales deductions, supplier restocks, and counter adjustments.
                </p>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter product, SKU, or invoice reference..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
                {['All', 'Sale', 'Restock', 'Initial', 'Adjustment', 'Return'].map(t => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      typeFilter === t
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Activity Table */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Product Name & SKU</th>
                      <th className="py-3 px-4">Movement Type</th>
                      <th className="py-3 px-4 text-center">Previous Stock</th>
                      <th className="py-3 px-4 text-center">Quantity Change</th>
                      <th className="py-3 px-4 text-center">New Stock</th>
                      <th className="py-3 px-4">Logged Staff</th>
                      <th className="py-3 px-4">Reference & Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map(mov => {
                      const isPositive = mov.quantityChange > 0;

                      return (
                        <tr key={mov.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                            {new Date(mov.date).toLocaleString('en-PK', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>

                          <td className="py-3 px-4 max-w-xs">
                            <div className="font-bold text-slate-900 leading-tight">{mov.productName}</div>
                            <div className="font-mono text-[10px] text-slate-500">{mov.sku}</div>
                          </td>

                          <td className="py-3 px-4">
                            <Badge
                              size="sm"
                              variant={
                                mov.movementType === 'Sale'
                                  ? 'destructive'
                                  : mov.movementType === 'Restock'
                                  ? 'success'
                                  : 'default'
                              }
                            >
                              {mov.movementType}
                            </Badge>
                          </td>

                          <td className="py-3 px-4 text-center font-mono text-slate-600">
                            {mov.previousStock}
                          </td>

                          <td className="py-3 px-4 text-center font-black text-xs">
                            <span
                              className={`inline-flex items-center gap-0.5 ${
                                isPositive ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {isPositive ? '+' : ''}
                              {mov.quantityChange}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center font-bold text-slate-900 font-mono">
                            {mov.newStock}
                          </td>

                          <td className="py-3 px-4 text-slate-700 font-medium">{mov.staffName}</td>

                          <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                            {mov.referenceId && (
                              <span className="font-mono text-[11px] text-blue-600 font-semibold mr-1">
                                #{mov.referenceId}
                              </span>
                            )}
                            {mov.notes}
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
