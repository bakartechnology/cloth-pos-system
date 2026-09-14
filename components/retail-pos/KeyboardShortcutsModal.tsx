'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Keyboard, Command } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const shortcuts = [
    { key: 'F2', label: 'Barcode Scanner Focus', desc: 'Instantly jump to continuous barcode scanner input' },
    { key: 'F3', label: 'Search Customer Bills', desc: 'Open previous bills search by customer name' },
    { key: 'F4', label: 'Search Invoice', desc: 'Look up past bill directly by invoice number' },
    { key: 'F8', label: 'Payment / Checkout', desc: 'Open checkout & tender modal for active cart' },
    { key: 'F9', label: 'Print Receipt', desc: 'Trigger thermal printer for completed sale' },
    { key: 'ESC', label: 'Close Active Modal', desc: 'Dismiss any open dialog, search, or drawer' },
    { key: 'Enter', label: 'Confirm Tender / Action', desc: 'Submit scanned barcode or confirm tender amount' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Retail POS Keyboard Shortcuts"
      maxWidth="md"
    >
      <div className="space-y-3">
        <p className="text-xs text-slate-500">
          Supercharge cashier productivity with high-speed POS keyboard function keys:
        </p>

        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
          {shortcuts.map((item, idx) => (
            <div key={idx} className="p-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div>
                <div className="font-bold text-slate-900">{item.label}</div>
                <div className="text-[11px] text-slate-400">{item.desc}</div>
              </div>
              <kbd className="px-2.5 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-mono font-black text-slate-800 shadow-2xs">
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
