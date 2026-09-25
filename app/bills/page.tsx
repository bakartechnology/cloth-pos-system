'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ThermalReceipt } from '@/components/print/ThermalReceipt';
import { WholesaleInvoicePrint } from '@/components/print/WholesaleInvoicePrint';
import {
  Receipt,
  Search,
  Printer,
  RotateCcw,
  Copy,
} from 'lucide-react';
import { salesService } from '@/services/salesService';
import { useToast } from '@/context/ToastContext';
import { Bill, SaleType } from '@/types';

export default function BillHistoryPage() {
  const { toast } = useToast();
  const [bills, setBills] = useState<Bill[]>(() => {
    if (typeof window !== 'undefined') {
      return salesService.getAllBills();
    }
    return [];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | SaleType>('All');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Selected Bill for View / Print Modal
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  useEffect(() => {
    const handleSync = () => setBills(salesService.getAllBills());
    window.addEventListener('focus', handleSync);
    return () => window.removeEventListener('focus', handleSync);
  }, []);

  const handleRefundPlaceholder = (invoiceNum: string) => {
    toast({
      title: 'Refund / Exchange Mode',
      description: `Return workflow initialized for invoice #${invoiceNum}. Items can be returned to inventory.`,
      type: 'info',
    });
  };

  const handleDuplicate = (bill: Bill) => {
    navigator.clipboard.writeText(JSON.stringify(bill, null, 2));
    toast({
      title: 'Invoice Duplicated',
      description: `Invoice #${bill.invoiceNumber} details copied to clipboard.`,
      type: 'success',
    });
  };

  const filteredBills = bills.filter(b => {
    const matchesType = typeFilter === 'All' || b.saleType === typeFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      b.invoiceNumber.toLowerCase().includes(q) ||
      (b.customerName && b.customerName.toLowerCase().includes(q)) ||
      b.staffName.toLowerCase().includes(q) ||
      b.items.some(i => i.productName.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));

    let matchesPeriod = true;
    const billDate = new Date(b.date);
    const today = new Date();
    if (periodFilter === 'today') {
      matchesPeriod = billDate.toDateString() === today.toDateString();
    } else if (periodFilter === 'week') {
      const diffTime = Math.abs(today.getTime() - billDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      matchesPeriod = diffDays <= 7;
    } else if (periodFilter === 'month') {
      matchesPeriod =
        billDate.getMonth() === today.getMonth() && billDate.getFullYear() === today.getFullYear();
    }

    return matchesType && matchesQuery && matchesPeriod;
  });

  return (
    <ProtectedRoute permission="bills_view">
      <AppShell>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1 rounded bg-blue-50 text-blue-700 font-mono text-[10px] font-bold uppercase">
                  Billing Archive
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {bills.length} historical invoices archived
                </span>
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Bill & Sales Invoice Archive
              </h1>
            </div>
          </div>

          {/* Filters Bar */}
          <Card className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Search */}
              <div className="relative sm:col-span-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search invoice #, client, fabric, staff..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Type Filter */}
              <div className="flex items-center p-0.5 bg-slate-100 rounded-lg text-xs font-semibold">
                {(['All', 'Retail', 'Wholesale', 'Khata'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`flex-1 py-1.5 rounded-md transition-colors ${
                      typeFilter === t ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Period Filter */}
              <div className="flex items-center p-0.5 bg-slate-100 rounded-lg text-xs font-semibold">
                {(['all', 'today', 'week', 'month'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriodFilter(p)}
                    className={`flex-1 py-1.5 rounded-md capitalize transition-colors ${
                      periodFilter === p ? 'bg-blue-600 text-white shadow-2xs font-bold' : 'text-slate-600'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Bills Archive Table */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {filteredBills.length === 0 ? (
                <EmptyState
                  icon={<Receipt className="w-8 h-8 text-slate-400" />}
                  title="No bills found"
                  description="No invoices matched your current search filters."
                  className="m-6 border-none"
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">Invoice #</th>
                        <th className="py-3 px-4">Date & Time</th>
                        <th className="py-3 px-4">Channel</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Items Count</th>
                        <th className="py-3 px-4">Tender</th>
                        <th className="py-3 px-4 text-right">Grand Total</th>
                        <th className="py-3 px-4">Handled By</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredBills.map(bill => (
                        <tr key={bill.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-blue-600 whitespace-nowrap">
                            #{bill.invoiceNumber}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                            {new Date(bill.date).toLocaleString('en-PK', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>

                          <td className="py-3 px-4">
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
                              {bill.saleType === 'Khata' ? 'Khata Credit POS' : bill.saleType}
                            </Badge>
                          </td>

                          <td className="py-3 px-4 max-w-[180px] truncate">
                            <div className="font-bold text-slate-900 truncate">
                              {bill.customerName || 'Cash Walk-in'}
                            </div>
                            {bill.customerBusiness && (
                              <div className="text-[10px] text-slate-500 truncate">
                                {bill.customerBusiness}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 text-slate-600">
                            {bill.items.length} item(s)
                          </td>

                          <td className="py-3 px-4">
                            <Badge size="sm" variant="secondary">
                              {bill.paymentMethod}
                            </Badge>
                          </td>

                          <td className="py-3 px-4 text-right font-black text-slate-900 text-sm">
                            Rs. {bill.grandTotal.toLocaleString()}
                          </td>

                          <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                            {bill.staffName}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setSelectedBill(bill);
                                  setIsPrintModalOpen(true);
                                }}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
                                title="View & Print Bill"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDuplicate(bill)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                                title="Duplicate / Copy Details"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRefundPlaceholder(bill.invoiceNumber)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded transition-colors"
                                title="Return / Exchange"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Modal: View & Print Bill */}
        <Modal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          title={`Invoice #${selectedBill?.invoiceNumber || ''}`}
          maxWidth={selectedBill?.saleType === 'Wholesale' || selectedBill?.saleType === 'Khata' ? '4xl' : 'md'}
        >
          {selectedBill && (
            selectedBill.saleType === 'Wholesale' || selectedBill.saleType === 'Khata' ? (
              <WholesaleInvoicePrint
                bill={selectedBill}
                onClose={() => setIsPrintModalOpen(false)}
              />
            ) : (
              <ThermalReceipt
                bill={selectedBill}
                onClose={() => setIsPrintModalOpen(false)}
              />
            )
          )}
        </Modal>
      </AppShell>
    </ProtectedRoute>
  );
}
