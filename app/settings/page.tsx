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
  Building,
  Plus,
  Trash2,
  Edit,
  X,
  Layers,
  Check,
} from 'lucide-react';
import { storageService } from '@/services/storageService';
import { useToast } from '@/context/ToastContext';
import { StoreSettings, BankAccount, POSChannel } from '@/types';
import { Modal } from '@/components/ui/Modal';

export default function SettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<StoreSettings>(storageService.getSettings());

  // Bank Account Modal State
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [bankName, setBankName] = useState('');
  const [accountTitle, setAccountTitle] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [iban, setIban] = useState('');
  const [branchName, setBranchName] = useState('');
  const [bankChannels, setBankChannels] = useState<POSChannel[]>(['Retail', 'Wholesale', 'Khata']);
  const [bankIsActive, setBankIsActive] = useState(true);

  const openAddBankModal = () => {
    setEditingBankId(null);
    setBankName('Meezan Bank Limited');
    setAccountTitle(settings.storeName ? `${settings.storeName.toUpperCase()} & TEXTILES` : 'AL-NOOR FABRICS');
    setAccountNumber('');
    setIban('');
    setBranchName('');
    setBankChannels(['Retail', 'Wholesale', 'Khata']);
    setBankIsActive(true);
    setIsBankModalOpen(true);
  };

  const openEditBankModal = (bank: BankAccount) => {
    setEditingBankId(bank.id);
    setBankName(bank.bankName);
    setAccountTitle(bank.accountTitle);
    setAccountNumber(bank.accountNumber);
    setIban(bank.iban || '');
    setBranchName(bank.branchName || '');
    setBankChannels(bank.channels && bank.channels.length > 0 ? bank.channels : ['Retail', 'Wholesale', 'Khata']);
    setBankIsActive(bank.isActive !== false);
    setIsBankModalOpen(true);
  };

  const handleSaveBankAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName.trim() || !accountTitle.trim() || !accountNumber.trim()) {
      toast({
        title: 'Missing Details',
        description: 'Please fill Bank Name, Account Title, and Account Number.',
        type: 'warning',
      });
      return;
    }

    if (bankChannels.length === 0) {
      toast({
        title: 'Select At Least One Channel',
        description: 'Please assign this bank account to Retail, Wholesale, or Khata POS.',
        type: 'warning',
      });
      return;
    }

    const currentBanks = settings.bankAccounts || [];
    let updatedBanks: BankAccount[];

    if (editingBankId) {
      updatedBanks = currentBanks.map(b =>
        b.id === editingBankId
          ? {
              ...b,
              bankName: bankName.trim(),
              accountTitle: accountTitle.trim(),
              accountNumber: accountNumber.trim(),
              iban: iban.trim(),
              branchName: branchName.trim() || undefined,
              channels: bankChannels,
              isActive: bankIsActive,
            }
          : b
      );
    } else {
      const newBank: BankAccount = {
        id: `bnk-${Date.now().toString().slice(-6)}`,
        bankName: bankName.trim(),
        accountTitle: accountTitle.trim(),
        accountNumber: accountNumber.trim(),
        iban: iban.trim(),
        branchName: branchName.trim() || undefined,
        channels: bankChannels,
        isActive: bankIsActive,
      };
      updatedBanks = [...currentBanks, newBank];
    }

    const updatedSettings: StoreSettings = {
      ...settings,
      bankAccounts: updatedBanks,
    };

    setSettings(updatedSettings);
    storageService.setSettings(updatedSettings);
    setIsBankModalOpen(false);

    toast({
      title: editingBankId ? 'Bank Account Updated' : 'Bank Account Added',
      description: `${bankName} assigned to ${bankChannels.join(', ')} channels.`,
      type: 'success',
    });
  };

  const handleDeleteBankAccount = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete bank account "${name}"?`)) {
      const updatedBanks = (settings.bankAccounts || []).filter(b => b.id !== id);
      const updatedSettings = {
        ...settings,
        bankAccounts: updatedBanks,
      };
      setSettings(updatedSettings);
      storageService.setSettings(updatedSettings);
      toast({
        title: 'Bank Account Deleted',
        description: `${name} was removed from Store Settings.`,
        type: 'info',
      });
    }
  };

  const handleToggleBankStatus = (id: string) => {
    const updatedBanks = (settings.bankAccounts || []).map(b =>
      b.id === id ? { ...b, isActive: !b.isActive } : b
    );
    const updatedSettings = {
      ...settings,
      bankAccounts: updatedBanks,
    };
    setSettings(updatedSettings);
    storageService.setSettings(updatedSettings);
    toast({
      title: 'Status Updated',
      description: 'Bank account active status has been toggled.',
      type: 'success',
    });
  };

  const toggleChannel = (channel: POSChannel) => {
    if (bankChannels.includes(channel)) {
      setBankChannels(bankChannels.filter(c => c !== channel));
    } else {
      setBankChannels([...bankChannels, channel]);
    }
  };

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

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Default Fabric Gender / Department (Add Fabric Default)
                    </label>
                    <Select
                      value={settings.defaultFabricGender || ''}
                      onChange={e => {
                        const val = e.target.value as 'Male' | 'Female' | 'Both' | '';
                        setSettings({
                          ...settings,
                          defaultFabricGender: val ? (val as 'Male' | 'Female' | 'Both') : undefined,
                        });
                      }}
                    >
                      <option value="">-- No Default Selected (Choose Male, Female or Both) --</option>
                      <option value="Male">👔 Male (Default to Men&apos;s Fabrics & Packaging)</option>
                      <option value="Female">👗 Female (Default to Women&apos;s Fabrics & Packaging)</option>
                      <option value="Both">👥 Both / All (Show Both Male & Female Fabrics & Packaging)</option>
                    </Select>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Choose which gender/department Add Fabric should default to, then click &quot;Save Store Preferences&quot; below to keep it saved permanently.
                    </span>
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

            {/* Bank Accounts & POS Channel Assignment */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Building className="w-4 h-4 text-emerald-600" /> Bank Accounts & POS Channel Assignment
                    </CardTitle>
                    <CardDescription>
                      Configure bank receiving accounts for online/IBFT transfers and assign them to Retail, Wholesale, or Khata POS counters.
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={openAddBankModal}
                    className="gap-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 self-start sm:self-auto cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add Bank Account
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {(!settings.bankAccounts || settings.bankAccounts.length === 0) ? (
                  <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs space-y-2">
                    <Building className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="font-semibold text-slate-700">No Bank Accounts Configured</p>
                    <p className="text-[11px] text-slate-500">
                      Click &quot;Add Bank Account&quot; to register your receiving accounts and assign them to POS settlement channels.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {settings.bankAccounts.map(b => {
                      const channels = b.channels && b.channels.length > 0 ? b.channels : ['Retail', 'Wholesale', 'Khata'];
                      return (
                        <div
                          key={b.id}
                          className={`p-3.5 rounded-xl border transition-all ${
                            b.isActive !== false
                              ? 'bg-white border-slate-200 shadow-2xs'
                              : 'bg-slate-50/70 border-slate-200 opacity-60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                                <Building className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>{b.bankName}</span>
                              </div>
                              <div className="text-[11px] text-slate-600 font-medium">
                                Title: <strong className="text-slate-800">{b.accountTitle}</strong>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditBankModal(b)}
                                className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit Bank Account"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteBankAccount(b.id, b.bankName)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete Bank Account"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 font-mono text-xs space-y-0.5 mb-2.5">
                            <div className="text-slate-800 font-bold select-all tracking-wide">
                              Acc: {b.accountNumber}
                            </div>
                            {b.iban && (
                              <div className="text-[10px] text-slate-500 truncate select-all">
                                IBAN: {b.iban}
                              </div>
                            )}
                          </div>

                          {/* Channel Badges */}
                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-slate-400 font-semibold mr-0.5">Assigned to:</span>
                              {channels.includes('Retail') && (
                                <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-200/60">
                                  Retail POS
                                </span>
                              )}
                              {channels.includes('Wholesale') && (
                                <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200/60">
                                  Wholesale POS
                                </span>
                              )}
                              {channels.includes('Khata') && (
                                <span className="bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-full border border-amber-200/60">
                                  Khata POS
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleBankStatus(b.id)}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer transition-colors ${
                                b.isActive !== false
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {b.isActive !== false ? 'Active' : 'Disabled'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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

          {/* Add / Edit Bank Account Modal */}
          <Modal
            isOpen={isBankModalOpen}
            onClose={() => setIsBankModalOpen(false)}
            title={editingBankId ? 'Edit Bank Account & POS Channels' : 'Add Bank Account & POS Channels'}
            maxWidth="lg"
          >
            <form onSubmit={handleSaveBankAccount} className="space-y-4">
              <datalist id="pakistan-banks">
                <option value="Meezan Bank Limited" />
                <option value="Habib Bank Limited (HBL)" />
                <option value="United Bank Limited (UBL)" />
                <option value="MCB Bank Limited" />
                <option value="Allied Bank Limited (ABL)" />
                <option value="Bank Alfalah" />
                <option value="Bank Al Habib" />
                <option value="Faysal Bank Limited" />
                <option value="Askari Bank Limited" />
                <option value="Standard Chartered Pakistan" />
                <option value="Dubai Islamic Bank" />
                <option value="National Bank of Pakistan (NBP)" />
                <option value="JS Bank" />
                <option value="Soneri Bank" />
              </datalist>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Bank Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    list="pakistan-banks"
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    placeholder="e.g. Meezan Bank Limited"
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Account Title / Beneficiary <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={accountTitle}
                    onChange={e => setAccountTitle(e.target.value)}
                    placeholder="e.g. AL-NOOR FABRICS & TEXTILES"
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Account Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={e => setAccountNumber(e.target.value)}
                    placeholder="e.g. 02010108920192"
                    className="w-full text-sm font-mono border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    IBAN (Optional)
                  </label>
                  <input
                    type="text"
                    value={iban}
                    onChange={e => setIban(e.target.value)}
                    placeholder="e.g. PK36MEZN0002010108920192"
                    className="w-full text-sm font-mono uppercase border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Branch Name / City (Optional)
                </label>
                <input
                  type="text"
                  value={branchName}
                  onChange={e => setBranchName(e.target.value)}
                  placeholder="e.g. Cloth Market Branch, Faisalabad"
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* POS Channel Routing */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-600" />
                    Target POS Channels (Assign where this account shows up)
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setBankChannels(['Retail', 'Wholesale', 'Khata'])}
                      className="text-[10px] bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 px-2 py-1 rounded font-semibold transition-colors"
                    >
                      All 3 Channels
                    </button>
                    <button
                      type="button"
                      onClick={() => setBankChannels(['Wholesale'])}
                      className="text-[10px] bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 px-2 py-1 rounded font-semibold transition-colors"
                    >
                      Wholesale Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setBankChannels(['Khata'])}
                      className="text-[10px] bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 px-2 py-1 rounded font-semibold transition-colors"
                    >
                      Khata Only
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Chunain ke yeh bank account Retail POS finalize mein aaye, Wholesale finalize mein aaye, ya Khata POS finalize mein aaye (ya teeno ya koi bhi 2 combination):
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                      bankChannels.includes('Retail')
                        ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100/60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={bankChannels.includes('Retail')}
                      onChange={e => {
                        if (e.target.checked) {
                          setBankChannels(prev => [...prev, 'Retail']);
                        } else {
                          setBankChannels(prev => prev.filter(c => c !== 'Retail'));
                        }
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <div className="text-left">
                      <div className="text-xs font-bold">Retail POS</div>
                      <div className="text-[10px] text-slate-500">Counter Sale Modal</div>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                      bankChannels.includes('Wholesale')
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100/60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={bankChannels.includes('Wholesale')}
                      onChange={e => {
                        if (e.target.checked) {
                          setBankChannels(prev => [...prev, 'Wholesale']);
                        } else {
                          setBankChannels(prev => prev.filter(c => c !== 'Wholesale'));
                        }
                      }}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <div className="text-left">
                      <div className="text-xs font-bold">Wholesale POS</div>
                      <div className="text-[10px] text-slate-500">Tax Invoice Modal</div>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                      bankChannels.includes('Khata')
                        ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100/60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={bankChannels.includes('Khata')}
                      onChange={e => {
                        if (e.target.checked) {
                          setBankChannels(prev => [...prev, 'Khata']);
                        } else {
                          setBankChannels(prev => prev.filter(c => c !== 'Khata'));
                        }
                      }}
                      className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                    />
                    <div className="text-left">
                      <div className="text-xs font-bold">Khata POS</div>
                      <div className="text-[10px] text-slate-500">Credit Bill Modal</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bankIsActive}
                    onChange={e => setBankIsActive(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Active bank account (Ready to receive payments)</span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsBankModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="font-bold gap-2">
                  <Check className="w-4 h-4" />
                  {editingBankId ? 'Update Bank Account' : 'Save Bank Account'}
                </Button>
              </div>
            </form>
          </Modal>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
