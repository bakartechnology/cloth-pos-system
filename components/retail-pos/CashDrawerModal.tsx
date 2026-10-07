'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { cashDrawerService } from '@/services/hardware/cashDrawerService';
import { Vault, CheckCircle2 } from 'lucide-react';

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
      // Trigger drawer kick signal automatically
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
      title="Cash Tender & Hardware Drawer"
      maxWidth="md"
    >
      <div className="space-y-4 select-none">
        {/* Animated Drawer Status Card */}
        <div className="p-4 bg-[#E9F3EF] border border-[#DCEDE6] rounded-2xl text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-[#DCEDE6] text-[#125E45] flex items-center justify-center mx-auto shadow-2xs">
            <Vault className="w-6 h-6 animate-pulse" />
          </div>

          <h3 className="text-base font-bold text-[#125E45]">
            {drawerKicked ? 'Cash Drawer Opened' : 'Opening Cash Drawer...'}
          </h3>
          <p className="text-xs text-[#125E45]/80 max-w-sm mx-auto leading-relaxed">
            Signal sent to hardware drawer kick solenoid. Please place customer tender in slot.
          </p>
        </div>

        {/* Change Return Highlight Card (Styled matching Retail POS palette) */}
        <div className="p-5 bg-[#F6F8F7] border border-[#DCE3E0] rounded-2xl space-y-3 shadow-2xs">
          <div className="flex justify-between items-center text-xs text-[#66726D]">
            <span>Total Bill Payable:</span>
            <span className="font-mono text-sm font-bold text-[#17211D]">
              Rs. {grandTotal.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs text-[#66726D]">
            <span>Cash Tender Received:</span>
            <span className="font-mono text-sm font-bold text-[#125E45]">
              Rs. {cashReceived.toLocaleString()}
            </span>
          </div>

          <div className="border-t border-[#DCE3E0] pt-3 flex items-center justify-between">
            <span className="text-xs font-bold text-[#125E45] uppercase tracking-wider">
              CHANGE TO RETURN:
            </span>
            <span className="text-2xl font-black font-mono text-[#125E45]">
              Rs. {changeDue.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Cashier Confirmation Checkbox */}
        <div className="space-y-2 text-xs">
          <label className="flex items-center gap-3 p-3 rounded-xl border border-[#DCE3E0] bg-white cursor-pointer hover:bg-[#F6F8F7] transition-colors shadow-2xs">
            <input
              type="checkbox"
              checked={isCashCollected}
              onChange={e => setIsCashCollected(e.target.checked)}
              className="w-4 h-4 rounded text-[#125E45] focus:ring-[#197A5A] accent-[#125E45] cursor-pointer"
            />
            <span className="font-semibold text-[#17211D] leading-snug">
              I have collected Rs. {cashReceived.toLocaleString()} and handed change Rs. {changeDue.toLocaleString()} to customer.
            </span>
          </label>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-[#DCE3E0]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[#DCE3E0] rounded-xl text-xs font-semibold text-[#17211D] hover:bg-[#F0F4F2] transition-colors cursor-pointer"
          >
            Back
          </button>

          <button
            type="button"
            onClick={handleFinish}
            disabled={!isCashCollected}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-[#16835B] hover:bg-[#125E45]"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Complete Payment & Print</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
