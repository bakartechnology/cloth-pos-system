'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Layers,
  Users,
  Printer,
  Sparkles,
  ShoppingBag,
  Truck,
  BookOpen,
  ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';
import { reportsService } from '@/services/reportsService';

export default function ReportsHubPage() {
  const [activeYear, setActiveYear] = useState<number>(2026);
  const [historicalData, setHistoricalData] = useState<any>(null);

  useEffect(() => {
    setHistoricalData(reportsService.getHistoricalSummary());
  }, []);

  const years = [2026, 2025, 2024, 2023, 2022];
  const currentYearData = historicalData?.years.find((y: any) => y.year === activeYear) || historicalData?.years[0];

  const maxMonthVal = currentYearData
    ? Math.max(...currentYearData.months.map((m: any) => m.total || 0), 1)
    : 1;

  return (
    <ProtectedRoute permission="reports_view">
      <AppShell>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1 rounded bg-blue-50 text-blue-700 font-mono text-[10px] font-bold uppercase">
                  5-Year Multi-Period Intelligence
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Historical Records from 2022 to 2026
                </span>
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Enterprise Business Reports & Analytics Center
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="md" onClick={() => window.print()} className="gap-2">
                <Printer className="w-4 h-4" /> Print Report Summary
              </Button>
            </div>
          </div>

          {/* Sub-report Quick Links */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Link href="/reports/retail">
              <div className="p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-xs transition-all text-center">
                <ShoppingBag className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <span className="text-xs font-bold text-slate-900 block">Retail Reports</span>
                <span className="text-[10px] text-slate-400">Walk-in analytics</span>
              </div>
            </Link>
            <Link href="/reports/wholesale">
              <div className="p-3 bg-white rounded-xl border border-slate-200 hover:border-cyan-400 hover:shadow-xs transition-all text-center">
                <Truck className="w-5 h-5 text-cyan-600 mx-auto mb-1" />
                <span className="text-xs font-bold text-slate-900 block">Wholesale Reports</span>
                <span className="text-[10px] text-slate-400">B2B volume</span>
              </div>
            </Link>
            <Link href="/reports/khata">
              <div className="p-3 bg-white rounded-xl border border-slate-200 hover:border-amber-400 hover:shadow-xs transition-all text-center">
                <BookOpen className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                <span className="text-xs font-bold text-slate-900 block">Khata Reports</span>
                <span className="text-[10px] text-slate-400">Aging & recovery</span>
              </div>
            </Link>
            <Link href="/reports/stock">
              <div className="p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-xs transition-all text-center">
                <Layers className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
                <span className="text-xs font-bold text-slate-900 block">Stock Valuation</span>
                <span className="text-[10px] text-slate-400">Category share</span>
              </div>
            </Link>
            <Link href="/reports/staff">
              <div className="p-3 bg-white rounded-xl border border-slate-200 hover:border-emerald-400 hover:shadow-xs transition-all text-center">
                <Users className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                <span className="text-xs font-bold text-slate-900 block">Staff Performance</span>
                <span className="text-[10px] text-slate-400">Cashier audits</span>
              </div>
            </Link>
          </div>

          {/* 5-Year Historical Year Selector Bar */}
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Select Financial Year (5-Year Historical Archives)
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Full 5-year retention policy maintained in frontend data schema.
                </p>
              </div>

              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                {years.map(y => (
                  <button
                    key={y}
                    onClick={() => setActiveYear(y)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeYear === y
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {y} {y === 2026 && '(Current)'}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Active Year KPI Highlights */}
          {currentYearData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Total Revenue ({activeYear})
                </span>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  Rs. {(currentYearData.totalSales / 100000).toFixed(1)} Lakh
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Rs. {currentYearData.totalSales.toLocaleString()}
                </div>
              </Card>

              <Card className="p-4">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Retail Channel Split
                </span>
                <div className="text-2xl font-black text-blue-600 mt-1">
                  Rs. {(currentYearData.retailSales / 100000).toFixed(1)} Lakh
                </div>
                <div className="text-xs text-emerald-600 font-semibold mt-1">
                  {Math.round((currentYearData.retailSales / currentYearData.totalSales) * 100)}% of total volume
                </div>
              </Card>

              <Card className="p-4">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Wholesale Channel Split
                </span>
                <div className="text-2xl font-black text-cyan-600 mt-1">
                  Rs. {(currentYearData.wholesaleSales / 100000).toFixed(1)} Lakh
                </div>
                <div className="text-xs text-cyan-700 font-semibold mt-1">
                  {Math.round((currentYearData.wholesaleSales / currentYearData.totalSales) * 100)}% of total volume
                </div>
              </Card>

              <Card className="p-4">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Khata Collections Recovered
                </span>
                <div className="text-2xl font-black text-emerald-600 mt-1">
                  Rs. {(currentYearData.khataCollection / 100000).toFixed(1)} Lakh
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {currentYearData.transactionsCount.toLocaleString()} total transactions
                </div>
              </Card>
            </div>
          )}

          {/* Monthly / Quarterly Breakdown Interactive Chart */}
          {currentYearData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" /> Revenue Distribution for {activeYear}
                </CardTitle>
                <CardDescription>
                  Monthly performance split between Retail and Wholesale transactions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end justify-between gap-3 border-b border-slate-200 pb-2">
                  {currentYearData.months.map((m: any, idx: number) => {
                    const retailH = Math.max(8, Math.round((m.retail / maxMonthVal) * 200));
                    const wholesaleH = Math.max(8, Math.round((m.wholesale / maxMonthVal) * 200));

                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono bg-slate-900 text-white px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap z-20 -mb-2">
                          Total: Rs. {m.total.toLocaleString()}
                        </div>

                        <div className="w-full flex items-end justify-center gap-1 max-w-[42px]">
                          <div
                            style={{ height: `${retailH}px` }}
                            className="w-full bg-blue-600 rounded-t-md hover:bg-blue-500 transition-all"
                            title={`Retail: Rs. ${m.retail.toLocaleString()}`}
                          />
                          <div
                            style={{ height: `${wholesaleH}px` }}
                            className="w-full bg-cyan-500 rounded-t-md hover:bg-cyan-400 transition-all"
                            title={`Wholesale: Rs. ${m.wholesale.toLocaleString()}`}
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-600 truncate max-w-[42px]">
                          {m.month}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-center gap-6 mt-4 text-xs font-semibold text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-blue-600" />
                    <span>Retail Revenue</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-cyan-500" />
                    <span>Wholesale Bulk Revenue</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 5-Year Historical Comparison Table */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-700" /> 5-Year Historical Comparative Summary (2022–2026)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Financial Year</th>
                      <th className="py-3 px-4 text-right">Retail Sales</th>
                      <th className="py-3 px-4 text-right">Wholesale Sales</th>
                      <th className="py-3 px-4 text-right">Khata Recovered</th>
                      <th className="py-3 px-4 text-right">Total Net Sales</th>
                      <th className="py-3 px-4 text-center">Transactions</th>
                      <th className="py-3 px-4 text-right">Average Ticket</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historicalData?.years.map((y: any) => (
                      <tr
                        key={y.year}
                        className={`hover:bg-slate-50/60 transition-colors ${
                          y.year === activeYear ? 'bg-blue-50/30 font-semibold' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                          {y.year} {y.year === 2026 && <span className="text-blue-600 text-[10px]">(YTD)</span>}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-800">
                          Rs. {y.retailSales.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-cyan-700">
                          Rs. {y.wholesaleSales.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-700 font-medium">
                          Rs. {y.khataCollection.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-slate-900">
                          Rs. {y.totalSales.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center font-mono">
                          {y.transactionsCount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          Rs. {y.avgTicket.toLocaleString()}
                        </td>
                      </tr>
                    ))}
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
