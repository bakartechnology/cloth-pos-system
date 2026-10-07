'use client';

import React, { useState } from 'react';
import {
  ScanBarcode,
  Printer,
  Vault,
  CreditCard,
  CheckCircle,
  Play,
  Settings2,
  X,
} from 'lucide-react';
import { cashDrawerService } from '@/services/hardware/cashDrawerService';
import { cardTerminalService } from '@/services/hardware/cardTerminalService';
import { receiptPrinterService } from '@/services/hardware/receiptPrinterService';
import { barcodeScannerService } from '@/services/hardware/barcodeScannerService';
import { useToast } from '@/context/ToastContext';

export function HardwareStatusBar() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const handleTestDrawer = async () => {
    toast({ title: 'Testing Cash Drawer...', description: 'Sending kick signal', type: 'info' });
    const res = await cashDrawerService.testCashDrawer();
    if (res.success) {
      toast({ title: 'Cash Drawer Kicked', description: 'Signal acknowledged', type: 'success' });
    } else {
      toast({ title: 'Drawer Failed', description: res.message, type: 'error' });
    }
  };

  const handleTestPrinter = async () => {
    toast({ title: 'Testing Printer...', description: 'Sending self-test command', type: 'info' });
    const res = await receiptPrinterService.testPrinter();
    if (res.success) {
      toast({ title: 'Printer OK', description: res.message, type: 'success' });
    } else {
      toast({ title: 'Printer Error', description: res.message, type: 'error' });
    }
  };

  const handleTestScanner = () => {
    barcodeScannerService.playSuccessBeep();
    toast({ title: 'Scanner Beep OK', description: 'Audio & HID wedge input simulated', type: 'success' });
  };

  const handleTestTerminal = () => {
    toast({ title: 'Card Terminal Ready', description: 'Simulated LAN / Serial interface listening', type: 'info' });
  };

  return (
    <div className="relative inline-flex items-center">
      {/* Compact pulsing green dot button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center p-2 rounded-xl border border-[#DCE3E0] bg-white hover:bg-[#F0F4F2] shadow-2xs transition-colors cursor-pointer"
        title="Hardware: Devices Online & Ready (Click to test diagnostics)"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16835B] opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#16835B]" />
        </span>
      </button>

      {/* Dropdown Diagnostic Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl border border-[#DCE3E0] shadow-xl p-3.5 z-50 animate-in fade-in zoom-in-95 select-none">
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#DCE3E0]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#16835B]" />
              <h4 className="text-xs font-bold text-[#17211D]">Hardware Diagnostics</h4>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-[#8A9590] hover:text-[#17211D] hover:bg-[#F0F4F2]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2 text-xs">
            {/* Barcode Scanner */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#F6F8F7] border border-[#DCE3E0]">
              <div className="flex items-center gap-2">
                <ScanBarcode className="w-4 h-4 text-[#125E45]" />
                <div>
                  <div className="font-semibold text-[#17211D] leading-tight">Barcode Scanner</div>
                  <div className="text-[10px] text-[#16835B] font-medium">HID Wedge (Ready)</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleTestScanner}
                className="px-2 py-0.5 rounded-lg border border-[#DCE3E0] bg-white text-[10px] font-semibold text-[#17211D] hover:bg-[#F0F4F2]"
                title="Test Scanner Beep"
              >
                Test
              </button>
            </div>

            {/* Receipt Printer */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#F6F8F7] border border-[#DCE3E0]">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-[#125E45]" />
                <div>
                  <div className="font-semibold text-[#17211D] leading-tight">Receipt Printer</div>
                  <div className="text-[10px] text-[#16835B] font-medium">ESC/POS (Ready)</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleTestPrinter}
                className="px-2 py-0.5 rounded-lg border border-[#DCE3E0] bg-white text-[10px] font-semibold text-[#17211D] hover:bg-[#F0F4F2]"
                title="Send self-test pulse"
              >
                Test
              </button>
            </div>

            {/* Cash Drawer */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#F6F8F7] border border-[#DCE3E0]">
              <div className="flex items-center gap-2">
                <Vault className="w-4 h-4 text-[#125E45]" />
                <div>
                  <div className="font-semibold text-[#17211D] leading-tight">Cash Drawer</div>
                  <div className="text-[10px] text-[#16835B] font-medium">RJ11 Solenoid (Ready)</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleTestDrawer}
                className="px-2 py-0.5 rounded-lg border border-[#DCE3E0] bg-white text-[10px] font-semibold text-[#17211D] hover:bg-[#F0F4F2]"
                title="Trigger kick solenoid"
              >
                Kick
              </button>
            </div>

            {/* Card Terminal */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#F6F8F7] border border-[#DCE3E0]">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#125E45]" />
                <div>
                  <div className="font-semibold text-[#17211D] leading-tight">Card Terminal</div>
                  <div className="text-[10px] text-[#16835B] font-medium">LAN / Wireless (Ready)</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleTestTerminal}
                className="px-2 py-0.5 rounded-lg border border-[#DCE3E0] bg-white text-[10px] font-semibold text-[#17211D] hover:bg-[#F0F4F2]"
                title="Ping terminal interface"
              >
                Ping
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
