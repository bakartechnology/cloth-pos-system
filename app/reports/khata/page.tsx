'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { BookOpen, ArrowLeft, Printer } from 'lucide-react';
import Link from 'next/link';
import { customersService } from '@/services/customersService';
import { Customer } from '@/types';

export default function KhataReportsPage() {
  const [khataCustomers, setKhataCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    setKhataCustomers(customersService.getAll().filter(c => c.type === 'Khata'));
  }, []);

  const totalOutstanding = khataCustomers.reduce((sum, c) => sum + c.currentBalance, 0);
  const totalPurchases = khataCustomers.reduce((sum, c) => sum + c.totalPurchased, 0);
  const totalRecovered = khataCustomers.reduce((sum, c) => sum + c.totalPaid, 0);

  return (
    <ProtectedRoute permission="reports_view">
      <AppShell>
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-3">
              <Link href="/reports">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ArrowLeft className="w-4 h-4" /> All Reports
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Khata Receivables & Aging Report
                </h1>
                <p className="text-xs text-slate-500">
                  Credit risk exposure, outstanding customer balances, and historical recovery ratios.
                </p>
              </div>
            </div>
            <Button variant="outline" size="md" onClick={() => window.print()} className="gap-2">
              <Printer className="w-4 h-4" /> Print Aging Report
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Outstanding Receivables
              </span>
              <div className="text-2xl font-black text-rose-600 mt-1">
                Rs. {totalOutstanding.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-1">Due from {khataCustomers.length} active ledger clients</div>
            </Card>

            <Card className="p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Cleared & Recovered
              </span>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                Rs. {totalRecovered.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {Math.round((totalRecovered / (totalPurchases || 1)) * 100)}% recovery clearance rate
              </div>
            </Card>

            <Card className="p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Lifetime Credit Granted
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                Rs. {totalPurchases.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-1">Total credit turnover across ledgers</div>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-sm font-bold">Client Ledger Balances & Credit Exposure</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Client Name</th>
                      <th className="py-3 px-4">Shop / Business</th>
                      <th className="py-3 px-4">City</th>
                      <th className="py-3 px-4 text-right">Credit Limit</th>
                      <th className="py-3 px-4 text-right">Lifetime Debits</th>
                      <th className="py-3 px-4 text-right">Lifetime Credits</th>
                      <th className="py-3 px-4 text-right">Current Balance Owed</th>
                      <th className="py-3 px-4">Last Transaction</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {khataCustomers.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                        <td className="py-3 px-4 text-slate-600">{c.businessName || '—'}</td>
                        <td className="py-3 px-4 text-slate-500">{c.city}</td>
                        <td className="py-3 px-4 text-right font-mono">Rs. {c.creditLimit.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right font-medium">Rs. {c.totalPurchased.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right font-medium text-emerald-700">
                          Rs. {c.totalPaid.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-rose-600 text-sm">
                          Rs. {c.currentBalance.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                          {c.lastTransactionDate || '—'}
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
