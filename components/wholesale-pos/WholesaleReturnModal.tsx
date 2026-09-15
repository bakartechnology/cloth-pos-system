'use client';

import React, { useState, useEffect } from 'react';
import { Bill, ReturnTransaction, ReturnItemDetail } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { salesService } from '@/services/salesService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Calendar,
  User,
  Minus,
  Plus,
  Printer,
  Building,
} from 'lucide-react';

interface WholesaleReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill | null;
  onReturnCompleted: (returnTx: ReturnTransaction, updatedBill: Bill) => void;
}

export function WholesaleReturnModal({
  isOpen,
  onClose,
  bill,
  onReturnCompleted,
}: WholesaleReturnModalProps) {
  const { currentStaff } = useAuth();
  const { toast } = useToast();

  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('Fabric Defect / Damage on Roll');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (bill) {
      const initial: Record<string, number> = {};
      bill.items.forEach(i => {
        initial[i.productId] = 0;
      });
      setReturnQtys(initial);
      setReason('Fabric Defect / Damage on Roll');
      setNotes('');
    }
  }, [bill]);

  if (!bill) return null;

  // Calculate already returned quantities from past returns on this bill
  const alreadyReturnedMap: Record<string, number> = {};
  if (bill.returns) {
    bill.returns.forEach(r => {
      r.items.forEach(item => {
        alreadyReturnedMap[item.productId] = (alreadyReturnedMap[item.productId] || 0) + item.quantityReturned;
      });
    });
  }

  const handleQtyChange = (productId: string, delta: number, maxAllowed: number) => {
    setReturnQtys(prev => {
      const current = prev[productId] || 0;
      const next = Math.max(0, Math.min(maxAllowed, current + delta));
      return { ...prev, [productId]: next };
    });
  };

  // Calculate total return amount
  let totalReturnAmount = 0;
  let totalReturnCount = 0;
  const returnPayloadItems: { productId: string; quantityReturned: number; refundAmount: number }[] = [];

  bill.items.forEach(item => {
    const qty = returnQtys[item.productId] || 0;
    if (qty > 0) {
      const itemUnitPrice = Math.round(item.subtotal / item.quantity);
      const refund = itemUnitPrice * qty;
      totalReturnAmount += refund;
      totalReturnCount += qty;
      returnPayloadItems.push({
        productId: item.productId,
        quantityReturned: qty,
        refundAmount: refund,
      });
    }
  });

  const handleConfirmReturn = () => {
    if (totalReturnCount === 0) {
      toast({
        title: 'No Items Selected',
        description: 'Please specify the quantity of items to return.',
        type: 'warning',
      });
      return;
    }

    if (!currentStaff) {
      toast({
        title: 'Authentication Error',
        description: 'No active staff session found.',
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = salesService.processReturn({
        originalInvoiceNumber: bill.invoiceNumber,
        items: returnPayloadItems,
        reason,
        staffId: currentStaff.id,
        staffName: currentStaff.name,
        notes,
      });

      if (res.success && res.returnTransaction && res.updatedBill) {
        toast({
          title: 'Wholesale Return Processed',
          description: `Restocked ${totalReturnCount} unit(s). Refund amount: Rs. ${totalReturnAmount.toLocaleString()}`,
          type: 'success',
        });
        onReturnCompleted(res.returnTransaction, res.updatedBill);
        onClose();
      } else {
        toast({
          title: 'Return Failed',
          description: res.message,
          type: 'error',
        });
      }
    } catch (err: unknown) {
      toast({
        title: 'System Error',
        description: (err as Error)?.message || 'Failed to process return.',
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
      title="Wholesale Product Return"
      description={`Original Invoice: #${bill.invoiceNumber}`}
      maxWidth="3xl"
    >
      <div className="space-y-4 text-xs">
        {/* Invoice Summary Strip */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-bold text-slate-900 text-sm">
              {bill.clientName || bill.customerName || 'Wholesale Client'}
            </div>
            <div className="text-[11px] text-slate-500">
              Invoice Date: {new Date(bill.date).toLocaleDateString('en-PK')} • Cashier: {bill.staffName}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400">Original Grand Total:</span>
            <div className="font-mono font-bold text-slate-900 text-sm">
              Rs. {bill.grandTotal.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Purchased Items List with Return Quantity Controls */}
        <div className="space-y-2">
          <label className="font-bold text-slate-800 block text-xs">
            Purchased Fabric Items (Select quantity to return to stock)
          </label>

          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
            {bill.items.map(item => {
              const returnedSoFar = alreadyReturnedMap[item.productId] || 0;
              const remainingPurchased = Math.max(0, item.quantity - returnedSoFar);
              const selectedQty = returnQtys[item.productId] || 0;
              const isFullyReturned = remainingPurchased <= 0;
              const itemUnitPrice = Math.round(item.subtotal / item.quantity);

              return (
                <div
                  key={item.productId}
                  className={`p-3 flex items-center justify-between gap-3 ${
                    isFullyReturned ? 'bg-slate-50/70 opacity-60' : 'bg-white'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 truncate">
                      {item.productName}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-[10px] bg-slate-100 px-1 rounded">
                        {item.sku}
                      </span>
                      <span>
                        Purchased: {item.quantity} {item.unit}
                      </span>
                      {returnedSoFar > 0 && (
                        <span className="text-rose-600 font-medium">
                          (Already Returned: {returnedSoFar})
                        </span>
                      )}
                      <span>• Rate: Rs. {itemUnitPrice.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Quantity adjustment */}
                  <div className="flex items-center gap-3 shrink-0">
                    {!isFullyReturned ? (
                      <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
                        <button
                          type="button"
                          onClick={() => handleQtyChange(item.productId, -1, remainingPurchased)}
                          disabled={selectedQty <= 0}
                          className="w-6 h-6 flex items-center justify-center rounded text-slate-600 hover:bg-white disabled:opacity-30"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold text-xs px-2 min-w-[28px] text-center">
                          {selectedQty}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQtyChange(item.productId, 1, remainingPurchased)}
                          disabled={selectedQty >= remainingPurchased}
                          className="w-6 h-6 flex items-center justify-center rounded text-slate-600 hover:bg-white disabled:opacity-30"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400">
                        Fully Returned
                      </span>
                    )}

                    <div className="text-right min-w-[80px]">
                      <div className="text-[10px] text-slate-400">Refund:</div>
                      <div className="font-mono font-bold text-rose-600">
                        Rs. {(itemUnitPrice * selectedQty).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reason & Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Return Reason
            </label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-semibold text-slate-800"
            >
              <option value="Fabric Defect / Damage on Roll">Fabric Defect / Damage on Roll</option>
              <option value="Wrong Color / Shade Discrepancy">Wrong Color / Shade Discrepancy</option>
              <option value="Excess Quantity Ordered by Client">Excess Quantity Ordered by Client</option>
              <option value="Wrong Fabric Quality Dispatched">Wrong Fabric Quality Dispatched</option>
              <option value="Customer Cancellation">Customer Cancellation</option>
              <option value="Other Commercial Adjustment">Other Commercial Adjustment</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Internal Notes / Stock Adjustment Remark
            </label>
            <input
              type="text"
              placeholder="e.g. Returned 2 Thaans with dye streak"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>

        {/* Refund Total & Actions */}
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">
              Total Refund to Client:
            </span>
            <div className="text-xl font-black text-rose-950 font-mono mt-0.5">
              Rs. {totalReturnAmount.toLocaleString()}
            </div>
            <p className="text-[10px] text-rose-700 mt-0.5">
              Stock for {totalReturnCount} unit(s) will be automatically added back to inventory.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="accent"
              size="md"
              onClick={handleConfirmReturn}
              disabled={totalReturnCount === 0 || isSubmitting}
              className="gap-1.5 font-bold shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm Wholesale Return</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
