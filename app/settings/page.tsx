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
