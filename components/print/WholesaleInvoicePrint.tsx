'use client';

import React from 'react';
import { Bill } from '@/types';
import { Printer, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';

interface WholesaleInvoicePrintProps {
  bill: Bill;
  onClose?: () => void;
}

export function WholesaleInvoicePrint({ bill, onClose }: WholesaleInvoicePrintProps) {
  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(bill.date).toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto">
      {/* Top action bar */}
      <div className="flex items-center justify-between w-full mb-6 no-print">
        <Button variant="outline" size="sm" onClick={onClose} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to POS
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="md" onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" /> Print Commercial Invoice (A4)
          </Button>
        </div>
      </div>

      {/* A4 Invoice Container */}
      <div className="invoice-a4-container w-full bg-white p-8 sm:p-12 border border-slate-200 rounded-xl shadow-sm text-slate-900">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-lg">
                N
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">AL-NOOR FABRICS</h1>
            </div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
              Wholesale Textiles & Fabric Distribution
            </p>
            <p className="text-xs text-slate-600 mt-2 max-w-xs">
              Shop # 14-18, Liberty Cloth Market, Gulberg III, Lahore, Pakistan
            </p>
            <p className="text-xs text-slate-600">Phone: +92 (042) 3575-8991 | NTN: 7492019-3</p>
          </div>

          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 font-bold text-xs rounded-md border border-blue-200 uppercase tracking-wider mb-2">
              Wholesale Tax Invoice
            </span>
            <div className="text-sm font-semibold text-slate-900">Invoice: #{bill.invoiceNumber}</div>
            <div className="text-xs text-slate-500 mt-0.5">Date: {formattedDate}</div>
            <div className="text-xs text-slate-500">Officer: {bill.staffName}</div>
          </div>
        </div>

        {/* Customer Information Grid */}
        <div className="grid grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl border border-slate-100 mb-6">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Billed To (Customer):</div>
            <div className="text-sm font-bold text-slate-900">
              {bill.customerBusiness || bill.customerName || 'Walking Wholesale Buyer'}
            </div>
            {bill.customerName && bill.customerBusiness && (
              <div className="text-xs text-slate-600">Attn: {bill.customerName}</div>
            )}
            {bill.customerPhone && (
              <div className="text-xs text-slate-600">Contact: {bill.customerPhone}</div>
            )}
          </div>

          <div className="text-right">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Payment & Terms:</div>
            <div className="text-sm font-semibold text-slate-900">Payment Mode: {bill.paymentMethod}</div>
            <div className="text-xs text-slate-600 mt-0.5">Status: {bill.status}</div>
            {bill.notes && <div className="text-xs text-slate-500 italic mt-1">{bill.notes}</div>}
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full text-left text-xs mb-6 border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200 text-slate-600">
              <th className="py-2.5 font-bold uppercase tracking-wider">#</th>
              <th className="py-2.5 font-bold uppercase tracking-wider">Product Name & Specifications</th>
              <th className="py-2.5 font-bold uppercase tracking-wider">SKU</th>
              <th className="py-2.5 font-bold uppercase tracking-wider">Unit</th>
              <th className="py-2.5 font-bold uppercase tracking-wider text-center">Qty</th>
              <th className="py-2.5 font-bold uppercase tracking-wider text-right">Wholesale Rate</th>
              <th className="py-2.5 font-bold uppercase tracking-wider text-right">Disc %</th>
              <th className="py-2.5 font-bold uppercase tracking-wider text-right">Net Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bill.items.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50">
                <td className="py-3 text-slate-400 font-mono">{idx + 1}</td>
                <td className="py-3 font-semibold text-slate-800">{item.productName}</td>
                <td className="py-3 font-mono text-slate-500 text-[11px]">{item.sku}</td>
                <td className="py-3 text-slate-600">{item.unit}</td>
                <td className="py-3 text-center font-bold">{item.quantity}</td>
                <td className="py-3 text-right">Rs. {item.price.toLocaleString()}</td>
                <td className="py-3 text-right text-slate-500">{item.discountPercent > 0 ? `${item.discountPercent}%` : '—'}</td>
                <td className="py-3 text-right font-bold text-slate-900">
                  Rs. {item.subtotal.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Calculations and Signatures */}
        <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-200">
          <div className="text-xs text-slate-500 space-y-2">
            <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Terms & Conditions:</h4>
            <ul className="list-disc list-inside space-y-1 text-[11px]">
              <li>Goods once cut, washed or tailored will not be taken back.</li>
              <li>Damaged or defective cloth pieces must be reported within 72 hours.</li>
              <li>Payment overdue after 30 days is subject to 2% monthly markup.</li>
            </ul>

            <div className="pt-12 flex justify-between gap-6">
              <div className="border-t border-slate-300 pt-1 text-center w-36 text-[10px] text-slate-500">
                Customer Signature
              </div>
              <div className="border-t border-slate-300 pt-1 text-center w-36 text-[10px] text-slate-500">
                Authorized Signatory
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Gross Total:</span>
              <span className="font-semibold">Rs. {bill.subtotal.toLocaleString()}</span>
            </div>
            {bill.discountTotal > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Special Trade Discount:</span>
                <span className="font-semibold">-Rs. {bill.discountTotal.toLocaleString()}</span>
              </div>
            )}
            {bill.taxTotal > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Sales Tax / Fed:</span>
                <span className="font-semibold">Rs. {bill.taxTotal.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
              <span>Invoice Total:</span>
              <span className="text-blue-600">Rs. {bill.grandTotal.toLocaleString()}</span>
            </div>

            <div className="pt-2 border-t border-slate-200 space-y-1 text-slate-600">
              <div className="flex justify-between">
                <span>Amount Paid Now:</span>
                <span className="font-semibold text-slate-900">Rs. {bill.amountReceived.toLocaleString()}</span>
              </div>
              {bill.paymentMethod === 'Credit/Khata' && (
                <div className="flex justify-between font-bold text-amber-700">
                  <span>Added to Customer Khata:</span>
                  <span>Rs. {bill.grandTotal.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
