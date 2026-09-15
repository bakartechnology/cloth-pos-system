'use client';

import React from 'react';
import { ReturnTransaction, Bill } from '@/types';
import { Printer, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';

interface PrintableWholesaleReturnProps {
  returnTx: ReturnTransaction;
  bill?: Bill | null;
  onClose?: () => void;
}

export function PrintableWholesaleReturn({ returnTx, bill, onClose }: PrintableWholesaleReturnProps) {
  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(returnTx.date).toLocaleString('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto">
      {/* Top action bar */}
      <div className="flex items-center justify-between w-full mb-4 no-print">
        <Button variant="outline" size="sm" onClick={onClose} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Close
        </Button>
        <Button variant="primary" size="md" onClick={handlePrint} className="gap-2">
          <Printer className="w-4 h-4" /> Print Return Slip
        </Button>
      </div>

      {/* Printable Container */}
      <div id="printable-wholesale-return" className="w-full bg-white p-6 sm:p-8 border border-slate-200 rounded-xl shadow-xs text-slate-900 text-xs">
        <div className="text-center border-b border-slate-200 pb-4 mb-4">
          <h2 className="text-lg font-black tracking-tight text-slate-900 uppercase">
            AL-NOOR FABRICS & TEXTILES
          </h2>
          <p className="text-[10px] text-slate-500">Shop # 14-18, Liberty Cloth Market, Gulberg III, Lahore</p>
          <p className="text-[10px] text-slate-500">Phone: +92 (042) 3575-8991 | NTN: 7492019-3</p>
          <div className="mt-2 inline-block px-3 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 font-bold rounded uppercase tracking-wider text-[11px]">
            Wholesale Goods Return Voucher
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
          <div>
            <div><span className="text-slate-400">Return Voucher #:</span> <strong className="font-mono">{returnTx.id}</strong></div>
            <div><span className="text-slate-400">Original Invoice #:</span> <strong className="font-mono">{returnTx.originalInvoiceNumber}</strong></div>
            <div><span className="text-slate-400">Date & Time:</span> {formattedDate}</div>
          </div>
          <div className="text-right">
            <div><span className="text-slate-400">Client / Shopper:</span> <strong>{returnTx.customerName || bill?.clientName || 'Wholesale Client'}</strong></div>
            <div><span className="text-slate-400">Authorized Cashier:</span> <strong>{returnTx.staffName}</strong></div>
            <div><span className="text-slate-400">Reason:</span> {returnTx.reason}</div>
          </div>
        </div>

        {/* Returned Items Table */}
        <table className="w-full text-left my-4 border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold">
              <th className="py-2">Item Description</th>
              <th className="py-2">SKU</th>
              <th className="py-2 text-center">Qty Returned</th>
              <th className="py-2 text-right">Unit Rate</th>
              <th className="py-2 text-right">Refund Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {returnTx.items.map((item, idx) => (
              <tr key={idx}>
                <td className="py-2.5 font-bold text-slate-800">{item.productName}</td>
                <td className="py-2.5 font-mono text-slate-500 text-[11px]">{item.sku}</td>
                <td className="py-2.5 text-center font-bold">{item.quantityReturned} {item.unit}</td>
                <td className="py-2.5 text-right">Rs. {item.originalPrice.toLocaleString()}</td>
                <td className="py-2.5 text-right font-mono font-bold text-rose-700">
                  Rs. {item.refundAmount.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Total & Signatures */}
        <div className="border-t border-slate-200 pt-3 space-y-3">
          <div className="flex justify-between items-center text-sm font-black">
            <span>TOTAL REFUND VALUE:</span>
            <span className="font-mono text-rose-700">Rs. {returnTx.totalRefundAmount.toLocaleString()}</span>
          </div>

          {returnTx.notes && (
            <p className="text-[10px] text-slate-500 italic">Notes: {returnTx.notes}</p>
          )}

          <div className="pt-8 flex justify-between gap-6">
            <div className="border-t border-slate-300 pt-1 text-center w-36 text-[10px] text-slate-500">
              Customer Signature
            </div>
            <div className="border-t border-slate-300 pt-1 text-center w-36 text-[10px] text-slate-500">
              Manager Verification
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
