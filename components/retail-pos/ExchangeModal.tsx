'use client';

import React, { useState } from 'react';
import { Bill, Product } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { salesService } from '@/services/salesService';
import { productsService } from '@/services/productsService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  ArrowLeftRight,
  CheckCircle2,
  AlertCircle,
  Search,
  Package,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface ExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill | null;
  onExchangeCompleted: (updatedBill: Bill) => void;
}

export function ExchangeModal({ isOpen, onClose, bill, onExchangeCompleted }: ExchangeModalProps) {
  const { currentStaff } = useAuth();
  const { toast } = useToast();

  const [selectedOriginalProductId, setSelectedOriginalProductId] = useState<string>('');
  const [returnQty, setReturnQty] = useState(1);

  // Replacement Product search
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedNewProduct, setSelectedNewProduct] = useState<Product | null>(null);
  const [newQty, setNewQty] = useState(1);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allProducts = productsService.getAll();

  React.useEffect(() => {
    if (bill && bill.items.length > 0) {
      setSelectedOriginalProductId(bill.items[0].productId);
      setReturnQty(1);
      setSelectedNewProduct(null);
      setNewQty(1);
      setCatalogSearch('');
      setNotes('');
    }
  }, [bill]);

  if (!bill) return null;

  const originalItem = bill.items.find(i => i.productId === selectedOriginalProductId);
  const originalUnitPrice = originalItem ? Math.round(originalItem.subtotal / originalItem.quantity) : 0;
  const originalCredit = originalUnitPrice * returnQty;

  const newUnitPrice = selectedNewProduct ? selectedNewProduct.retailPrice : 0;
  const newCost = newUnitPrice * newQty;
  const priceDifference = newCost - originalCredit; // >0: Customer owes, <0: Store refunds

  // Filter replacement candidates
  const candidateProducts = allProducts.filter(p => {
    const q = catalogSearch.toLowerCase().trim();
    if (!q) return p.stock > 0;
    return (
      (p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.includes(q)) &&
      p.stock > 0
    );
  });

  const handleConfirmExchange = async () => {
    if (!originalItem) {
      toast({ title: 'Select Original Item', description: 'Please select an item to exchange.', type: 'warning' });
      return;
    }
    if (!selectedNewProduct) {
      toast({ title: 'Select Replacement Product', description: 'Please choose a replacement fabric.', type: 'warning' });
      return;
    }
    if (selectedNewProduct.stock < newQty) {
      toast({
        title: 'Stock Insufficient',
        description: `Only ${selectedNewProduct.stock} available in stock.`,
        type: 'error',
      });
      return;
    }
    if (!currentStaff) {
      toast({ title: 'Error', description: 'Cashier session not found.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = salesService.processExchange({
        originalInvoiceNumber: bill.invoiceNumber,
        returnedItem: {
          productId: originalItem.productId,
          quantity: returnQty,
        },
        newItem: {
          productId: selectedNewProduct.id,
          quantity: newQty,
        },
        staffId: currentStaff.id,
        staffName: currentStaff.name,
        notes,
      });

      if (result.success && result.updatedBill) {
        toast({
          title: 'Exchange Completed',
          description:
            priceDifference > 0
              ? `Customer paid difference Rs. ${priceDifference.toLocaleString()}`
              : priceDifference < 0
              ? `Refunded difference Rs. ${Math.abs(priceDifference).toLocaleString()}`
              : 'Exchange completed evenly.',
          type: 'success',
        });
        onExchangeCompleted(result.updatedBill);
        onClose();
      } else {
        toast({ title: 'Exchange Failed', description: result.message, type: 'error' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Product Exchange Portal"
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* Bill Context Banner */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500">Invoice:</span>{' '}
            <span className="font-mono font-bold text-slate-900">{bill.invoiceNumber}</span>
          </div>
          <div>
            <span className="text-slate-500">Customer:</span>{' '}
            <span className="font-semibold">{bill.customerName || 'None'}</span>
          </div>
          <div>
            <span className="text-slate-500">Date:</span>{' '}
            <span>{new Date(bill.date).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Step 1 & Step 2 Dual Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* LEFT: Step 1 - Item Being Exchanged / Returned */}
          <div className="p-3 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-[10px]">
                1
              </span>
              <span>Item Returning (Stock Restocked +)</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Original Item:
              </label>
              <select
                value={selectedOriginalProductId}
                onChange={e => {
                  setSelectedOriginalProductId(e.target.value);
                  setReturnQty(1);
                }}
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                {bill.items.map(i => (
                  <option key={i.productId} value={i.productId}>
                    {i.productName} (Paid Rs. {Math.round(i.subtotal / i.quantity).toLocaleString()} / {i.unit})
                  </option>
                ))}
              </select>
            </div>

            {originalItem && (
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Purchased Qty:</span>
                  <span className="font-bold">{originalItem.quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Unit Rate:</span>
                  <span className="font-mono">Rs. {originalUnitPrice.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-slate-700 font-semibold">Return Quantity:</span>
                  <select
                    value={returnQty}
                    onChange={e => setReturnQty(parseInt(e.target.value))}
                    className="text-xs p-1 border border-slate-200 rounded font-bold"
                  >
                    {Array.from({ length: originalItem.quantity }, (_, i) => i + 1).map(n => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-between pt-1 font-bold text-rose-700">
                  <span>Credit Value:</span>
                  <span className="font-mono">Rs. {originalCredit.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Step 2 - New Replacement Item Selection */}
          <div className="p-3 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]">
                2
              </span>
              <span>New Item Taking (Stock Deducted -)</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Search Catalog for Replacement:
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter fabric name or SKU..."
                  value={catalogSearch}
                  onChange={e => setCatalogSearch(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Candidate list */}
            <div className="max-h-28 overflow-y-auto border border-slate-200 rounded-lg bg-white divide-y divide-slate-100 text-xs">
              {candidateProducts.slice(0, 8).map(prod => (
                <div
                  key={prod.id}
                  onClick={() => setSelectedNewProduct(prod)}
                  className={`p-2 cursor-pointer flex items-center justify-between transition-colors ${
                    selectedNewProduct?.id === prod.id
                      ? 'bg-blue-50 border-l-4 border-blue-600 font-bold'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="truncate text-slate-900">{prod.name}</div>
                    <div className="text-[10px] text-slate-400">Stock: {prod.stock} {prod.unit}</div>
                  </div>
                  <div className="font-mono text-blue-700 whitespace-nowrap">
                    Rs. {prod.retailPrice.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            {selectedNewProduct && (
              <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs space-y-1">
                <div className="font-bold text-blue-950 truncate">{selectedNewProduct.name}</div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Quantity:</span>
                  <select
                    value={newQty}
                    onChange={e => setNewQty(parseInt(e.target.value))}
                    className="text-xs p-1 border border-blue-200 rounded font-bold bg-white"
                  >
                    {Array.from({ length: Math.min(10, selectedNewProduct.stock) }, (_, i) => i + 1).map(n => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-between font-bold text-blue-800 pt-1 border-t border-blue-200">
                  <span>Replacement Cost:</span>
                  <span className="font-mono">Rs. {newCost.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Calculation Differential Card */}
        {selectedNewProduct && (
          <div
            className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              priceDifference > 0
                ? 'bg-amber-50 border-amber-200 text-amber-950'
                : priceDifference < 0
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
          >
            <div className="space-y-0.5">
              <div className="text-xs font-bold uppercase tracking-wider">
                {priceDifference > 0
                  ? 'Customer Additional Payment Required'
                  : priceDifference < 0
                  ? 'Store Refund Due to Customer'
                  : 'Even Value Exchange'}
              </div>
              <div className="text-[11px] opacity-80">
                Original Credit: Rs. {originalCredit.toLocaleString()} | Replacement Cost: Rs. {newCost.toLocaleString()}
              </div>
            </div>

            <div className="text-right">
              <div className="text-lg font-black font-mono">
                {priceDifference > 0 && `+ Rs. ${priceDifference.toLocaleString()}`}
                {priceDifference < 0 && `- Rs. ${Math.abs(priceDifference).toLocaleString()}`}
                {priceDifference === 0 && 'Rs. 0 (Even)'}
              </div>
              <div className="text-[10px] font-semibold opacity-75">
                {priceDifference > 0 ? 'Collect Cash/Card' : priceDifference < 0 ? 'Pay Cash Refund' : 'No Payment Due'}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="outline" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="button"
            onClick={handleConfirmExchange}
            disabled={!selectedNewProduct || isSubmitting}
            className="gap-1.5 font-bold"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSubmitting ? 'Processing...' : 'Confirm Exchange'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
