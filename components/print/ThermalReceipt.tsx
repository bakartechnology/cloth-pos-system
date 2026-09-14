'use client';

import React from 'react';
import { Bill } from '@/types';
import { Printer, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';

interface ThermalReceiptProps {
  bill: Bill;
  onClose?: () => void;
}

export function ThermalReceipt({ bill, onClose }: ThermalReceiptProps) {
  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(bill.date).toLocaleString('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="flex flex-col items-center">
      {/* Action Buttons (Hidden when printing) */}
      <div className="flex items-center gap-2 mb-4 w-full justify-between no-print">
        <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Sale Completed Successfully
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button size="sm" variant="primary" onClick={handlePrint} className="gap-1.5">
            <Printer className="w-4 h-4" />
            Print Receipt
          </Button>
        </div>
      </div>

      {/* 80mm Thermal Receipt Layout */}
      <div className="receipt-container bg-white p-4 border border-slate-200 rounded-lg shadow-xs font-mono text-[11px] leading-tight text-slate-900 w-[78mm] max-w-full">
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

        {/* Meta */}
        <div className="space-y-0.5 text-[10px] mb-2">
          <div className="flex justify-between">
            <span className="text-slate-600">Invoice #:</span>
            <span className="font-bold">{bill.invoiceNumber}</span>
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
        </div>

        {/* Item table */}
        <div className="border-t border-b border-dashed border-slate-400 py-1.5 my-2">
          <div className="flex justify-between font-bold text-[10px] mb-1">
            <span className="flex-1">Item Description</span>
            <span className="w-8 text-center">Qty</span>
            <span className="w-14 text-right">Price</span>
            <span className="w-14 text-right">Total</span>
          </div>

          <div className="space-y-1 text-[10px]">
            {bill.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start">
                <div className="flex-1 pr-1">
                  <div className="font-medium truncate max-w-[32mm]">{item.productName}</div>
                  <div className="text-[9px] text-slate-500">{item.unit}</div>
                </div>
                <div className="w-8 text-center">{item.quantity}</div>
                <div className="w-14 text-right">{item.price.toLocaleString()}</div>
                <div className="w-14 text-right font-medium">{item.subtotal.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals Calculation */}
        <div className="space-y-1 text-[10px] mb-3">
          <div className="flex justify-between">
            <span className="text-slate-600">Subtotal:</span>
            <span>Rs. {bill.subtotal.toLocaleString()}</span>
          </div>
          {bill.discountTotal > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>Discount:</span>
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
        </div>

        {/* Barcode representation */}
        <div className="text-center pt-2 border-t border-dashed border-slate-400">
          <div className="flex justify-center items-center gap-[2px] h-9 my-1">
            {/* Realistic stylized barcode bars */}
            {[2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 2, 3, 1, 4, 2, 1, 3, 1, 2].map((w, i) => (
              <div
                key={i}
                className="bg-black h-full"
                style={{ width: `${w}px` }}
              />
            ))}
          </div>
          <div className="text-[9px] tracking-widest text-slate-700">{bill.invoiceNumber}</div>
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
