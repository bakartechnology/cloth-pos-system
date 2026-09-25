'use client';

import React from 'react';
import { Bill } from '@/types';
import { Printer, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';

interface WholesaleInvoicePrintProps {
  bill: Bill;
  onClose?: () => void;
}

export function WholesaleInvoicePrint({ bill, onClose }: WholesaleInvoicePrintProps) {
  const handlePrint = () => {
    window.print();
  };

  const invoiceDate = new Date(bill.date);
  const formattedDate = invoiceDate.toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const formattedTime = invoiceDate.toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto">
      {/* Top action bar */}
      <div className="flex items-center justify-between w-full mb-6 no-print">
        <Button variant="outline" size="sm" onClick={onClose} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to POS
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="md" onClick={handlePrint} className="gap-2 font-bold shadow-md">
            <Printer className="w-4 h-4" /> Print Commercial Invoice (A4)
          </Button>
        </div>
      </div>

      {/* A4 Commercial Invoice Container */}
      <div
        id="printable-wholesale-invoice"
        className="invoice-a4-container w-full bg-white p-8 sm:p-12 border border-slate-200 rounded-2xl shadow-sm text-slate-900"
      >
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-xs">
                N
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                  AL-NOOR FABRICS
                </h1>
                <span className="text-[10px] text-cyan-600 font-bold uppercase tracking-wider">
                  Textiles & Commercial Wholesale House
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-600 mt-2 max-w-sm">
              Shop # 14-18, Liberty Cloth Market, Gulberg III, Lahore, Pakistan
            </p>
            <p className="text-xs text-slate-600">
              Tel: +92 (042) 3575-8991 | Mobile: +92 300 8421100
            </p>
            <p className="text-xs font-semibold text-slate-700">NTN: 7492019-3 | STRN: 3277876123456</p>
          </div>

          <div className="text-right">
            <span className={`inline-block px-3 py-1 font-black text-xs rounded-lg border uppercase tracking-wider mb-2 ${
              bill.saleType === 'Khata'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-cyan-50 text-cyan-800 border-cyan-200'
            }`}>
              {bill.saleType === 'Khata' ? 'Khata Credit POS Invoice' : 'Wholesale Tax Invoice'}
            </span>
            <div className="text-base font-black font-mono text-slate-900">#{bill.invoiceNumber}</div>
            <div className="text-xs text-slate-500 mt-0.5">Date: {formattedDate} ({formattedTime})</div>
            <div className="text-xs text-slate-600 font-medium">Billing Officer: {bill.staffName}</div>
          </div>
        </div>

        {/* Customer & Client Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl border border-slate-200/80 mb-6 text-xs">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              {bill.saleType === 'Khata' ? 'Billed To (Khata Account Holder):' : 'Billed To (Wholesale Client):'}
            </div>
            <div className="text-sm font-black text-slate-900">
              {bill.clientName || bill.customerBusiness || bill.customerName || 'Walking Wholesale Buyer'}
            </div>
            {bill.customerName && bill.customerName !== bill.clientName && (
              <div className="text-xs text-slate-700 font-medium mt-0.5">
                Shopper / Order Collector: <strong>{bill.customerName}</strong>
              </div>
            )}
            {bill.customerPhone && (
              <div className="text-xs text-slate-500">Contact: {bill.customerPhone}</div>
            )}
          </div>

          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Payment & Dispatch Terms:
            </div>
            <div className="text-xs font-bold text-slate-800">
              Payment Mode: <span className="text-cyan-800">{bill.paymentMethod}</span>
            </div>
            <div className="text-xs text-slate-600 mt-0.5">
              Invoice Status: <span className="font-semibold">{bill.status}</span>
            </div>
            {bill.notes && (
              <div className="text-xs text-slate-600 italic mt-1 max-w-xs ml-auto">
                Ref: {bill.notes}
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full text-left text-xs mb-6 border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-300 text-slate-700 bg-slate-100/70">
              <th className="py-2.5 px-2 font-bold uppercase tracking-wider">#</th>
              <th className="py-2.5 px-2 font-bold uppercase tracking-wider">Fabric Description</th>
              <th className="py-2.5 px-2 font-bold uppercase tracking-wider">SKU</th>
              <th className="py-2.5 px-2 font-bold uppercase tracking-wider">Unit</th>
              <th className="py-2.5 px-2 font-bold uppercase tracking-wider text-center">Qty</th>
              <th className="py-2.5 px-2 font-bold uppercase tracking-wider text-right">Wholesale Rate</th>
              <th className="py-2.5 px-2 font-bold uppercase tracking-wider text-right">Disc</th>
              <th className="py-2.5 px-2 font-bold uppercase tracking-wider text-right">Net Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bill.items.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50">
                <td className="py-3 px-2 text-slate-400 font-mono">{idx + 1}</td>
                <td className="py-3 px-2 font-bold text-slate-900">{item.productName}</td>
                <td className="py-3 px-2 font-mono text-slate-500 text-[11px]">{item.sku}</td>
                <td className="py-3 px-2 text-slate-600">{item.unit}</td>
                <td className="py-3 px-2 text-center font-bold text-slate-900">{item.quantity}</td>
                <td className="py-3 px-2 text-right font-mono">Rs. {item.price.toLocaleString()}</td>
                <td className="py-3 px-2 text-right text-slate-500 font-mono text-[11px]">
                  {item.discountPerUnit && item.discountPerUnit > 0
                    ? item.quantity > 1
                      ? `-Rs. ${item.discountPerUnit.toLocaleString()} (-Rs. ${(item.discountPerUnit * item.quantity).toLocaleString()})`
                      : `-Rs. ${item.discountPerUnit.toLocaleString()}`
                    : item.discountPercent > 0
                    ? `${item.discountPercent}%`
                    : '—'}
                </td>
                <td className="py-3 px-2 text-right font-mono font-bold text-slate-900">
                  Rs. {item.subtotal.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Calculations and Bank/Cash breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-200 text-xs">
          {/* Terms & Payment Information */}
          <div className="text-slate-600 space-y-3">
            <div>
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">
                Settlement Verification:
              </h4>

              {bill.paymentMethod === 'Cash' && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex justify-between">
                    <span>Cash Tendered:</span>
                    <strong className="font-mono">Rs. {bill.amountReceived.toLocaleString()}</strong>
                  </div>
                  {bill.changeDue > 0 && (
                    <div className="flex justify-between text-cyan-800">
                      <span>Change Given (Bakaya):</span>
                      <strong className="font-mono">Rs. {bill.changeDue.toLocaleString()}</strong>
                    </div>
                  )}
                </div>
              )}

              {bill.paymentMethod === 'Card' && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex justify-between">
                    <span>Payment Mode:</span>
                    <strong>POS Card Machine</strong>
                  </div>
                  {bill.cardTransactionId && (
                    <div className="flex justify-between font-mono text-[11px]">
                      <span>Auth Reference ID:</span>
                      <strong>{bill.cardTransactionId}</strong>
                    </div>
                  )}
                </div>
              )}

              {bill.paymentMethod === 'Bank Transfer' && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex justify-between">
                    <span>Transferred To:</span>
                    <strong>{bill.bankDetails?.bankName || 'Direct Online Bank Transfer'}</strong>
                  </div>
                  {bill.bankDetails?.accountNumber && (
                    <div className="flex justify-between font-mono text-[11px]">
                      <span>Account #:</span>
                      <span>{bill.bankDetails.accountNumber}</span>
                    </div>
                  )}
                  {bill.bankDetails?.iban && (
                    <div className="flex justify-between font-mono text-[11px]">
                      <span>IBAN:</span>
                      <span>{bill.bankDetails.iban}</span>
                    </div>
                  )}
                  {bill.bankDetails?.confirmedByStaffName && (
                    <div className="text-[10px] text-emerald-700 font-semibold pt-1 border-t border-slate-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Verified & Confirmed by {bill.bankDetails.confirmedByStaffName}</span>
                    </div>
                  )}
                </div>
              )}

              {bill.paymentMethod === 'Credit/Khata' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 font-semibold">
                  Debited to Customer Khata Credit Ledger.
                </div>
              )}
            </div>

            {/* Linked Returns / Exchanges */}
            {bill.returns && bill.returns.length > 0 && (
              <div className="p-2.5 rounded-xl border border-rose-200 bg-rose-50 text-[11px] space-y-1">
                <span className="font-bold text-rose-800">Return Transactions on Record:</span>
                {bill.returns.map(r => (
                  <div key={r.id} className="flex justify-between text-rose-900">
                    <span>Voucher #{r.id} ({r.reason}):</span>
                    <span className="font-mono font-bold">-Rs. {r.totalRefundAmount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            {bill.exchanges && bill.exchanges.length > 0 && (
              <div className="p-2.5 rounded-xl border border-cyan-200 bg-cyan-50 text-[11px] space-y-1">
                <span className="font-bold text-cyan-800">Exchange Transactions on Record:</span>
                {bill.exchanges.map(e => (
                  <div key={e.id} className="text-cyan-900">
                    Exchanged: {e.returnedItem.productName} for {e.newItem.productName}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 text-[10px] text-slate-500 space-y-0.5">
              <p>• Goods once cut, washed or tailored cannot be returned.</p>
              <p>• Discrepancies must be officially reported within 72 hours of dispatch.</p>
              <p>• Computer generated commercial invoice; valid without manual stamp.</p>
            </div>
          </div>

          {/* Totals & Signatures */}
          <div className="space-y-4">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/90 space-y-2.5">
              <div className="flex justify-between text-slate-600">
                <span>{bill.saleType === 'Khata' ? 'Khata Subtotal:' : 'Wholesale Subtotal:'}</span>
                <span className="font-mono font-bold">Rs. {bill.subtotal.toLocaleString()}</span>
              </div>

              {bill.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>{bill.saleType === 'Khata' ? 'Khata Discount:' : 'Wholesale Discount:'}</span>
                  <span className="font-mono font-bold">-Rs. {bill.discountTotal.toLocaleString()}</span>
                </div>
              )}

              {bill.taxTotal > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Sales Tax / Fed:</span>
                  <span className="font-mono font-bold">Rs. {bill.taxTotal.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-300">
                <span>INVOICE GRAND TOTAL:</span>
                <span className="text-cyan-800 font-mono">Rs. {bill.grandTotal.toLocaleString()}</span>
              </div>

              <div className="pt-2 border-t border-slate-200 space-y-1">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Amount Paid at Counter:</span>
                  <span className="font-mono">Rs. {bill.amountReceived.toLocaleString()}</span>
                </div>
                {bill.paymentMethod === 'Credit/Khata' && (
                  <div className="flex justify-between font-bold text-amber-700">
                    <span>Balance Added to Khata:</span>
                    <span className="font-mono">Rs. {bill.grandTotal.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-8 flex justify-between gap-6">
              <div className="border-t border-slate-400 pt-1 text-center w-36 text-[10px] text-slate-500">
                Client / Receiver
              </div>
              <div className="border-t border-slate-400 pt-1 text-center w-36 text-[10px] text-slate-500">
                For AL-NOOR FABRICS
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
