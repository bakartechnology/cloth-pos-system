'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  TrendingUp,
  Award,
  ArrowLeft,
  DollarSign,
  Receipt,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { reportsService } from '@/services/reportsService';

export default function StaffSalesTrackingPage() {
  const [staffSales, setStaffSales] = useState<any[]>([]);

  useEffect(() => {
    setStaffSales(reportsService.getStaffSalesPerformance());
  }, []);

  return (
    <ProtectedRoute permission="staff_view">
      <AppShell>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-3">
              <Link href="/staff">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ArrowLeft className="w-4 h-4" /> Staff
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Staff Sales Performance & Cashier Audits
                </h1>
                <p className="text-xs text-slate-500">
                  Detailed metrics on retail billing, wholesale orders, khata sales, and field payment recovery.
                </p>
              </div>
            </div>
          </div>

          {/* Leaderboard Table */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" /> Cashier & Recovery Leaderboard
              </CardTitle>
              <CardDescription>
                Gross revenues, recovered cash balances, and average ticket per terminal
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-4">Role & Station</th>
                      <th className="py-3 px-4 text-right">Retail Sales</th>
                      <th className="py-3 px-4 text-right">Wholesale Sales</th>
                      <th className="py-3 px-4 text-right">Khata Sales</th>
                      <th className="py-3 px-4 text-right">Collections Recovered</th>
                      <th className="py-3 px-4 text-center">Invoices</th>
                      <th className="py-3 px-4 text-right">Average Bill</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staffSales.map(s => (
                      <tr key={s.staffId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">{s.name}</td>
                        <td className="py-3 px-4 text-slate-600">
                          <div>{s.role}</div>
                          <div className="text-[10px] text-slate-400">{s.counter}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-800">
                          Rs. {s.retailSales.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-cyan-700">
                          Rs. {s.wholesaleSales.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-amber-700">
                          Rs. {s.khataSales.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-emerald-700">
                          Rs. {s.collectionsTotal.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold">
                          {s.txCount}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          Rs. {s.avgBill.toLocaleString()}
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
