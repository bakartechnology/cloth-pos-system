'use client';

import React from 'react';
import { Product } from '@/types';
import { Printer, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';

interface BarcodeLabelSheetProps {
  product: Product;
  type: 'retail' | 'wholesale';
  count?: number;
  onClose?: () => void;
}

export function BarcodeLabelSheet({
  product,
  type,
  count = 12,
  onClose,
}: BarcodeLabelSheetProps) {
  const handlePrint = () => {
    window.print();
  };

  const barcodeValue = type === 'retail' ? product.barcode : product.wholesaleBarcode;
  const price = type === 'retail' ? product.retailPrice : product.wholesalePrice;
  const tagType = type === 'retail' ? 'RETAIL' : 'WHOLESALE';

  const labels = Array.from({ length: count });

  // Generate deterministic bar widths from barcode string
  const bars = barcodeValue
    .split('')
    .map(char => (parseInt(char, 10) % 3) + 1);

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto">
      {/* Action Header */}
      <div className="flex items-center justify-between w-full mb-6 no-print">
        <Button variant="outline" size="sm" onClick={onClose} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to Barcode Studio
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-medium">Sheet of {count} Labels</span>
          <Button variant="primary" size="md" onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" /> Print Label Sheet
          </Button>
        </div>
      </div>

      {/* Printable Sheet Grid (Formatted for standard sticker label paper) */}
      <div className="w-full bg-white p-6 border border-slate-200 rounded-xl shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 print:grid-cols-3 print:gap-2">
          {labels.map((_, idx) => (
            <div
              key={idx}
              className="p-3 border border-dashed border-slate-300 rounded-lg text-center flex flex-col justify-between bg-white text-slate-900 break-inside-avoid h-36"
            >
              <div>
                <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                  <span>AL-NOOR</span>
                  <span className="bg-slate-100 px-1 rounded text-slate-700">{tagType}</span>
                </div>
                <div className="font-bold text-[11px] leading-tight line-clamp-2 text-slate-800">
                  {product.name}
                </div>
                <div className="text-[9px] font-mono text-slate-500 mt-0.5">
                  SKU: {product.sku} | {product.unit}
                </div>
              </div>

              <div className="my-1 flex flex-col items-center">
                {/* Visual Barcode Graphic */}
                <div className="flex items-center justify-center gap-[1.5px] h-7 w-full max-w-[140px]">
                  {bars.map((w, bIdx) => (
                    <div
                      key={bIdx}
                      className="bg-black h-full"
                      style={{ width: `${w * 1.5}px` }}
                    />
                  ))}
                  {bars.map((w, bIdx) => (
                    <div
                      key={`dup-${bIdx}`}
                      className="bg-black h-full"
                      style={{ width: `${w * 1.2}px` }}
                    />
                  ))}
                </div>
                <div className="font-mono text-[9px] tracking-widest text-slate-600 mt-0.5">
                  {barcodeValue}
                </div>
              </div>

              <div className="text-center border-t border-slate-100 pt-1">
                <span className="text-[12px] font-black text-slate-950">
                  Rs. {price.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
