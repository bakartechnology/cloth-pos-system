'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { BarcodeLabelSheet } from '@/components/print/BarcodeLabelSheet';
import {
  Barcode as BarcodeIcon,
  Search,
  Printer,
  Copy,
  Check,
  Sparkles,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { productsService } from '@/services/productsService';
import { useToast } from '@/context/ToastContext';
import { Product } from '@/types';

export default function BarcodesPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [barcodeType, setBarcodeType] = useState<'retail' | 'wholesale'>('retail');
  const [labelCount, setLabelCount] = useState<number>(12);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  useEffect(() => {
    const list = productsService.getAll();
    setProducts(list);
    if (list.length > 0) {
      setSelectedProductId(list[0].id);
    }
  }, []);

  const selectedProduct = products.find(p => p.id === selectedProductId) || products[0];

  const barcodeValue =
    selectedProduct && barcodeType === 'retail'
      ? selectedProduct.barcode
      : selectedProduct?.wholesaleBarcode || '';

  const priceValue =
    selectedProduct && barcodeType === 'retail'
      ? selectedProduct.retailPrice
      : selectedProduct?.wholesalePrice || 0;

  const handleCopyBarcode = () => {
    if (!barcodeValue) return;
    navigator.clipboard.writeText(barcodeValue);
    setCopied(true);
    toast({
      title: 'Barcode Copied',
      description: `Copied "${barcodeValue}" to clipboard.`,
      type: 'info',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredProducts = products.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    return !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.barcode.includes(q);
  });

  return (
    <ProtectedRoute permission="barcode_view">
      <AppShell>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
                <BarcodeIcon className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Barcode Studio & Label Printing
                </h1>
                <p className="text-xs text-slate-500">
                  Generate optical Code-128 retail tags and wholesale carton barcode sheets.
                </p>
              </div>
            </div>

            {selectedProduct && (
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsPrintModalOpen(true)}
                className="gap-2 font-bold shadow-sm"
              >
                <Printer className="w-4 h-4" /> Print Sheet ({labelCount} Labels)
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Product Picker */}
            <Card className="p-4 flex flex-col h-[520px]">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Select Fabric Article
              </label>
              <div className="relative mb-3">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by name, SKU or barcode..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                {filteredProducts.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProductId(p.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all text-xs ${
                      selectedProductId === p.id
                        ? 'bg-blue-50 border border-blue-300 text-blue-950 font-semibold shadow-2xs'
                        : 'hover:bg-slate-50 border border-transparent text-slate-700'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="truncate font-semibold">{p.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {p.sku} • {p.unit}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-slate-900">Rs. {p.retailPrice.toLocaleString()}</div>
                      <div className="text-[10px] text-slate-400">{p.stock} in stock</div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            {/* Center & Right: Visual Barcode Generator & Configuration */}
            {selectedProduct && (
              <Card className="lg:col-span-2 p-6 flex flex-col justify-between h-[520px]">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900">{selectedProduct.name}</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        SKU: <span className="font-mono font-bold text-slate-700">{selectedProduct.sku}</span> |{' '}
                        Packaging Unit: <span className="font-semibold text-slate-700">{selectedProduct.unit}</span>
                      </p>
                    </div>

                    {/* Barcode Type Toggle */}
                    <div className="flex items-center p-1 bg-slate-100 rounded-lg text-xs font-semibold">
                      <button
                        onClick={() => setBarcodeType('retail')}
                        className={`px-3 py-1 rounded-md transition-colors ${
                          barcodeType === 'retail'
                            ? 'bg-white text-blue-700 shadow-2xs font-bold'
                            : 'text-slate-600'
                        }`}
                      >
                        Retail Tag
                      </button>
                      <button
                        onClick={() => setBarcodeType('wholesale')}
                        className={`px-3 py-1 rounded-md transition-colors ${
                          barcodeType === 'wholesale'
                            ? 'bg-white text-cyan-700 shadow-2xs font-bold'
                            : 'text-slate-600'
                        }`}
                      >
                        Wholesale Tag
                      </button>
                    </div>
                  </div>

                  {/* Optical Barcode Card Visual Preview */}
                  <div className="my-6 p-6 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col items-center justify-center max-w-sm mx-auto shadow-sm text-slate-900">
                    <div className="flex items-center justify-between w-full text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                      <span>AL-NOOR FABRICS</span>
                      <span className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-800">
                        {barcodeType.toUpperCase()}
                      </span>
                    </div>

                    <div className="font-extrabold text-sm text-center leading-snug line-clamp-2 my-1">
                      {selectedProduct.name}
                    </div>

                    <div className="text-[11px] text-slate-500 font-mono mb-2">
                      SKU: {selectedProduct.sku} • {selectedProduct.unit}
                    </div>

                    {/* Graphical barcode SVG-like bars */}
                    <div className="flex items-center justify-center gap-[2px] h-12 w-full my-1 bg-white p-2 rounded border border-slate-200">
                      {[3, 1, 2, 4, 1, 2, 1, 3, 2, 4, 1, 2, 3, 1, 2, 1, 4, 2, 3, 1, 2].map((w, i) => (
                        <div key={i} className="bg-black h-full" style={{ width: `${w * 1.5}px` }} />
                      ))}
                    </div>

                    <div className="font-mono text-xs tracking-widest text-slate-700 font-bold mt-1">
                      {barcodeValue}
                    </div>

                    <div className="text-base font-black text-slate-950 mt-2">
                      Rs. {priceValue.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Print Config & Copy Actions */}
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500 font-medium">Sheet Multi-Label Count:</span>
                    <select
                      value={labelCount}
                      onChange={e => setLabelCount(parseInt(e.target.value, 10))}
                      className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 font-bold text-slate-800 focus:outline-none"
                    >
                      <option value={6}>6 Labels (Sample Sheet)</option>
                      <option value={12}>12 Labels (Standard Sheet)</option>
                      <option value={24}>24 Labels (Full A4 Sheet)</option>
                      <option value={48}>48 Labels (Bulk Roll)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="md" onClick={handleCopyBarcode} className="gap-1.5">
                      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied!' : 'Copy Code'}
                    </Button>

                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => setIsPrintModalOpen(true)}
                      className="gap-2 font-bold"
                    >
                      <Printer className="w-4 h-4" /> Open Printable Layout
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Modal: Live Printable Barcode Label Sheet */}
        <Modal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          title={`Print Barcode Labels: ${selectedProduct?.name || ''}`}
          maxWidth="4xl"
        >
          {selectedProduct && (
            <BarcodeLabelSheet
              product={selectedProduct}
              type={barcodeType}
              count={labelCount}
              onClose={() => setIsPrintModalOpen(false)}
            />
          )}
        </Modal>
      </AppShell>
    </ProtectedRoute>
  );
}
