'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Bill, SaleType } from '@/types';
import { salesService } from '@/services/salesService';
import { Modal } from '@/components/ui/Modal';
import {
  Search,
  FileText,
  User,
  RotateCcw,
  ArrowLeftRight,
  Printer,
  Calendar,
  Eye,
  Building,
} from 'lucide-react';

interface WholesaleBillSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleType?: SaleType;
  title?: string;
  description?: string;
  onSelectReturn: (bill: Bill) => void;
  onSelectExchange: (bill: Bill) => void;
  onSelectPrint: (bill: Bill) => void;
  onViewBill: (bill: Bill) => void;
}

export function WholesaleBillSearchModal({
  isOpen,
  onClose,
  saleType = 'Wholesale',
  title,
  description,
  onSelectReturn,
  onSelectExchange,
  onSelectPrint,
  onViewBill,
}: WholesaleBillSearchModalProps) {
  const [customerQuery, setCustomerQuery] = useState('');
  const [invoiceQuery, setInvoiceQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Bill[]>([]);

  const executeSearch = useCallback((custQ: string, invQ: string) => {
    if (!custQ.trim() && !invQ.trim()) {
      // Show latest 15 bills by default
      const latest = salesService
        .getAllBills()
        .filter(b => b.saleType === saleType)
        .slice(0, 15);
      setSearchResults(latest);
      return;
    }

    const results = salesService.searchBills({
      customerName: custQ.trim() || undefined,
      invoiceNumber: invQ.trim() || undefined,
      saleType,
    });
    setSearchResults(results);
  }, [saleType]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        executeSearch(customerQuery, invoiceQuery);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, customerQuery, invoiceQuery, executeSearch]);

  const handleCustomerSearchChange = (val: string) => {
    setCustomerQuery(val);
    setInvoiceQuery(''); // Keep searches independent
    executeSearch(val, '');
  };

  const handleInvoiceSearchChange = (val: string) => {
    setInvoiceQuery(val);
    setCustomerQuery(''); // Keep searches independent
    executeSearch('', val);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title || (saleType === 'Khata' ? 'Khata Credit Invoices & Return / Exchange Portal' : 'Wholesale Invoices & Return / Exchange Portal')}
      description={description || (saleType === 'Khata' ? 'Search previous Khata credit bills by customer name or Khata invoice number.' : 'Independent search for previous wholesale bills by customer name or commercial invoice number.')}
      maxWidth="4xl"
    >
      <div className="space-y-4">
        {/* TWO COMPLETELY INDEPENDENT SEARCH BARS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
          {/* SEARCH BAR 1: Customer Search */}
          <div className="space-y-1">
            <label className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-cyan-600" />
                <span>CUSTOMER SEARCH</span>
              </span>
              {customerQuery && (
                <button
                  type="button"
                  onClick={() => handleCustomerSearchChange('')}
                  className="text-[10px] text-slate-400 hover:text-rose-600"
                >
                  Clear
                </button>
              )}
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search customer / client name (e.g. Bilal)..."
                value={customerQuery}
                onChange={e => handleCustomerSearchChange(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 font-semibold text-slate-900"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Searches individual shopper or business client name
            </p>
          </div>

          {/* SEARCH BAR 2: Invoice Search */}
          <div className="space-y-1">
            <label className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>INVOICE SEARCH</span>
              </span>
              {invoiceQuery && (
                <button
                  type="button"
                  onClick={() => handleInvoiceSearchChange('')}
                  className="text-[10px] text-slate-400 hover:text-rose-600"
                >
                  Clear
                </button>
              )}
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search exact invoice # (e.g. WHO-2026-000001)..."
                value={invoiceQuery}
                onChange={e => handleInvoiceSearchChange(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-slate-900"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Direct lookup by sequential wholesale invoice number
            </p>
          </div>
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span className="font-semibold">
            Found {searchResults.length} matching wholesale invoice(s)
          </span>
          <span className="text-[11px] bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-md font-bold">
            Select an invoice to View, Reprint, Return or Exchange
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-[50vh] overflow-y-auto space-y-2.5 pr-1">
          {searchResults.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <div className="text-xs font-bold text-slate-700">No matching wholesale invoices found</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Try searching by a different customer name or verify the invoice number format.
              </div>
            </div>
          ) : (
            searchResults.map(bill => (
              <div
                key={bill.id}
                className="p-3.5 rounded-2xl border border-slate-200/90 bg-white hover:border-cyan-400 hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                {/* Meta details */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md">
                      {bill.invoiceNumber}
                    </span>

                    {bill.clientName && (
                      <span className="text-xs font-bold text-cyan-800 flex items-center gap-1">
                        <Building className="w-3 h-3 text-cyan-600" />
                        {bill.clientName}
                      </span>
                    )}

                    {bill.customerName && bill.customerName !== bill.clientName && (
                      <span className="text-xs text-slate-600 font-medium">
                        (Shopper: {bill.customerName})
                      </span>
                    )}

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
                    {bill.items.map(i => `${i.quantity} ${i.unit} × ${i.productName}`).join(', ')}
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
                    <span>Staff: {bill.staffName}</span>
                    <span>•</span>
                    <span>Mode: {bill.paymentMethod}</span>
                  </div>
                </div>

                {/* Grand Total & Action Buttons */}
                <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Total Bill</div>
                    <div className="text-sm font-black text-cyan-900 font-mono">
                      Rs. {bill.grandTotal.toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* View */}
                    <button
                      type="button"
                      onClick={() => onViewBill(bill)}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 text-xs flex items-center gap-1 font-semibold"
                      title="View Wholesale Invoice Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">View</span>
                    </button>

                    {/* Print */}
                    <button
                      type="button"
                      onClick={() => onSelectPrint(bill)}
                      className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-slate-200 text-xs flex items-center gap-1 font-semibold"
                      title="Print A4 Commercial Invoice"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Print</span>
                    </button>

                    {/* Return */}
                    <button
                      type="button"
                      onClick={() => onSelectReturn(bill)}
                      className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                      title="Initiate Wholesale Return"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Return</span>
                    </button>

                    {/* Exchange */}
                    <button
                      type="button"
                      onClick={() => onSelectExchange(bill)}
                      className="px-2.5 py-1.5 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 text-cyan-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                      title="Initiate Wholesale Exchange"
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
