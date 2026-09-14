'use client';

import React, { useState } from 'react';
import { Bill } from '@/types';
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
} from 'lucide-react';

interface ReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill | null;
  onReturnCompleted: (updatedBill: Bill) => void;
}

export function ReturnModal({ isOpen, onClose, bill, onReturnCompleted }: ReturnModalProps) {
  const { currentStaff } = useAuth();
  const { toast } = useToast();

  // Return quantities indexed by productId
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('Fabric Defect / Misprint');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize return quantities when bill changes
  React.useEffect(() => {
    if (bill) {
      const initial: Record<string, number> = {};
      bill.items.forEach(i => {
        initial[i.productId] = 0;
      });
      setReturnQtys(initial);
      setReason('Fabric Defect / Misprint');
      setNotes('');
    }
  }, [bill]);

  if (!bill) return null;

  const handleQtyChange = (productId: string, delta: number, maxQty: number) => {
    setReturnQtys(prev => {
      const current = prev[productId] || 0;
      const next = Math.max(0, Math.min(maxQty, current + delta));
      return { ...prev, [productId]: next };
    });
  };

  // Calculate total return amount
  let totalReturnAmount = 0;
  let totalReturnItemsCount = 0;
  const returnPayloadItems: { productId: string; quantityReturned: number; refundAmount: number }[] = [];

  bill.items.forEach(item => {
    const qty = returnQtys[item.productId] || 0;
    if (qty > 0) {
      const itemUnitPrice = Math.round(item.subtotal / item.quantity);
      const refund = itemUnitPrice * qty;
      totalReturnAmount += refund;
      totalReturnItemsCount += qty;
      returnPayloadItems.push({
        productId: item.productId,
        quantityReturned: qty,
        refundAmount: refund,
      });
    }
  });

  const handleConfirmReturn = async () => {
    if (totalReturnItemsCount === 0) {
      toast({
        title: 'No Items Selected',
        description: 'Please select at least one item quantity to return.',
        type: 'warning',
      });
      return;
    }

    if (!currentStaff) {
      toast({ title: 'Error', description: 'Cashier session not found.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = salesService.processReturn({
        originalInvoiceNumber: bill.invoiceNumber,
        items: returnPayloadItems,
        reason,
        staffId: currentStaff.id,
        staffName: currentStaff.name,
        notes,
      });

      if (result.success && result.updatedBill) {
        toast({
          title: 'Return Processed',
          description: `Rs. ${totalReturnAmount.toLocaleString()} refunded & items restocked.`,
          type: 'success',
        });
        onReturnCompleted(result.updatedBill);
        onClose();
      } else {
        toast({ title: 'Return Failed', description: result.message, type: 'error' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const returnReasons = [
    'Fabric Defect / Misprint',
    'Customer Changed Mind',
    'Color Mismatch / Bleeding',
    'Wrong Measurement / Cut Piece',
    'Pricing / Billing Error',
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Process Customer Return"
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Original Bill Info Card */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-slate-500">Original Invoice:</span>{' '}
            <span className="font-mono font-bold text-slate-900">{bill.invoiceNumber}</span>
          </div>
          <div>
            <span className="text-slate-500">Customer:</span>{' '}
            <span className="font-semibold text-slate-900">{bill.customerName || 'None'}</span>
          </div>
          <div>
            <span className="text-slate-500">Sale Date:</span>{' '}
            <span>{new Date(bill.date).toLocaleDateString()}</span>
          </div>
          <div>
            <span className="text-slate-500">Original Total:</span>{' '}
            <span className="font-bold text-slate-900 font-mono">Rs. {bill.grandTotal.toLocaleString()}</span>
          </div>
        </div>

        {/* Line Items Table with Return Selector */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-100 p-2.5 text-xs font-bold text-slate-700 grid grid-cols-12 gap-2">
            <div className="col-span-5">Product Description</div>
            <div className="col-span-2 text-center">Purchased</div>
            <div className="col-span-2 text-right">Unit Price</div>
            <div className="col-span-3 text-center">Return Qty</div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[36vh] overflow-y-auto">
            {bill.items.map(item => {
              const currentReturnQty = returnQtys[item.productId] || 0;
              const unitPrice = Math.round(item.subtotal / item.quantity);

              return (
                <div key={item.productId} className="p-3 text-xs grid grid-cols-12 gap-2 items-center hover:bg-slate-50/50">
                  <div className="col-span-5 min-w-0">
                    <div className="font-bold text-slate-900 truncate">{item.productName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{item.sku} • {item.unit}</div>
                  </div>

                  <div className="col-span-2 text-center font-semibold text-slate-700">
                    {item.quantity}
                  </div>

                  <div className="col-span-2 text-right font-mono text-slate-700">
                    Rs. {unitPrice.toLocaleString()}
                  </div>

                  {/* Quantity adjustment controls */}
                  <div className="col-span-3 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleQtyChange(item.productId, -1, item.quantity)}
                      disabled={currentReturnQty <= 0}
                      className="w-6 h-6 rounded-md bg-slate-200 disabled:opacity-30 hover:bg-slate-300 flex items-center justify-center font-bold text-slate-700 transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-bold font-mono text-sm text-blue-600">
                      {currentReturnQty}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQtyChange(item.productId, 1, item.quantity)}
                      disabled={currentReturnQty >= item.quantity}
                      className="w-6 h-6 rounded-md bg-blue-600 disabled:opacity-30 hover:bg-blue-700 flex items-center justify-center font-bold text-white transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reason and Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason for Return *
            </label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              {returnReasons.map(r => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Remarks / Condition Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Returned with original tags intact"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Return Summary Banner */}
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-rose-600" />
            <div>
              <div className="text-xs font-bold text-rose-950">Refund Amount Due to Customer</div>
              <div className="text-[11px] text-rose-700">
                {totalReturnItemsCount} item(s) will be automatically returned to inventory stock.
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-base font-black text-rose-700 font-mono">
              Rs. {totalReturnAmount.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="outline" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            type="button"
            onClick={handleConfirmReturn}
            disabled={totalReturnItemsCount === 0 || isSubmitting}
            className="gap-1.5 font-bold"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSubmitting ? 'Processing...' : 'Confirm Return & Restock'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
