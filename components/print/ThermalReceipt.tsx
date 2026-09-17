'use client';

import React, { useState } from 'react';
import { Bill } from '@/types';
import { Printer, CheckCircle2, RotateCcw, ArrowLeftRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { receiptPrinterService } from '@/services/hardware/receiptPrinterService';

interface ThermalReceiptProps {
  bill: Bill;
  onClose?: () => void;
}

export function ThermalReceipt({ bill, onClose }: ThermalReceiptProps) {
  const [format, setFormat] = useState<'58mm' | '80mm'>('80mm');
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setIsPrinting(true);
    await receiptPrinterService.printReceipt(bill, format);
    setIsPrinting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handlePrint();
    }
  };

  const formattedDate = new Date(bill.date).toLocaleString('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="flex flex-col items-center select-none" onKeyDown={handleKeyDown}>
      {/* Action Toolbar (Hidden completely during print) */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 w-full p-2 bg-slate-50 rounded-xl border border-slate-200 no-print">
        <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{bill.status === 'Completed' ? 'Invoice Ready' : bill.status}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Paper Width Selector */}
          <div className="flex items-center bg-white rounded-lg border border-slate-200 p-0.5 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setFormat('80mm')}
              className={`px-2 py-1 rounded-md transition-colors ${
                format === '80mm' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              80mm Roll
            </button>
            <button
              type="button"
              onClick={() => setFormat('58mm')}
              className={`px-2 py-1 rounded-md transition-colors ${
                format === '58mm' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              58mm Roll
            </button>
          </div>

          <Button size="sm" variant="outline" type="button" onClick={onClose}>
            Close
          </Button>

          <Button
            size="sm"
            variant="primary"
            type="button"
            onClick={handlePrint}
            disabled={isPrinting}
            className="gap-1.5 font-bold shadow-sm"
          >
            <Printer className="w-4 h-4" />
            {isPrinting ? 'Printing...' : 'Print Receipt'}
          </Button>
        </div>
      </div>

      {/* ISOLATED THERMAL RECEIPT CONTAINER */}
      {/* During window.print(), this #printable-receipt element is the ONLY visible element */}
      <div
        id="printable-receipt"
        className={`bg-white p-4 border border-slate-200 rounded-lg shadow-xs font-mono leading-tight text-slate-900 transition-all ${
          format === '58mm' ? 'format-58mm w-[56mm] text-[10px]' : 'format-80mm w-[78mm] text-[11px]'
        }`}
      >
        {/* Header Branding */}
        <div className="text-center mb-3">
          <h2 className="font-bold text-sm tracking-wider uppercase">AL-NOOR FABRICS</h2>
          <p className="text-[10px] text-slate-600 mt-0.5">Liberty Cloth Market, Gulberg III, Lahore</p>
          <p className="text-[10px] text-slate-600">Tel: +92 (042) 3575-8991</p>
          <p className="text-[9px] text-slate-500">NTN: 7492019-3</p>
          <div className="border-b border-dashed border-slate-400 my-2" />
          <span className="font-bold text-xs uppercase px-2 py-0.5 border border-slate-900 rounded">
            {bill.saleType} SALE RECEIPT
          </span>
        </div>

        {/* Invoice Meta */}
        <div className="space-y-0.5 text-[10px] mb-2">
          <div className="flex justify-between">
            <span className="text-slate-600">Invoice #:</span>
            <span className="font-bold font-mono">{bill.invoiceNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Date:</span>
            <span>{formattedDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Cashier:</span>
            <span>{bill.staffName}</span>
          </div>
          {bill.customerName && (
            <div className="flex justify-between">
              <span className="text-slate-600">Customer:</span>
              <span className="font-semibold">{bill.customerName}</span>
            </div>
          )}
          {bill.customerPhone && (
            <div className="flex justify-between">
              <span className="text-slate-600">Phone:</span>
              <span>{bill.customerPhone}</span>
            </div>
          )}
        </div>

        {/* Item Table */}
        <div className="border-t border-b border-dashed border-slate-400 py-1.5 my-2">
          <div className="flex justify-between font-bold text-[10px] mb-1">
            <span className="flex-1">Item</span>
            <span className="w-7 text-center">Qty</span>
            <span className="w-12 text-right">Price</span>
            <span className="w-14 text-right">Total</span>
          </div>

          <div className="space-y-1 text-[10px]">
            {bill.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start">
                <div className="flex-1 pr-1">
                  <div className="font-medium truncate max-w-[34mm]">{item.productName}</div>
                  <div className="text-[9px] text-slate-500">{item.unit}</div>
                  {item.discountPerUnit && item.discountPerUnit > 0 ? (
                    <div className="text-[8px] text-emerald-700">
                      Disc: -Rs. {item.discountPerUnit.toLocaleString()}/unit (Net: Rs. {(item.price - item.discountPerUnit).toLocaleString()})
                    </div>
                  ) : null}
                </div>
                <div className="w-7 text-center">{item.quantity}</div>
                <div className="w-12 text-right">{item.price.toLocaleString()}</div>
                <div className="w-14 text-right font-medium">{item.subtotal.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="space-y-1 text-[10px] mb-3">
          <div className="flex justify-between">
            <span className="text-slate-600">Subtotal:</span>
            <span>Rs. {bill.subtotal.toLocaleString()}</span>
          </div>
          {bill.discountTotal > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>Total Discount:</span>
              <span>-Rs. {bill.discountTotal.toLocaleString()}</span>
            </div>
          )}
          {bill.taxTotal > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-600">Tax:</span>
              <span>Rs. {bill.taxTotal.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between text-xs font-bold border-t border-slate-900 pt-1 text-slate-950">
            <span>GRAND TOTAL:</span>
            <span>Rs. {bill.grandTotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between border-t border-dashed border-slate-300 pt-1">
            <span className="text-slate-600">Payment ({bill.paymentMethod}):</span>
            <span>Rs. {bill.amountReceived.toLocaleString()}</span>
          </div>
          {bill.changeDue > 0 && (
            <div className="flex justify-between font-bold">
              <span>Change Due:</span>
              <span>Rs. {bill.changeDue.toLocaleString()}</span>
            </div>
          )}
          {bill.cardTransactionId && (
            <div className="flex justify-between text-[9px] text-slate-600">
              <span>Card Auth / Ref:</span>
              <span className="font-mono">{bill.cardTransactionId}</span>
            </div>
          )}
        </div>

        {/* Returns / Exchanges Record section if present */}
        {bill.returns && bill.returns.length > 0 && (
          <div className="p-2 bg-rose-50 border border-rose-200 rounded text-[9px] my-2 text-rose-900">
            <div className="flex items-center gap-1 font-bold">
              <RotateCcw className="w-3 h-3 text-rose-600" />
              <span>RETURNED ITEMS:</span>
            </div>
            {bill.returns.map((ret, rIdx) => (
              <div key={rIdx} className="mt-1 border-t border-rose-200 pt-1">
                <div>Reason: {ret.reason}</div>
                <div>Refunded: Rs. {ret.totalRefundAmount.toLocaleString()}</div>
                <div>Date: {new Date(ret.date).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )}

        {bill.exchanges && bill.exchanges.length > 0 && (
          <div className="p-2 bg-blue-50 border border-blue-200 rounded text-[9px] my-2 text-blue-900">
            <div className="flex items-center gap-1 font-bold">
              <ArrowLeftRight className="w-3 h-3 text-blue-600" />
              <span>EXCHANGE RECORD:</span>
            </div>
            {bill.exchanges.map((exc, eIdx) => (
              <div key={eIdx} className="mt-1 border-t border-blue-200 pt-1">
                <div>Returned: {exc.returnedItem.productName} (x{exc.returnedItem.quantity})</div>
                <div>Received: {exc.newItem.productName} (x{exc.newItem.quantity})</div>
                <div>
                  Diff: {exc.priceDifference >= 0 ? `Paid Rs. ${exc.priceDifference}` : `Refunded Rs. ${Math.abs(exc.priceDifference)}`}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Barcode representation */}
        <div className="text-center pt-2 border-t border-dashed border-slate-400">
          <div className="flex justify-center items-center gap-[2px] h-9 my-1">
            {[2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 2, 3, 1, 4, 2, 1, 3, 1, 2].map((w, i) => (
              <div key={i} className="bg-black h-full" style={{ width: `${w}px` }} />
            ))}
          </div>
          <div className="text-[9px] tracking-widest text-slate-700 font-mono">{bill.invoiceNumber}</div>
        </div>

        {/* Footer */}
        <div className="text-center text-[9px] text-slate-500 mt-3 pt-2 border-t border-slate-200">
          <p>Thank you for shopping at Al-Noor Fabrics!</p>
          <p className="mt-0.5">Goods once cut or altered cannot be returned.</p>
          <p>Exchange valid within 7 days with original receipt.</p>
        </div>
      </div>
    </div>
  );
}
