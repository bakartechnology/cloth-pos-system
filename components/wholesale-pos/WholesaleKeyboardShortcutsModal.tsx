'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface WholesaleKeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WholesaleKeyboardShortcutsModal({
  isOpen,
  onClose,
}: WholesaleKeyboardShortcutsModalProps) {
  const shortcuts = [
    { key: 'F1', label: 'Barcode Scanner Focus', desc: 'Jump to barcode scanner input field' },
    { key: 'F2', label: 'Search Catalog Focus', desc: 'Jump to fabric name, SKU, or type search' },
    { key: 'F3', label: 'Search Past Bills / Returns', desc: 'Open previous wholesale bills and returns lookup' },
    { key: 'F8', label: 'Proceed to Checkout', desc: 'Open wholesale invoice checkout and settlement modal' },
    { key: 'ESC', label: 'Close Active Modal', desc: 'Dismiss any open dialog or popup' },
    { key: 'Enter', label: 'Confirm Action', desc: 'Submit scanned barcode or confirm tender amount' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Wholesale POS Keyboard Shortcuts"
      maxWidth="md"
    >
      <div className="space-y-3 select-none">
        <p className="text-xs text-[#66726D]">
          Keyboard function shortcuts designed for high-speed wholesale order processing:
        </p>

        <div className="divide-y divide-[#DCE3E0] border border-[#DCE3E0] rounded-xl overflow-hidden bg-white text-xs">
          {shortcuts.map((item, idx) => (
            <div key={idx} className="p-3 flex items-center justify-between hover:bg-[#F0F4F2] transition-colors">
              <div>
                <div className="font-bold text-[#17211D]">{item.label}</div>
                <div className="text-[11px] text-[#8A9590] mt-0.5">{item.desc}</div>
              </div>
              <kbd className="px-2.5 py-1 bg-[#F0F4F2] border border-[#DCE3E0] rounded-lg text-xs font-mono font-bold text-[#17211D] shadow-2xs">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="primary" size="sm" onClick={onClose} className="bg-[#197A5A] hover:bg-[#125E45] text-white">
            Got It
          </Button>
        </div>
      </div>
    </Modal>
  );
}
