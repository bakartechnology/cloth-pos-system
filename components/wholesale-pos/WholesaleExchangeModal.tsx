'use client';

import React, { useState, useEffect } from 'react';
import { Bill, Product, ExchangeTransaction } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { salesService } from '@/services/salesService';
import { productsService } from '@/services/productsService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  ArrowLeftRight,
  Search,
  CheckCircle2,
  Package,
  Minus,
  Plus,
  AlertCircle,
  Building,
} from 'lucide-react';

interface WholesaleExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill | null;
  onExchangeCompleted: (exchangeTx: ExchangeTransaction, updatedBill: Bill) => void;
}

export function WholesaleExchangeModal({
  isOpen,
  onClose,
  bill,
  onExchangeCompleted,
}: WholesaleExchangeModalProps) {
  const { currentStaff } = useAuth();
  const { toast } = useToast();

  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [selectedBillItemId, setSelectedBillItemId] = useState<string>('');
  const [returnQty, setReturnQty] = useState<number>(1);
  const [replacementProduct, setReplacementProduct] = useState<Product | null>(null);
  const [replacementQty, setReplacementQty] = useState<number>(1);
  const [productSearch, setProductSearch] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAvailableProducts(productsService.getAll());
      if (bill && bill.items.length > 0) {
        setSelectedBillItemId(bill.items[0].productId);
      }
      setReturnQty(1);
      setReplacementProduct(null);
      setReplacementQty(1);
      setProductSearch('');
      setNotes('');
    }
  }, [isOpen, bill]);

  if (!bill) return null;

  const originalItem = bill.items.find(i => i.productId === selectedBillItemId);
  const originalUnitPrice = originalItem
    ? Math.round(originalItem.subtotal / originalItem.quantity)
    : 0;

  const originalCredit = originalUnitPrice * returnQty;
  const replacementRate = replacementProduct?.wholesalePrice || 0;
  const replacementDebit = replacementRate * replacementQty;
  const priceDifference = replacementDebit - originalCredit;

  const filteredReplacements = availableProducts.filter(p => {
    if (!productSearch.trim()) return true;
    const q = productSearch.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.wholesaleBarcode.includes(q)
    );
  });

  const handleConfirmExchange = () => {
    if (!originalItem) {
      toast({ title: 'Select Return Item', description: 'Please choose an item from the invoice.', type: 'warning' });
      return;
    }

    if (!replacementProduct) {
      toast({ title: 'Select Replacement Item', description: 'Please pick a replacement fabric product.', type: 'warning' });
      return;
    }

    if (replacementProduct.stock < replacementQty) {
      toast({
        title: 'Insufficient Replacement Stock',
        description: `Only ${replacementProduct.stock} ${replacementProduct.unit}(s) available.`,
        type: 'error',
      });
      return;
    }

    if (!currentStaff) {
      toast({ title: 'Authentication Error', description: 'No active cashier session found.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = salesService.processExchange({
        originalInvoiceNumber: bill.invoiceNumber,
        returnedItem: {
          productId: originalItem.productId,
          quantity: returnQty,
        },
        newItem: {
          productId: replacementProduct.id,
          quantity: replacementQty,
        },
        staffId: currentStaff.id,
        staffName: currentStaff.name,
        notes,
      });

      if (res.success && res.exchangeTransaction && res.updatedBill) {
        toast({
          title: 'Wholesale Exchange Completed',
          description:
            priceDifference > 0
              ? `Exchange processed. Customer pays difference: Rs. ${priceDifference.toLocaleString()}`
              : priceDifference < 0
              ? `Exchange processed. Refund to customer: Rs. ${Math.abs(priceDifference).toLocaleString()}`
              : 'Even exchange processed with no price difference.',
          type: 'success',
        });
        onExchangeCompleted(res.exchangeTransaction, res.updatedBill);
        onClose();
      } else {
        toast({ title: 'Exchange Failed', description: res.message, type: 'error' });
      }
    } catch (err: unknown) {
      toast({
        title: 'System Error',
        description: (err as Error)?.message || 'Failed to complete exchange.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Wholesale Fabric Exchange"
      description={`Original Invoice: #${bill.invoiceNumber} • Billed to: ${bill.clientName || bill.customerName || 'Wholesale Client'}`}
      maxWidth="3xl"
    >
      <div className="space-y-4 text-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* STEP 1: Original Item to Return */}
          <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 font-black text-[11px] flex items-center justify-center">
                  1
                </span>
                Item Being Returned
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Select item from invoice:
              </label>
              <select
                value={selectedBillItemId}
                onChange={e => {
                  setSelectedBillItemId(e.target.value);
                  setReturnQty(1);
                }}
                className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {bill.items.map(i => (
                  <option key={i.productId} value={i.productId}>
                    {i.productName} ({i.quantity} {i.unit} @ Rs. {i.price.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            {originalItem && (
              <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Return Quantity:</span>
                  <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
                    <button
                      type="button"
                      onClick={() => setReturnQty(Math.max(1, returnQty - 1))}
                      className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:bg-white"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-bold text-xs px-2 min-w-[24px] text-center">
                      {returnQty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setReturnQty(Math.min(originalItem.quantity, returnQty + 1))}
                      className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:bg-white"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                  <span className="text-slate-500">Original Rate:</span>
                  <span className="font-semibold text-slate-800">
                    Rs. {originalUnitPrice.toLocaleString()} / {originalItem.unit}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-1 border-t border-slate-100 font-bold text-rose-700">
                  <span>Return Credit:</span>
                  <span className="font-mono">Rs. {originalCredit.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: Replacement Product */}
          <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-800 font-black text-[11px] flex items-center justify-center">
                  2
                </span>
                Replacement Fabric Item
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search catalog for replacement..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* Replacement Picker List */}
            <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl bg-white divide-y divide-slate-100">
              {filteredReplacements.slice(0, 8).map(prod => {
                const isSelected = replacementProduct?.id === prod.id;
                const outOfStock = prod.stock <= 0;

                return (
                  <div
                    key={prod.id}
                    onClick={() => !outOfStock && setReplacementProduct(prod)}
                    className={`p-2 flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-cyan-50 text-cyan-900 font-bold'
                        : outOfStock
                        ? 'opacity-40 pointer-events-none bg-slate-50'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2 truncate">
                      <div className="text-slate-900 truncate font-semibold">{prod.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {prod.sku} • Stock: {prod.stock} {prod.unit}
                      </div>
                    </div>
                    <div className="text-right font-mono font-bold text-cyan-800 shrink-0">
                      Rs. {prod.wholesalePrice.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>

            {replacementProduct && (
              <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Replacement Quantity:</span>
                  <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
                    <button
                      type="button"
                      onClick={() => setReplacementQty(Math.max(1, replacementQty - 1))}
                      className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:bg-white"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-bold text-xs px-2 min-w-[24px] text-center">
                      {replacementQty}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setReplacementQty(Math.min(replacementProduct.stock, replacementQty + 1))
                      }
                      className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:bg-white"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1 border-t border-slate-100 font-bold text-cyan-800">
                  <span>Replacement Cost:</span>
                  <span className="font-mono">Rs. {replacementDebit.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Price Difference Reconciliation Banner */}
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between ${
            priceDifference > 0
              ? 'bg-amber-50 border-amber-200 text-amber-950'
              : priceDifference < 0
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-slate-50 border-slate-200 text-slate-900'
          }`}
        >
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {priceDifference > 0
                ? 'Customer / Client Pays Difference:'
                : priceDifference < 0
                ? 'Refund / Credit Due to Client:'
                : 'Even Exchange (No Difference):'}
            </span>
            <div className="text-xl font-black font-mono mt-0.5">
              Rs. {Math.abs(priceDifference).toLocaleString()}
            </div>
            <p className="text-[10px] opacity-75 mt-0.5">
              Inventory will adjust automatically: restock {returnQty} unit(s) of returned item and deduct{' '}
              {replacementQty} unit(s) of new item.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="accent"
              size="md"
              onClick={handleConfirmExchange}
              disabled={!replacementProduct || isSubmitting}
              className="gap-1.5 font-bold shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Complete Wholesale Exchange</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
