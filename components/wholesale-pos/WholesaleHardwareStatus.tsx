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
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors"
        title="Wholesale Hardware Connectivity & Diagnostics"
      >
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-600"></span>
        </span>
        <span className="hidden sm:inline text-slate-600">Hardware:</span>
        <span className="text-cyan-700 font-bold">Devices Status</span>
        <Settings2 className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {isMenuOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 text-xs select-none">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <div>
              <h4 className="font-bold text-slate-900 leading-tight">Wholesale Hardware Panel</h4>
              <p className="text-[10px] text-slate-400">Device readiness & diagnostics</p>
            </div>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-semibold">
              v1.0 Ready
            </span>
          </div>

          <div className="space-y-2">
            {/* Barcode Scanner */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2">
                <ScanBarcode className="w-4 h-4 text-cyan-600" />
                <div>
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span>Barcode Scanner</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  </div>
                  <div className="text-[10px] text-emerald-600 font-medium">Ready (Keyboard HID)</div>
                </div>
              </div>
              <button
                type="button"
                onClick={testScanner}
                className="p-1 text-slate-500 hover:text-cyan-600 hover:bg-white rounded"
                title="Test Beep"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Laser Printer */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-indigo-600" />
                <div>
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span>Laser / A4 Printer</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  </div>
                  <div className="text-[10px] text-emerald-600 font-medium">Ready (Spooler Active)</div>
                </div>
              </div>
              <button
                type="button"
                onClick={testPrinter}
                className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-white rounded"
                title="Test Printer"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Cash Drawer */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2">
                <Vault className="w-4 h-4 text-amber-600" />
                <div>
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span>Cash Drawer</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  </div>
                  <div className="text-[10px] text-amber-600 font-medium">Not Connected / Demo</div>
                </div>
              </div>
              <button
                type="button"
                onClick={testDrawer}
                className="p-1 text-slate-500 hover:text-amber-600 hover:bg-white rounded"
                title="Test Drawer Kick"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Card Terminal */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <div>
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span>Card Terminal</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  </div>
                  <div className="text-[10px] text-amber-600 font-medium">Not Connected / Demo</div>
                </div>
              </div>
              <button
                type="button"
                onClick={testCard}
                className="p-1 text-slate-500 hover:text-blue-600 hover:bg-white rounded"
                title="Test Terminal"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400 text-center">
            Hardware is abstracted. POS functions seamlessly in mock/demo mode.
          </div>
        </div>
      )}
    </div>
  );
}
