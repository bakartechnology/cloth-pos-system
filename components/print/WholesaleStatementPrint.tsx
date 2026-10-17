'use client';

import React from 'react';
import { Bill } from '@/types';
import { Printer, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';

interface WholesaleStatementPrintProps {
  bills: Bill[];
  activeTab?: 'Client' | 'Customer';
  dateRangeLabel?: string;
  onClose?: () => void;
}

export function WholesaleStatementPrint({
  bills,
  activeTab = 'Client',
  dateRangeLabel = '5-Year Rolling History',
  onClose,
}: WholesaleStatementPrintProps) {
  const handlePrint = () => {
    window.print();
  };

  const totalSales = bills.reduce((sum, b) => sum + b.grandTotal, 0);
  const totalDiscount = bills.reduce((sum, b) => sum + b.discountTotal, 0);
  const totalPaid = bills.reduce((sum, b) => sum + (b.amountReceived || b.grandTotal), 0);

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto">
      {/* Action Header */}
      <div className="flex items-center justify-between w-full mb-6 no-print">
        <Button variant="outline" size="sm" onClick={onClose} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to Wholesale Registry
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="md" onClick={handlePrint} className="gap-2 bg-cyan-700 hover:bg-cyan-800">
            <Printer className="w-4 h-4" /> Print Wholesale Statement
          </Button>
        </div>
      </div>

      {/* Statement Container */}
      <div
        id="printable-wholesale-statement"
        className="printable-area invoice-a4-container w-full bg-white p-8 sm:p-12 border border-slate-200 rounded-xl shadow-sm text-slate-900 print:p-0 print:border-none print:shadow-none"
      >
        {/* Top Branding */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">AL-NOOR FABRICS</h1>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Wholesale Ledger & Accounts Statement ({activeTab === 'Client' ? 'Registered Clients' : 'Wholesale Customers'})
            </p>
            <p className="text-xs text-slate-600 mt-1">Liberty Cloth Market, Gulberg III, Lahore, Pakistan</p>
            <p className="text-xs text-slate-600">Wholesale B2B Desk: +92 (042) 3575-8991</p>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-cyan-900 text-white font-bold text-xs rounded-md uppercase tracking-wider mb-2">
              Wholesale Statement
            </span>
            <div className="text-xs text-slate-500">Period: {dateRangeLabel}</div>
            <div className="text-xs text-slate-500">
              Printed: {new Date().toLocaleDateString('en-PK', { dateStyle: 'long' })}
            </div>
          </div>
        </div>

        {/* Statement Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 mb-6 text-xs">
          <div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase">Total Invoices</div>
            <div className="font-bold text-slate-900 text-sm mt-0.5">{bills.length}</div>
            <div className="text-slate-600">B2B Orders</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase">Gross Billed Value</div>
            <div className="font-bold text-cyan-800 text-sm mt-0.5">
              Rs. {totalSales.toLocaleString()}
            </div>
            <div className="text-slate-600">Wholesale Total</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase">Wholesale Discounts</div>
            <div className="font-bold text-emerald-700 text-sm mt-0.5">
              Rs. {totalDiscount.toLocaleString()}
            </div>
            <div className="text-slate-600">Concessions</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase">Settled / Collected</div>
            <div className="font-black text-slate-900 text-sm mt-0.5">
              Rs. {totalPaid.toLocaleString()}
            </div>
            <div className="text-emerald-700 font-medium text-[10px]">Accounts Closed</div>
          </div>
        </div>

        {/* Invoices Table */}
        <table className="w-full text-left text-xs mb-6 border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-300 text-slate-700">
              <th className="py-2.5 font-bold uppercase tracking-wider">Date & Time</th>
              <th className="py-2.5 font-bold uppercase tracking-wider">Invoice #</th>
              <th className="py-2.5 font-bold uppercase tracking-wider">
                {activeTab === 'Client' ? 'Client / Business Title' : 'Customer Name'}
              </th>
              <th className="py-2.5 font-bold uppercase tracking-wider">Staff / Officer</th>
              <th className="py-2.5 font-bold uppercase tracking-wider">Fabrics / Items</th>
              <th className="py-2.5 font-bold uppercase tracking-wider">Payment Method</th>
              <th className="py-2.5 font-bold uppercase tracking-wider text-right text-slate-900">Total (Rs.)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bills.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  No wholesale invoices found in this statement period.
                </td>
              </tr>
            ) : (
              bills.map((bill, idx) => (
                <tr key={bill.id || idx} className="hover:bg-slate-50/50">
                  <td className="py-2.5 text-slate-600 whitespace-nowrap">
                    {new Date(bill.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="py-2.5 font-mono text-[11px] text-cyan-800 font-semibold">
                    {bill.invoiceNumber}
                  </td>
                  <td className="py-2.5 text-slate-800">
                    <span className="font-medium">{bill.clientName || bill.customerName || 'Wholesale Client'}</span>
                    {bill.customerPhone && <span className="block text-[10px] text-slate-500">{bill.customerPhone}</span>}
                  </td>
                  <td className="py-2.5 text-slate-600">{bill.staffName}</td>
                  <td className="py-2.5 text-slate-600 font-mono">
                    {bill.items.reduce((s, i) => s + i.quantity, 0)} {bill.items.some(i => i.productName.toLowerCase().includes('suit')) ? 'boxes' : 'metres'}
                  </td>
                  <td className="py-2.5 text-slate-600">
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-medium">
                      {bill.paymentMethod}
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-black text-slate-900 font-mono">
                    Rs. {bill.grandTotal.toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Statement Totals & Signatures */}
        <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200">
          <div className="text-xs text-slate-500 space-y-2">
            <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Notice to Account Holder:</h4>
            <p className="text-[11px] leading-relaxed">
              Please inspect all bulk invoice entries carefully. Any discrepancies in rates, returns, or payment receipts must be brought to our accounts notice within 10 days of statement issuance.
            </p>
            <div className="pt-8 flex gap-8">
              <div className="border-t border-slate-300 pt-1 text-center w-36 text-[10px] text-slate-500">
                Verified By Accounts
              </div>
              <div className="border-t border-slate-300 pt-1 text-center w-36 text-[10px] text-slate-500">
                Customer Signature
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Gross Wholesale Turnover:</span>
              <span className="font-bold text-slate-900 font-mono">Rs. {totalSales.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Total Volume Discounts:</span>
              <span className="font-bold text-emerald-700 font-mono">− Rs. {totalDiscount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
              <span>Total Settled Amount:</span>
              <span className="text-cyan-800 font-mono">Rs. {totalPaid.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
