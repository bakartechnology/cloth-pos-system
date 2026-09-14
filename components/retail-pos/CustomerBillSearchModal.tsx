'use client';

import React, { useState, useEffect } from 'react';
import { Bill } from '@/types';
import { salesService } from '@/services/salesService';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  Search,
  FileText,
  User,
  RotateCcw,
  ArrowLeftRight,
  Printer,
  Calendar,
  Layers,
  ChevronRight,
  Eye,
  CheckCircle,
} from 'lucide-react';

interface CustomerBillSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'customer' | 'invoice';
  onSelectReturn: (bill: Bill) => void;
  onSelectExchange: (bill: Bill) => void;
  onSelectPrint: (bill: Bill) => void;
  onViewBill: (bill: Bill) => void;
}

export function CustomerBillSearchModal({
  isOpen,
  onClose,
  initialMode = 'customer',
  onSelectReturn,
  onSelectExchange,
  onSelectPrint,
  onViewBill,
}: CustomerBillSearchModalProps) {
  const [customerQuery, setCustomerQuery] = useState('');
  const [invoiceQuery, setInvoiceQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'customer' | 'invoice'>(initialMode);
  const [searchResults, setSearchResults] = useState<Bill[]>([]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
      executeSearch(initialMode === 'customer' ? customerQuery : '', initialMode === 'invoice' ? invoiceQuery : '');
    }
  }, [isOpen, initialMode]);

  const executeSearch = (custQ: string, invQ: string) => {
    if (!custQ.trim() && !invQ.trim()) {
      // Show latest 10 retail bills by default
      const latest = salesService.getBillsByType('Retail').slice(0, 10);
      setSearchResults(latest);
      return;
    }

    const results = salesService.searchBills({
      customerName: custQ.trim() || undefined,
      invoiceNumber: invQ.trim() || undefined,
      saleType: 'Retail',
    });
    setSearchResults(results);
  };

  const handleCustomerSearchChange = (val: string) => {
    setCustomerQuery(val);
    setInvoiceQuery('');
    executeSearch(val, '');
  };

  const handleInvoiceSearchChange = (val: string) => {
    setInvoiceQuery(val);
    setCustomerQuery('');
    executeSearch('', val);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Past Bills & Return / Exchange Portal"
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* Two Independent Search Bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
          {/* SEARCH BAR 1: Customer Name */}
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <User className="w-3.5 h-3.5 text-blue-600" />
              Search Customer
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Enter customer name..."
                value={customerQuery}
                onChange={e => handleCustomerSearchChange(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>
          </div>

          {/* SEARCH BAR 2: Invoice Number */}
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              Search Invoice
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Enter invoice number (e.g. RET-2026-...)"
                value={invoiceQuery}
                onChange={e => handleInvoiceSearchChange(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Results Counter & Info */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>Found {searchResults.length} matching retail bill(s)</span>
          <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold">
            Select an action to initiate Return or Exchange
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-[52vh] overflow-y-auto space-y-2.5 pr-1">
          {searchResults.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <div className="text-xs font-bold text-slate-700">No matching retail bills found</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Check customer name spelling or verify invoice number.
              </div>
            </div>
          ) : (
            searchResults.map(bill => (
              <div
                key={bill.id}
                className="p-3.5 rounded-xl border border-slate-200/90 bg-white hover:border-blue-300 hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                {/* Bill Meta */}
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                      {bill.invoiceNumber}
                    </span>
                    <span className="text-xs font-bold text-blue-600">
                      {bill.customerName ? bill.customerName : 'No Customer Name Recorded'}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        bill.status === 'Completed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : bill.status === 'Returned'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {bill.status}
                    </span>
                  </div>

                  {/* Items summary */}
                  <div className="text-xs text-slate-600 truncate">
                    <span className="font-semibold text-slate-700">Items: </span>
                    {bill.items.map(i => `${i.quantity} × ${i.productName}`).join(', ')}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(bill.date).toLocaleDateString('en-PK', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <span>•</span>
                    <span>Cashier: {bill.staffName}</span>
                    <span>•</span>
                    <span>Paid: {bill.paymentMethod}</span>
                  </div>
                </div>

                {/* Grand Total & Action Buttons */}
                <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Total Bill</div>
                    <div className="text-sm font-black text-slate-900 font-mono">
                      Rs. {bill.grandTotal.toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* View Bill */}
                    <button
                      type="button"
                      onClick={() => onViewBill(bill)}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 text-xs flex items-center gap-1 font-semibold"
                      title="View Bill Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">View</span>
                    </button>

                    {/* Print */}
                    <button
                      type="button"
                      onClick={() => onSelectPrint(bill)}
                      className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-slate-200 text-xs flex items-center gap-1 font-semibold"
                      title="Reprint Thermal Receipt"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Print</span>
                    </button>

                    {/* Return Button */}
                    <button
                      type="button"
                      onClick={() => onSelectReturn(bill)}
                      className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                      title="Process Return"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Return</span>
                    </button>

                    {/* Exchange Button */}
                    <button
                      type="button"
                      onClick={() => onSelectExchange(bill)}
                      className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                      title="Process Exchange"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      <span>Exchange</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
