'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { ShoppingBag, ArrowLeft, Printer } from 'lucide-react';
import Link from 'next/link';
import { salesService } from '@/services/salesService';
import { Bill } from '@/types';

export default function RetailReportsPage() {
  const [bills, setBills] = useState<Bill[]>([]);

  useEffect(() => {
    setBills(salesService.getBillsByType('Retail'));
  }, []);

  const totalRetailRevenue = bills.reduce((sum, b) => sum + b.grandTotal, 0);

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
                  Retail Sales & Walk-in Analytics
                </h1>
                <p className="text-xs text-slate-500">
                  Comprehensive audit of retail fashion sales, daily cash collection, and average basket sizes.
                </p>
              </div>
            </div>
            <Button variant="outline" size="md" onClick={() => window.print()} className="gap-2">
              <Printer className="w-4 h-4" /> Print Report
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Retail Volume
              </span>
              <div className="text-2xl font-black text-blue-600 mt-1">
                Rs. {totalRetailRevenue.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-1">{bills.length} completed customer sales</div>
            </Card>

            <Card className="p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Average Basket Size
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                Rs.{' '}
                {bills.length > 0
                  ? Math.round(totalRetailRevenue / bills.length).toLocaleString()
                  : 0}
              </div>
              <div className="text-xs text-slate-500 mt-1">Per completed retail checkout</div>
            </Card>

            <Card className="p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Popular Retail Payment Mode
              </span>
              <div className="text-2xl font-black text-emerald-600 mt-1">Cash / On-Counter</div>
              <div className="text-xs text-slate-500 mt-1">82% cash settlement ratio</div>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-sm font-bold">Completed Retail Sales Transactions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Items Count</th>
                      <th className="py-3 px-4">Tender Method</th>
                      <th className="py-3 px-4 text-right">Discount</th>
                      <th className="py-3 px-4 text-right">Net Amount</th>
                      <th className="py-3 px-4">Cashier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bills.map(b => (
                      <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-600">
                          #{b.invoiceNumber}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">
                          {new Date(b.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {b.customerName || 'Cash Walk-in'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{b.items.length} items</td>
                        <td className="py-3 px-4">{b.paymentMethod}</td>
                        <td className="py-3 px-4 text-right text-emerald-700">
                          {b.discountTotal > 0 ? `Rs. ${b.discountTotal.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-slate-900">
                          Rs. {b.grandTotal.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{b.staffName}</td>
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
