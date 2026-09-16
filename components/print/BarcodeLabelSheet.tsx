'use client';

import React, { useState } from 'react';
import { Product } from '@/types';
import { Printer, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';

interface BarcodeLabelSheetProps {
  product: Product;
  type: 'retail' | 'wholesale';
  count?: number;
  initialPriceMode?: 'with-rs' | 'none';
  onClose?: () => void;
}

export function BarcodeLabelSheet({
  product,
  type,
  count = 12,
  initialPriceMode = 'with-rs',
  onClose,
}: BarcodeLabelSheetProps) {
  const [priceMode, setPriceMode] = useState<'with-rs' | 'none'>(initialPriceMode);

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
      <div className="flex flex-col sm:flex-row items-center justify-between w-full mb-6 gap-3 no-print">
        <Button variant="outline" size="sm" onClick={onClose} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to Barcode Studio
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          {/* Price display selector */}
          <div className="flex items-center p-1 bg-slate-100 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setPriceMode('with-rs')}
              className={`px-3 py-1 rounded-md transition-all ${
                priceMode === 'with-rs'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Print Price (Rs. {price.toLocaleString()})
            </button>
            <button
              type="button"
              onClick={() => setPriceMode('none')}
              className={`px-3 py-1 rounded-md transition-all ${
                priceMode === 'none'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              No Price (Tag Only)
            </button>
          </div>

          <span className="text-xs text-slate-500 font-medium">Sheet of {count} Labels</span>
          <Button variant="primary" size="md" onClick={handlePrint} className="gap-2 font-bold shadow-xs">
            <Printer className="w-4 h-4" /> Print Label Sheet
          </Button>
        </div>
      </div>

      {/* Printable Sheet Grid (Formatted for standard sticker label paper) */}
      <div id="printable-barcode-sheet" className="printable-area w-full bg-white p-6 border border-slate-200 rounded-xl shadow-sm print:p-0 print:border-none print:shadow-none">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 print:grid-cols-3 print:gap-2">
          {labels.map((_, idx) => (
            <div
              key={idx}
              className="p-2.5 sm:p-3 border border-dashed border-slate-300 rounded-xl text-center flex flex-col justify-between bg-white text-slate-900 break-inside-avoid min-h-[165px] h-[165px] overflow-hidden"
            >
              <div>
                <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                  <span>AL-NOOR</span>
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-semibold">{tagType}</span>
                </div>
                <div className="font-bold text-[11px] leading-snug line-clamp-2 text-slate-900">
                  {product.name}
                </div>
                <div className="text-[9px] font-mono text-slate-500 mt-0.5 truncate">
                  SKU: {product.sku} | {product.unit}
                </div>
              </div>

              <div className="my-1 flex flex-col items-center justify-center">
                {/* Visual Barcode Graphic */}
                <div className="flex items-center justify-center gap-[1.5px] h-6 w-full max-w-[130px]">
                  {bars.map((w, bIdx) => (
                    <div
                      key={bIdx}
                      className="bg-black h-full"
                      style={{ width: `${w * 1.4}px` }}
                    />
                  ))}
                  {bars.map((w, bIdx) => (
                    <div
                      key={`dup-${bIdx}`}
                      className="bg-black h-full"
                      style={{ width: `${w * 1.1}px` }}
                    />
                  ))}
                </div>
                <div className="font-mono text-[9px] tracking-wider text-slate-600 mt-0.5 font-semibold">
                  {barcodeValue}
                </div>
              </div>

              <div className="text-center border-t border-slate-100 pt-1.5 pb-0.5 min-h-[26px] flex items-center justify-center">
                {priceMode === 'with-rs' ? (
                  <span className="text-[12px] font-black text-slate-950 tracking-tight leading-none">
                    Rs. {price.toLocaleString()}
                  </span>
                ) : (
                  <span className="text-[9px] text-slate-400 font-medium tracking-wide uppercase leading-none">
                    Standard Tag
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
