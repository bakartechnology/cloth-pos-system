'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const shortcuts = [
    { key: 'F1', label: 'Barcode Scanner Focus', desc: 'Jump to barcode scanner input field' },
    { key: 'F2', label: 'Search Catalog Focus', desc: 'Jump to fabric name and SKU text search' },
    { key: 'F3', label: 'Search Customer Bills', desc: 'Open previous bills search by customer name' },
    { key: 'F4', label: 'Search Invoice', desc: 'Look up past bill directly by invoice number' },
    { key: 'F8', label: 'Proceed to Tender', desc: 'Open checkout & payment tender modal' },
    { key: 'F9', label: 'Print Receipt', desc: 'Trigger thermal printer for completed sale' },
    { key: 'ESC', label: 'Close Active Modal', desc: 'Dismiss any open dialog or modal' },
    { key: 'Enter', label: 'Confirm Action', desc: 'Submit scanned barcode or confirm tender amount' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Retail POS Keyboard Shortcuts"
      maxWidth="md"
    >
      <div className="space-y-3 select-none">
        <p className="text-xs text-[#66726D]">
          Keyboard function shortcuts designed for high-speed cashier checkout:
        </p>

        <div className="divide-y divide-[#DCE3E0]/70 border border-[#DCE3E0] rounded-xl overflow-hidden bg-white text-xs">
          {shortcuts.map((item, idx) => (
            <div key={idx} className="p-3 flex items-center justify-between hover:bg-[#F6F8F7] transition-colors">
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
          <Button variant="primary" size="sm" onClick={onClose}>
            Got It
          </Button>
        </div>
      </div>
    </Modal>
  );
}
