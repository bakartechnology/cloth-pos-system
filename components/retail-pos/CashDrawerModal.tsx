'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cashDrawerService } from '@/services/hardware/cashDrawerService';
import { Vault, CheckCircle2, AlertCircle, Banknote, ArrowRight } from 'lucide-react';

interface CashDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  grandTotal: number;
  cashReceived: number;
  changeDue: number;
  onCompleteSale: () => void;
}

export function CashDrawerModal({
  isOpen,
  onClose,
  grandTotal,
  cashReceived,
  changeDue,
  onCompleteSale,
}: CashDrawerModalProps) {
  const [drawerKicked, setDrawerKicked] = useState(false);
  const [isCashCollected, setIsCashCollected] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDrawerKicked(false);
      setIsCashCollected(false);
      // Automatically trigger the drawer kick pulse upon entering this confirmation screen
      cashDrawerService.openCashDrawer().then(() => {
        setDrawerKicked(true);
      });
    }
  }, [isOpen]);

  const handleFinish = () => {
    cashDrawerService.closeDrawer();
    onCompleteSale();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cash Tender & Drawer Workflow"
      maxWidth="md"
    >
      <div className="space-y-4 select-none">
        {/* Animated Drawer Status Card */}
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
            <Vault className="w-6 h-6 animate-pulse" />
          </div>

          <h3 className="text-sm font-bold text-emerald-900">
            {drawerKicked ? 'Cash Drawer Opened' : 'Opening Cash Drawer...'}
          </h3>
          <p className="text-xs text-emerald-700">
            Signal sent to hardware drawer kick solenoid. Please place customer tender in slot.
          </p>
        </div>

        {/* Change Return Highlight Card */}
        <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3">
          <div className="flex justify-between items-center text-xs text-slate-300">
            <span>Total Bill Payable:</span>
            <span className="font-mono text-sm font-bold">Rs. {grandTotal.toLocaleString()}</span>
          </div>

          <div className="flex justify-between items-center text-xs text-slate-300">
            <span>Cash Tender Received:</span>
            <span className="font-mono text-sm font-bold text-emerald-400">
              Rs. {cashReceived.toLocaleString()}
            </span>
          </div>

          <div className="border-t border-slate-700 pt-3 flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
              Change to Return:
            </span>
            <span className="text-2xl font-black font-mono text-amber-400">
              Rs. {changeDue.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Cashier Checklist Checklist */}
        <div className="space-y-2 text-xs">
          <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
            <input
              type="checkbox"
              checked={isCashCollected}
              onChange={e => setIsCashCollected(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="font-semibold text-slate-800">
              I have collected Rs. {cashReceived.toLocaleString()} and handed change Rs. {changeDue.toLocaleString()} to customer.
            </span>
          </label>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <Button variant="outline" size="sm" type="button" onClick={onClose}>
            Back
          </Button>

          <Button
            variant="primary"
            size="md"
            type="button"
            onClick={handleFinish}
            disabled={!isCashCollected}
            className="gap-2 font-bold bg-emerald-600 hover:bg-emerald-700 shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            Complete Payment & Print
          </Button>
        </div>
      </div>
    </Modal>
  );
}
