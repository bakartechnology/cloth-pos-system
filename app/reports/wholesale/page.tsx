'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Truck, ArrowLeft, Printer } from 'lucide-react';
import Link from 'next/link';
import { salesService } from '@/services/salesService';
import { Bill } from '@/types';

export default function WholesaleReportsPage() {
  const [bills, setBills] = useState<Bill[]>([]);

  useEffect(() => {
    setBills(salesService.getBillsByType('Wholesale'));
  }, []);

  const totalWholesale = bills.reduce((sum, b) => sum + b.grandTotal, 0);

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
                  Wholesale & B2B Distribution Reports
                </h1>
                <p className="text-xs text-slate-500">
                  Bulk shipments, trader orders, volume discounts, and outstation logistics.
                </p>
              </div>
            </div>
            <Button variant="outline" size="md" onClick={() => window.print()} className="gap-2">
              <Printer className="w-4 h-4" /> Print Wholesale Report
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Wholesale Orders
              </span>
              <div className="text-2xl font-black text-cyan-700 mt-1">
                Rs. {totalWholesale.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-1">{bills.length} commercial tax invoices</div>
            </Card>

            <Card className="p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Average Wholesale Ticket
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                Rs.{' '}
                {bills.length > 0
                  ? Math.round(totalWholesale / bills.length).toLocaleString()
                  : 0}
              </div>
              <div className="text-xs text-slate-500 mt-1">Commercial order average</div>
            </Card>

            <Card className="p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Top Dispatch Destination
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">Karachi & Faisalabad</div>
              <div className="text-xs text-slate-500 mt-1">Major textile trade hubs</div>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-sm font-bold">Wholesale Tax Invoices</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Wholesale Client</th>
                      <th className="py-3 px-4">Business Title</th>
                      <th className="py-3 px-4">Settlement</th>
                      <th className="py-3 px-4 text-right">Invoice Total</th>
                      <th className="py-3 px-4">Sales Officer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bills.map(b => (
                      <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-cyan-700">
                          #{b.invoiceNumber}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">
                          {new Date(b.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">{b.customerName}</td>
                        <td className="py-3 px-4 text-slate-600">{b.customerBusiness || '—'}</td>
                        <td className="py-3 px-4 font-semibold">{b.paymentMethod}</td>
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
