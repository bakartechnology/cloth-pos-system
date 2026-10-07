'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  Settings,
  Store,
  Printer,
  ShieldCheck,
  Database,
  RefreshCw,
  CheckCircle2,
  Lock,
  Sparkles,
  CreditCard,
  Radio,
  Usb,
} from 'lucide-react';
import { storageService } from '@/services/storageService';
import { useToast } from '@/context/ToastContext';
import { StoreSettings } from '@/types';

export default function SettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<StoreSettings>(storageService.getSettings());

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    storageService.setSettings(settings);
    toast({
      title: 'Settings Saved',
      description: 'Store preferences, receipt headers, and retention configurations updated.',
      type: 'success',
    });
  };

  const handleResetData = () => {
    if (confirm('Warning: This will reset all products, bills, Khata transactions, attendance and staff accounts back to initial demo seeds. Proceed?')) {
      storageService.resetAllData();
    }
  };

  return (
    <ProtectedRoute permission="settings_view">
      <AppShell>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-sm">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  System Preferences & Store Profile
                </h1>
                <p className="text-xs text-slate-500">
                  Global branding tokens, thermal receipt printers, NTN taxes, and 5-year retention rules.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="md"
              onClick={handleResetData}
              className="gap-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
            >
              <RefreshCw className="w-4 h-4" /> Reset Factory Seed Data
            </Button>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {/* Store Profile */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Store className="w-4 h-4 text-blue-600" /> Store Profile & Legal Information
                </CardTitle>
                <CardDescription>Details displayed across printed bills, wholesale invoices, and statements.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Input
                      label="Store Name *"
                      value={settings.storeName}
                      onChange={e => setSettings({ ...settings, storeName: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Input
                      label="Business Tagline"
                      value={settings.storeTagline}
                      onChange={e => setSettings({ ...settings, storeTagline: e.target.value })}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Input
                      label="Physical Store Address"
                      value={settings.address}
                      onChange={e => setSettings({ ...settings, address: e.target.value })}
                    />
                  </div>

                  <div>
                    <Input
                      label="City / Region"
                      value={settings.city}
                      onChange={e => setSettings({ ...settings, city: e.target.value })}
                    />
                  </div>

                  <div>
                    <Input
                      label="Phone / Support Contact"
                      value={settings.phone}
                      onChange={e => setSettings({ ...settings, phone: e.target.value })}
                    />
                  </div>

                  <div>
                    <Input
                      label="NTN / STRN Tax Registration Number"
                      value={settings.ntnNumber}
                      onChange={e => setSettings({ ...settings, ntnNumber: e.target.value })}
                    />
                  </div>

                  <div>
                    <Select
                      label="Operating Currency"
                      value={settings.currency}
                      onChange={e => setSettings({ ...settings, currency: e.target.value as any })}
                    >
                      <option value="PKR">PKR (Pakistani Rupee)</option>
                      <option value="Rs.">Rs. (Rupee Symbol)</option>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Receipt & Thermal Printer Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Printer className="w-4 h-4 text-cyan-600" /> Receipt & Invoice Settings
                </CardTitle>
                <CardDescription>Configure print-ready policies and thermal printer messages.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Receipt Footer Disclaimer & Return Policy Message
                  </label>
                  <textarea
                    rows={3}
                    value={settings.receiptFooterMessage}
                    onChange={e => setSettings({ ...settings, receiptFooterMessage: e.target.value })}
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Input
                      label="Default Sales Tax / GST Rate (%)"
                      type="number"
                      min="0"
                      max="25"
                      value={settings.defaultTaxRate}
                      onChange={e => setSettings({ ...settings, defaultTaxRate: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div>
                    <Input
                      label="Low Stock Safety Threshold Alert"
                      type="number"
                      min="1"
                      value={settings.lowStockThreshold}
                      onChange={e => setSettings({ ...settings, lowStockThreshold: parseInt(e.target.value, 10) || 10 })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Hardware Card Payment Terminals Card (Retail, Wholesale, Khata) - Optional */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-[#125E45]" /> Hardware Card Payment Terminals (Optional)
                    </CardTitle>
                    <CardDescription>
                      Configure wired (USB/Ethernet) or wireless (Wi-Fi/Bluetooth) bank card POS terminals for customer card swipe, chip insert & PIN authorization.
                    </CardDescription>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#E9F3EF] text-[#125E45] border border-[#DCEDE6]">
                    Optional Hardware Integration
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 1. Retail Card Terminal */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#125E45]" />
                      <h4 className="text-xs font-bold text-slate-900">1. Retail POS Card Terminal</h4>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.retailCardTerminal?.enabled ?? false}
                        onChange={e =>
                          setSettings({
                            ...settings,
                            retailCardTerminal: {
                              ...settings.retailCardTerminal,
                              enabled: e.target.checked,
                              terminalName: settings.retailCardTerminal?.terminalName || 'Retail POS Counter Terminal',
                              connectionType: settings.retailCardTerminal?.connectionType || 'Wireless (Wi-Fi / Bluetooth)',
                              deviceModel: settings.retailCardTerminal?.deviceModel || 'PAX A920 Pro Smart POS',
                              ipOrPort: settings.retailCardTerminal?.ipOrPort || '192.168.1.120:8080',
                              merchantId: settings.retailCardTerminal?.merchantId || 'MID-ALNOOR-RET01',
                              autoPrintSlip: settings.retailCardTerminal?.autoPrintSlip ?? true,
                            },
                          })
                        }
                        className="rounded text-[#125E45] focus:ring-[#197A5A] accent-[#125E45]"
                      />
                      <span>Enable Retail Terminal</span>
                    </label>
                  </div>

                  {settings.retailCardTerminal?.enabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Connection Interface
                        </label>
                        <select
                          value={settings.retailCardTerminal?.connectionType || 'Wireless (Wi-Fi / Bluetooth)'}
                          onChange={e =>
                            setSettings({
                              ...settings,
                              retailCardTerminal: {
                                ...settings.retailCardTerminal,
                                connectionType: e.target.value as any,
                              },
                            })
                          }
                          className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                        >
                          <option value="Wireless (Wi-Fi / Bluetooth)">Wireless (Wi-Fi / Bluetooth)</option>
                          <option value="Wired (USB / Ethernet)">Wired (USB / Ethernet)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Terminal Model / Brand
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. PAX A920 / Ingenico Move"
                          value={settings.retailCardTerminal?.deviceModel || ''}
                          onChange={e =>
                            setSettings({
                              ...settings,
                              retailCardTerminal: {
                                ...settings.retailCardTerminal,
                                deviceModel: e.target.value,
                              },
                            })
                          }
                          className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          IP Address / COM Port
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 192.168.1.120:8080 or COM3"
                          value={settings.retailCardTerminal?.ipOrPort || ''}
                          onChange={e =>
                            setSettings({
                              ...settings,
                              retailCardTerminal: {
                                ...settings.retailCardTerminal,
                                ipOrPort: e.target.value,
                              },
                            })
                          }
                          className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Wholesale Card Terminal */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                      <h4 className="text-xs font-bold text-slate-900">2. Wholesale POS Card Terminal</h4>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.wholesaleCardTerminal?.enabled ?? false}
                        onChange={e =>
                          setSettings({
                            ...settings,
                            wholesaleCardTerminal: {
                              ...settings.wholesaleCardTerminal,
                              enabled: e.target.checked,
                              terminalName: settings.wholesaleCardTerminal?.terminalName || 'Wholesale B2B Terminal',
                              connectionType: settings.wholesaleCardTerminal?.connectionType || 'Wired (USB / Ethernet)',
                              deviceModel: settings.wholesaleCardTerminal?.deviceModel || 'Ingenico Move 5000',
                              ipOrPort: settings.wholesaleCardTerminal?.ipOrPort || 'COM3',
                              merchantId: settings.wholesaleCardTerminal?.merchantId || 'MID-ALNOOR-WS01',
                              autoPrintSlip: settings.wholesaleCardTerminal?.autoPrintSlip ?? true,
                            },
                          })
                        }
                        className="rounded text-blue-600 focus:ring-blue-500 accent-blue-600"
                      />
                      <span>Enable Wholesale Terminal</span>
                    </label>
                  </div>

                  {settings.wholesaleCardTerminal?.enabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Connection Interface
                        </label>
                        <select
                          value={settings.wholesaleCardTerminal?.connectionType || 'Wired (USB / Ethernet)'}
                          onChange={e =>
                            setSettings({
                              ...settings,
                              wholesaleCardTerminal: {
                                ...settings.wholesaleCardTerminal,
                                connectionType: e.target.value as any,
                              },
                            })
                          }
                          className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                        >
                          <option value="Wired (USB / Ethernet)">Wired (USB / Ethernet)</option>
                          <option value="Wireless (Wi-Fi / Bluetooth)">Wireless (Wi-Fi / Bluetooth)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Terminal Model / Brand
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Ingenico / Verifone"
                          value={settings.wholesaleCardTerminal?.deviceModel || ''}
                          onChange={e =>
                            setSettings({
                              ...settings,
                              wholesaleCardTerminal: {
                                ...settings.wholesaleCardTerminal,
                                deviceModel: e.target.value,
                              },
                            })
                          }
                          className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          IP Address / COM Port
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. COM3 or 192.168.1.122:8080"
                          value={settings.wholesaleCardTerminal?.ipOrPort || ''}
                          onChange={e =>
                            setSettings({
                              ...settings,
                              wholesaleCardTerminal: {
                                ...settings.wholesaleCardTerminal,
                                ipOrPort: e.target.value,
                              },
                            })
                          }
                          className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Khata Card Terminal */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                      <h4 className="text-xs font-bold text-slate-900">3. Khata & Ledger Card Terminal</h4>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.khataCardTerminal?.enabled ?? false}
                        onChange={e =>
                          setSettings({
                            ...settings,
                            khataCardTerminal: {
                              ...settings.khataCardTerminal,
                              enabled: e.target.checked,
                              terminalName: settings.khataCardTerminal?.terminalName || 'Recovery & Khata Terminal',
                              connectionType: settings.khataCardTerminal?.connectionType || 'Wireless (Wi-Fi / Bluetooth)',
                              deviceModel: settings.khataCardTerminal?.deviceModel || 'PAX D210 Mobile POS',
                              ipOrPort: settings.khataCardTerminal?.ipOrPort || '192.168.1.125:8080',
                              merchantId: settings.khataCardTerminal?.merchantId || 'MID-ALNOOR-KH01',
                              autoPrintSlip: settings.khataCardTerminal?.autoPrintSlip ?? true,
                            },
                          })
                        }
                        className="rounded text-amber-600 focus:ring-amber-500 accent-amber-600"
                      />
                      <span>Enable Khata Terminal</span>
                    </label>
                  </div>

                  {settings.khataCardTerminal?.enabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Connection Interface
                        </label>
                        <select
                          value={settings.khataCardTerminal?.connectionType || 'Wireless (Wi-Fi / Bluetooth)'}
                          onChange={e =>
                            setSettings({
                              ...settings,
                              khataCardTerminal: {
                                ...settings.khataCardTerminal,
                                connectionType: e.target.value as any,
                              },
                            })
                          }
                          className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                        >
                          <option value="Wireless (Wi-Fi / Bluetooth)">Wireless (Wi-Fi / Bluetooth)</option>
                          <option value="Wired (USB / Ethernet)">Wired (USB / Ethernet)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Terminal Model / Brand
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. PAX D210 Mobile POS"
                          value={settings.khataCardTerminal?.deviceModel || ''}
                          onChange={e =>
                            setSettings({
                              ...settings,
                              khataCardTerminal: {
                                ...settings.khataCardTerminal,
                                deviceModel: e.target.value,
                              },
                            })
                          }
                          className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          IP Address / COM Port
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 192.168.1.125:8080"
                          value={settings.khataCardTerminal?.ipOrPort || ''}
                          onChange={e =>
                            setSettings({
                              ...settings,
                              khataCardTerminal: {
                                ...settings.khataCardTerminal,
                                ipOrPort: e.target.value,
                              },
                            })
                          }
                          className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-slate-500 bg-slate-100/70 p-3 rounded-lg leading-relaxed">
                  💡 <strong>Card Payment Workflow:</strong> When initiating Card checkout, total payable amount is dispatched to the active terminal. The customer taps (NFC Contactless) or inserts EMV chip card, enters secret PIN, and the terminal prints authorized transaction slips automatically for Retail POS, Wholesale POS, or Khata settlements.
                </div>
              </CardContent>
            </Card>

            {/* 5-Year Data Retention Policy Card */}
            <Card className="border-blue-200 bg-blue-50/30">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                  <Database className="w-4 h-4 text-blue-600" /> Five-Year Historical Data Retention Architecture
                </CardTitle>
                <CardDescription>
                  Enterprise audit & multi-year archival readiness policy.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="p-4 rounded-xl bg-white border border-blue-100 text-slate-700 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-blue-900">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    5-Year Full Retention Active ({settings.dataRetentionYears} Years Policy)
                  </div>
                  <p className="leading-relaxed text-slate-600">
                    &quot;Historical sales, bills, stock movement, customer ledger, staff activity and payment records are intended to remain available for five years.&quot;
                  </p>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Archival Horizon: 2022 to 2026</span>
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Frontend Schema Ready
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="submit" variant="primary" size="lg" className="font-bold gap-2">
                <CheckCircle2 className="w-4 h-4" /> Save Store Preferences
              </Button>
            </div>
          </form>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
