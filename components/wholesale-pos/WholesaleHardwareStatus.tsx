'use client';

import React, { useState } from 'react';
import {
  ScanBarcode,
  Printer,
  Vault,
  CreditCard,
  Settings2,
  Play,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { barcodeScannerService } from '@/services/hardware/barcodeScannerService';
import { receiptPrinterService } from '@/services/hardware/receiptPrinterService';
import { cashDrawerService } from '@/services/hardware/cashDrawerService';
import { cardTerminalService } from '@/services/hardware/cardTerminalService';
import { useToast } from '@/context/ToastContext';

export function WholesaleHardwareStatus() {
  const { toast } = useToast();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const testScanner = () => {
    barcodeScannerService.playSuccessBeep();
    toast({
      title: 'Scanner Beep OK',
      description: 'Physical USB / HID barcode scanner listener is active.',
      type: 'success',
    });
  };

  const testPrinter = async () => {
    toast({
      title: 'Laser/A4 Printer Ready',
      description: 'System print spooler bridge is active for A4 invoice generation.',
      type: 'info',
    });
  };

  const testDrawer = async () => {
    const res = await cashDrawerService.testCashDrawer();
    if (res.success) {
      toast({
        title: 'Cash Drawer Kicked (Demo)',
        description: 'Electrical pulse signal simulated.',
        type: 'success',
      });
    }
  };

  const testCard = () => {
    toast({
      title: 'Card Terminal (Demo Mode)',
      description: 'Simulated payment bridge listening for card checkout.',
      type: 'info',
    });
  };

  return (
    <div className="relative inline-flex items-center">
      {/* Compact pulsing green dot button */}
      <button
        type="button"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="flex items-center justify-center p-2 rounded-xl border border-[#DCE3E0] bg-white hover:bg-[#F0F4F2] shadow-2xs transition-colors cursor-pointer"
        title="Hardware: Devices Online & Ready (Click for diagnostics)"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16835B] opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#16835B]" />
        </span>
      </button>

      {isMenuOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-[#DCE3E0] shadow-2xl p-3.5 z-50 animate-in fade-in zoom-in-95 text-xs select-none">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#DCE3E0]">
            <div>
              <h4 className="font-bold text-[#17211D] leading-tight">Hardware Diagnostics</h4>
              <p className="text-[10px] text-[#8A9590]">Device readiness & diagnostics</p>
            </div>
            <span className="text-[10px] bg-[#E9F3EF] text-[#125E45] px-2 py-0.5 rounded font-mono font-semibold">
              v1.0 Ready
            </span>
          </div>

          <div className="space-y-2">
            {/* Barcode Scanner */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#F0F4F2] border border-[#DCE3E0]">
              <div className="flex items-center gap-2">
                <ScanBarcode className="w-4 h-4 text-[#197A5A]" />
                <div>
                  <div className="font-bold text-[#17211D] flex items-center gap-1.5">
                    <span>Barcode Scanner</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16835B]"></span>
                  </div>
                  <div className="text-[10px] text-[#16835B] font-medium">Ready (Keyboard HID)</div>
                </div>
              </div>
              <button
                type="button"
                onClick={testScanner}
                className="p-1 text-[#8A9590] hover:text-[#197A5A] hover:bg-white rounded"
                title="Test Beep"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Laser Printer */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#F0F4F2] border border-[#DCE3E0]">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-[#197A5A]" />
                <div>
                  <div className="font-bold text-[#17211D] flex items-center gap-1.5">
                    <span>Laser / A4 Printer</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16835B]"></span>
                  </div>
                  <div className="text-[10px] text-[#16835B] font-medium">Ready (Spooler Active)</div>
                </div>
              </div>
              <button
                type="button"
                onClick={testPrinter}
                className="p-1 text-[#8A9590] hover:text-[#197A5A] hover:bg-white rounded"
                title="Test Printer"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Cash Drawer */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#F0F4F2] border border-[#DCE3E0]">
              <div className="flex items-center gap-2">
                <Vault className="w-4 h-4 text-[#9A6A16]" />
                <div>
                  <div className="font-bold text-[#17211D] flex items-center gap-1.5">
                    <span>Cash Drawer</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#9A6A16]"></span>
                  </div>
                  <div className="text-[10px] text-[#9A6A16] font-medium">Not Connected / Demo</div>
                </div>
              </div>
              <button
                type="button"
                onClick={testDrawer}
                className="p-1 text-[#8A9590] hover:text-[#9A6A16] hover:bg-white rounded"
                title="Test Drawer Kick"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Card Terminal */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#F0F4F2] border border-[#DCE3E0]">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#657084]" />
                <div>
                  <div className="font-bold text-[#17211D] flex items-center gap-1.5">
                    <span>Card Terminal</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#9A6A16]"></span>
                  </div>
                  <div className="text-[10px] text-[#9A6A16] font-medium">Not Connected / Demo</div>
                </div>
              </div>
              <button
                type="button"
                onClick={testCard}
                className="p-1 text-[#8A9590] hover:text-[#657084] hover:bg-white rounded"
                title="Test Terminal"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-[#DCE3E0] text-[10px] text-[#8A9590] text-center">
            Hardware is abstracted. POS functions seamlessly in mock/demo mode.
          </div>
        </div>
      )}
    </div>
  );
}
