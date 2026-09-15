'use client';

import React from 'react';
import { ExchangeTransaction, Bill } from '@/types';
import { Printer, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';

interface PrintableWholesaleExchangeProps {
  exchangeTx: ExchangeTransaction;
  bill?: Bill | null;
  onClose?: () => void;
}

export function PrintableWholesaleExchange({ exchangeTx, bill, onClose }: PrintableWholesaleExchangeProps) {
  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(exchangeTx.date).toLocaleString('en-PK', {
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
          <Printer className="w-4 h-4" /> Print Exchange Slip
        </Button>
      </div>

      {/* Printable Container */}
      <div id="printable-wholesale-exchange" className="w-full bg-white p-6 sm:p-8 border border-slate-200 rounded-xl shadow-xs text-slate-900 text-xs">
        <div className="text-center border-b border-slate-200 pb-4 mb-4">
          <h2 className="text-lg font-black tracking-tight text-slate-900 uppercase">
            AL-NOOR FABRICS & TEXTILES
          </h2>
          <p className="text-[10px] text-slate-500">Shop # 14-18, Liberty Cloth Market, Gulberg III, Lahore</p>
          <p className="text-[10px] text-slate-500">Phone: +92 (042) 3575-8991 | NTN: 7492019-3</p>
          <div className="mt-2 inline-block px-3 py-0.5 bg-cyan-50 text-cyan-800 border border-cyan-200 font-bold rounded uppercase tracking-wider text-[11px]">
            Wholesale Fabric Exchange Slip
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
          <div>
            <div><span className="text-slate-400">Exchange Voucher #:</span> <strong className="font-mono">{exchangeTx.id}</strong></div>
            <div><span className="text-slate-400">Original Invoice #:</span> <strong className="font-mono">{exchangeTx.originalInvoiceNumber}</strong></div>
            <div><span className="text-slate-400">Date & Time:</span> {formattedDate}</div>
          </div>
          <div className="text-right">
            <div><span className="text-slate-400">Client:</span> <strong>{exchangeTx.customerName || bill?.clientName || 'Wholesale Client'}</strong></div>
            <div><span className="text-slate-400">Authorized Cashier:</span> <strong>{exchangeTx.staffName}</strong></div>
          </div>
        </div>

        {/* Comparison Details */}
        <div className="my-4 grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div>
            <div className="font-bold text-rose-700 text-[10px] uppercase mb-1">Returned Item (-)</div>
            <div className="font-bold text-slate-900">{exchangeTx.returnedItem.productName}</div>
            <div className="text-slate-600 mt-0.5">
              Qty: {exchangeTx.returnedItem.quantity} @ Rs. {exchangeTx.returnedItem.price.toLocaleString()}
            </div>
            <div className="font-mono font-bold text-slate-900 mt-1">
              Credit: Rs. {(exchangeTx.returnedItem.quantity * exchangeTx.returnedItem.price).toLocaleString()}
            </div>
          </div>

          <div className="border-l border-slate-200 pl-4">
            <div className="font-bold text-cyan-800 text-[10px] uppercase mb-1">Replacement Item (+)</div>
            <div className="font-bold text-slate-900">{exchangeTx.newItem.productName}</div>
            <div className="text-slate-600 mt-0.5">
              Qty: {exchangeTx.newItem.quantity} @ Rs. {exchangeTx.newItem.price.toLocaleString()}
            </div>
            <div className="font-mono font-bold text-slate-900 mt-1">
              Cost: Rs. {(exchangeTx.newItem.quantity * exchangeTx.newItem.price).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Financial Difference & Signatures */}
        <div className="border-t border-slate-200 pt-3 space-y-3">
          <div className="flex justify-between items-center text-sm font-black">
            <span>
              {exchangeTx.priceDifference > 0
                ? 'BALANCE PAID BY CUSTOMER:'
                : exchangeTx.priceDifference < 0
                ? 'REFUND RETURNED TO CUSTOMER:'
                : 'EVEN EXCHANGE (NET ZERO):'}
            </span>
            <span className="font-mono text-cyan-900">
              Rs. {Math.abs(exchangeTx.priceDifference).toLocaleString()}
            </span>
          </div>

          {exchangeTx.notes && (
            <p className="text-[10px] text-slate-500 italic">Notes: {exchangeTx.notes}</p>
          )}

          <div className="pt-8 flex justify-between gap-6">
            <div className="border-t border-slate-300 pt-1 text-center w-36 text-[10px] text-slate-500">
              Customer Signature
            </div>
            <div className="border-t border-slate-300 pt-1 text-center w-36 text-[10px] text-slate-500">
              Authorized Signatory
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
