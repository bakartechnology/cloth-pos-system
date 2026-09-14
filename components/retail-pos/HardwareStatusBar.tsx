'use client';

import React, { useState } from 'react';
import {
  ScanBarcode,
  Printer,
  Vault,
  CreditCard,
  CheckCircle,
  AlertTriangle,
  Play,
  Settings2,
} from 'lucide-react';
import { cashDrawerService } from '@/services/hardware/cashDrawerService';
import { cardTerminalService } from '@/services/hardware/cardTerminalService';
import { receiptPrinterService } from '@/services/hardware/receiptPrinterService';
import { barcodeScannerService } from '@/services/hardware/barcodeScannerService';
import { useToast } from '@/context/ToastContext';

export function HardwareStatusBar() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const [scannerReady, setScannerReady] = useState(true);
  const [printerReady, setPrinterReady] = useState(true);
  const [drawerReady, setDrawerReady] = useState(true);
  const [terminalReady, setTerminalReady] = useState(true);

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
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-colors"
        title="POS Hardware Status & Device Diagnostics"
      >
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="hidden sm:inline">Hardware:</span>
        <span className="text-emerald-700 font-bold">Devices Ready</span>
        <Settings2 className="w-3.5 h-3.5 text-slate-500" />
      </button>

      {/* Dropdown Diagnostic Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 select-none">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-900">Hardware Abstraction Layer</h4>
            <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-mono font-semibold">
              Bridge Ready
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {/* Barcode Scanner */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2">
                <ScanBarcode className="w-4 h-4 text-blue-600" />
                <div>
                  <div className="font-semibold text-slate-900 leading-tight">Barcode Scanner</div>
                  <div className="text-[10px] text-emerald-600 font-medium">HID Wedge (Ready)</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleTestScanner}
                className="p-1 hover:bg-white rounded border border-transparent hover:border-slate-200 text-slate-600 hover:text-blue-600"
                title="Test Scanner Beep"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Receipt Printer */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-indigo-600" />
                <div>
                  <div className="font-semibold text-slate-900 leading-tight">Receipt Printer</div>
                  <div className="text-[10px] text-emerald-600 font-medium">ESC/POS 80mm/58mm</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleTestPrinter}
                className="p-1 hover:bg-white rounded border border-transparent hover:border-slate-200 text-slate-600 hover:text-indigo-600"
                title="Test Printer"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Cash Drawer */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2">
                <Vault className="w-4 h-4 text-amber-600" />
                <div>
                  <div className="font-semibold text-slate-900 leading-tight">Cash Drawer</div>
                  <div className="text-[10px] text-emerald-600 font-medium">Pulse Kick Ready</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleTestDrawer}
                className="p-1 hover:bg-white rounded border border-transparent hover:border-slate-200 text-slate-600 hover:text-amber-600"
                title="Kick Drawer"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Card Terminal */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-cyan-600" />
                <div>
                  <div className="font-semibold text-slate-900 leading-tight">Card Terminal</div>
                  <div className="text-[10px] text-emerald-600 font-medium">LAN/Serial Standby</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleTestTerminal}
                className="p-1 hover:bg-white rounded border border-transparent hover:border-slate-200 text-slate-600 hover:text-cyan-600"
                title="Test Terminal"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400 text-center">
            Hardware interface ready for local USB/Serial POS bridge.
          </div>
        </div>
      )}
    </div>
  );
}
