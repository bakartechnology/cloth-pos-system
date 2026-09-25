'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import {
  FileText,
  Search,
  Printer,
  Calendar,
  Eye,
  ShoppingBag,
  Sparkles,
  ArrowUpDown,
  Filter,
  Receipt,
  User,
} from 'lucide-react';
import { salesService } from '@/services/salesService';
import { retentionService } from '@/services/retentionService';
import { Bill } from '@/types';

export default function RetailStatementPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  const retentionYears = retentionService.getActiveRetentionYears();

  useEffect(() => {
    // 1. Fetch only Retail invoices
    const retailBills = salesService.getAllBills().filter(b => b.saleType === 'Retail');
    // 2. Apply 5-year rolling retention policy safely
    const retained = retentionService.filterActiveStatements(retailBills);
    setBills(retained);
  }, []);

  const filteredBills = bills.filter(b => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      b.invoiceNumber.toLowerCase().includes(q) ||
      (b.customerName && b.customerName.toLowerCase().includes(q)) ||
      (b.customerPhone && b.customerPhone.includes(q)) ||
      b.staffName.toLowerCase().includes(q) ||
      b.items.some(i => i.productName.toLowerCase().includes(q));

    const billYear = new Date(b.date).getFullYear().toString();
    const matchYear = selectedYear === 'All' || billYear === selectedYear;

    return matchSearch && matchYear;
  });

  const totalSales = filteredBills.reduce((sum, b) => sum + b.grandTotal, 0);
  const totalDiscount = filteredBills.reduce((sum, b) => sum + b.discountTotal, 0);
  const totalPaid = filteredBills.reduce((sum, b) => sum + (b.amountReceived || b.grandTotal), 0);

  return (
    <ProtectedRoute permission="retail_statement_view">
      <AppShell>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1 rounded bg-blue-50 text-blue-700 font-mono text-[10px] font-bold uppercase">
                  Statement Registry
                </span>
                <span className="text-xs text-slate-500 font-medium">5-Year Rolling History</span>
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Retail Customer Statement
              </h1>
              <p className="text-xs text-slate-500">
                Audit and inspect complete statement histories, purchased items, discounts, and payments for retail shoppers.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  if (typeof window !== 'undefined') window.print();
                }}
                className="gap-2 font-semibold"
              >
                <Printer className="w-4 h-4 text-blue-600" /> Print Statement Report
              </Button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Invoices
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {filteredBills.length}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">Matching current filters</div>
            </Card>

            <Card className="p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Billed Amount
              </span>
              <div className="text-2xl font-black text-blue-600 mt-1">
                Rs. {totalSales.toLocaleString()}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">Gross retail sales</div>
            </Card>

            <Card className="p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Discounts Given
              </span>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                Rs. {totalDiscount.toLocaleString()}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">Promotional savings</div>
            </Card>

            <Card className="p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Amount Received
              </span>
              <div className="text-2xl font-black text-indigo-600 mt-1">
                Rs. {totalPaid.toLocaleString()}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">Collected at counter</div>
            </Card>
          </div>

          {/* Search & 5-Year Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search customer, phone, invoice #, fabric item, staff..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            {/* 5-Year Rolling Filter Tabs */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Retention Window:
              </span>
              <button
                type="button"
                onClick={() => setSelectedYear('All')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  selectedYear === 'All'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All (5-Yr Rolling)
              </button>
              {retentionYears.map(year => (
                <button
                  key={year}
                  type="button"
                  onClick={() => setSelectedYear(year.toString())}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    selectedYear === year.toString()
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>

          {/* Invoices Statement Table */}
          <Card className="overflow-hidden border-slate-200/80 shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3.5">Invoice #</th>
                    <th className="px-4 py-3.5">Date & Time</th>
                    <th className="px-4 py-3.5">Customer Name</th>
                    <th className="px-4 py-3.5">Items Summary</th>
                    <th className="px-4 py-3.5">Payment</th>
                    <th className="px-4 py-3.5">Subtotal</th>
                    <th className="px-4 py-3.5">Discount</th>
                    <th className="px-4 py-3.5 font-black text-slate-900">Paid Amount</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBills.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-slate-400">
                        <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                        <p className="font-semibold text-sm text-slate-600">No retail statements found</p>
                        <p className="text-xs mt-1">Try adjusting the search query or 5-year retention period.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredBills.map(bill => {
                      const totalQty = bill.items.reduce((sum, i) => sum + i.quantity, 0);
                      return (
                        <tr key={bill.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-blue-700">
                            {bill.invoiceNumber}
                          </td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            <div>{new Date(bill.date).toLocaleDateString()}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {new Date(bill.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <User className="w-3 h-3 text-slate-400" />
                              {bill.customerName || 'Walk-in Customer'}
                            </div>
                            {bill.customerPhone && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                {bill.customerPhone}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">
                              {bill.items.length} line(s) • {totalQty} item(s)
                            </div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                              {bill.items.map(i => i.productName).join(', ')}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" size="sm" className="font-medium text-[10px]">
                              {bill.paymentMethod}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600">
                            Rs. {bill.subtotal.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 font-mono text-emerald-600 font-semibold">
                            {bill.discountTotal > 0 ? `− Rs. ${bill.discountTotal.toLocaleString()}` : '—'}
                          </td>
                          <td className="px-4 py-3 font-mono font-black text-slate-900 text-sm">
                            Rs. {bill.grandTotal.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedBill(bill)}
                              className="gap-1 text-[11px] h-7 px-2"
                            >
                              <Eye className="w-3 h-3" /> View Details
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* MODAL: View Retail Invoice Details */}
          <Modal
            isOpen={!!selectedBill}
            onClose={() => setSelectedBill(null)}
            title="Retail Invoice Statement Details"
            maxWidth="2xl"
          >
            {selectedBill && (
              <div className="space-y-4 text-xs">
                {/* Invoice Meta */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                  <div>
                    <span className="text-slate-400 block font-bold uppercase text-[10px]">Invoice Ref</span>
                    <span className="font-mono font-black text-blue-700">{selectedBill.invoiceNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold uppercase text-[10px]">Date</span>
                    <span className="text-slate-800">{new Date(selectedBill.date).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold uppercase text-[10px]">Customer</span>
                    <span className="font-bold text-slate-900">{selectedBill.customerName || 'Walk-in'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold uppercase text-[10px]">Cashier / Staff</span>
                    <span className="text-slate-700">{selectedBill.staffName}</span>
                  </div>
                </div>

                {/* Items Purchased Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="px-3 py-2">Item Name</th>
                        <th className="px-3 py-2 text-center">Qty</th>
                        <th className="px-3 py-2 text-right">Unit Rate</th>
                        <th className="px-3 py-2 text-right">Discount</th>
                        <th className="px-3 py-2 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedBill.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2">
                            <div className="font-bold text-slate-900">{item.productName}</div>
                            {item.sku && <div className="text-[10px] text-slate-400 font-mono">{item.sku}</div>}
                          </td>
                          <td className="px-3 py-2 text-center font-mono font-bold">{item.quantity}</td>
                          <td className="px-3 py-2 text-right font-mono text-slate-700">
                            Rs. {item.price.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-emerald-600">
                            {item.discountPercent ? `${item.discountPercent}%` : item.extraDiscountRupees ? `Rs. ${item.extraDiscountRupees}` : '—'}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                            Rs. {(item.lineTotal ?? item.subtotal).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals Breakdown */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Gross Subtotal:</span>
                    <span className="font-mono font-bold">Rs. {selectedBill.subtotal.toLocaleString()}</span>
                  </div>
                  {selectedBill.discountTotal > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Total Discount:</span>
                      <span className="font-mono font-bold">− Rs. {selectedBill.discountTotal.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
                    <span>Net Payable:</span>
                    <span className="text-blue-700 font-mono">Rs. {selectedBill.grandTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 pt-1 text-[11px]">
                    <span>Payment Method:</span>
                    <span className="font-bold">{selectedBill.paymentMethod}</span>
                  </div>
                  {selectedBill.notes && (
                    <div className="pt-2 border-t border-slate-200 text-slate-500 italic">
                      Notes: {selectedBill.notes}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button variant="outline" size="sm" onClick={() => setSelectedBill(null)}>
                    Close
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      if (typeof window !== 'undefined') window.print();
                    }}
                    className="gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print Invoice
                  </Button>
                </div>
              </div>
            )}
          </Modal>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
