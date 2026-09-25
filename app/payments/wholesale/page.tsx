'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import {
  Truck,
  Plus,
  Search,
  MapPin,
  CheckCircle2,
  Calendar,
  Building,
  Printer,
  Sparkles,
  Trash2,
  Clock,
  CreditCard,
  AlertCircle,
  Banknote,
  Receipt,
} from 'lucide-react';
import { paymentsService } from '@/services/paymentsService';
import { customersService } from '@/services/customersService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Customer, PaymentCollectionRecord, PaymentMethod, ChequeItem } from '@/types';

export default function WholesaleRecoveryPage() {
  const { currentStaff } = useAuth();
  const { toast } = useToast();

  const [collections, setCollections] = useState<PaymentCollectionRecord[]>([]);
  const [wholesaleClients, setWholesaleClients] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Record Collection Modal
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [collectionDate, setCollectionDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [cheques, setCheques] = useState<ChequeItem[]>([]);
  const [notes, setNotes] = useState('');
  const [receiptRecord, setReceiptRecord] = useState<PaymentCollectionRecord | null>(null);

  useEffect(() => {
    setCollections(paymentsService.getCollectionsByType('Wholesale'));
    // Filter specifically for Wholesale business clients
    const clients = customersService.getAll().filter(c => c.type === 'Wholesale' || c.businessName);
    setWholesaleClients(clients);
    if (clients.length > 0) {
      setSelectedClientId(clients[0].id);
    }
  }, []);

  const selectedClient = wholesaleClients.find(c => c.id === selectedClientId);

  // Dynamic automatic totals
  const totalCash = Math.max(0, cashAmount);
  const totalChequeAmount = cheques.reduce((sum, c) => sum + (Number(c.chequeAmount) || 0), 0);
  const grandTotal = totalCash + totalChequeAmount;

  const handleAddCheque = () => {
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    setCheques(prev => [
      ...prev,
      {
        id: `chq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        chequeAmount: 0,
        clearingDate: nextWeek,
        chequeNumber: '',
        bankName: '',
        status: 'Pending',
      },
    ]);
  };

  const handleRemoveCheque = (id: string) => {
    setCheques(prev => prev.filter(c => c.id !== id));
  };

  const handleUpdateCheque = (id: string, field: keyof ChequeItem, val: any) => {
    setCheques(prev => prev.map(c => (c.id === id ? { ...c, [field]: val } : c)));
  };

  const handleMarkChequePassed = (colId: string, chqId: string) => {
    paymentsService.updateChequeStatus(colId, chqId, 'Passed');
    setCollections(paymentsService.getCollectionsByType('Wholesale'));
    toast({
      title: 'Cheque Marked as Passed',
      description: 'Wholesale cheque status updated to Passed. Future due notifications stopped.',
      type: 'success',
    });
  };

  const handleSaveCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || grandTotal <= 0 || !currentStaff) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid cash or cheque payment amount greater than zero.',
        type: 'error',
      });
      return;
    }

    if (selectedClient.currentBalance > 0 && grandTotal > selectedClient.currentBalance) {
      toast({
        title: 'Amount Exceeds Balance',
        description: `Total collection (Rs. ${grandTotal.toLocaleString()}) exceeds client ledger balance of Rs. ${selectedClient.currentBalance.toLocaleString()}.`,
        type: 'warning',
      });
      return;
    }

    // Validate individual cheques
    for (let i = 0; i < cheques.length; i++) {
      const chq = cheques[i];
      if (!chq.chequeAmount || chq.chequeAmount <= 0) {
        toast({
          title: 'Invalid Cheque Amount',
          description: `Cheque #${i + 1} must have a valid positive amount.`,
          type: 'error',
        });
        return;
      }
      if (!chq.clearingDate) {
        toast({
          title: 'Passing Date Required',
          description: `Cheque #${i + 1} requires a scheduled clearing/pass date.`,
          type: 'error',
        });
        return;
      }
    }

    const effectivePaymentMethod: PaymentMethod =
      cheques.length > 0 ? (totalCash > 0 ? 'Other' : 'Cheque') : 'Cash';

    const record = paymentsService.recordCollection({
      customerId: selectedClient.id,
      staffId: currentStaff.id,
      staffName: currentStaff.name,
      amountCollected: grandTotal,
      cashAmount: totalCash,
      chequeAmount: totalChequeAmount,
      cheques: cheques.length > 0 ? cheques : undefined,
      paymentMethod: effectivePaymentMethod,
      date: new Date(collectionDate).toISOString(),
      notes: notes || (cheques.length > 0 ? `Wholesale recovery (${cheques.length} cheques + cash)` : 'Cash wholesale recovery'),
      collectionType: 'Wholesale',
      clientId: selectedClient.id,
      clientName: selectedClient.businessName || selectedClient.name,
      chequeDetails:
        cheques.length > 0
          ? {
              chequeCount: cheques.length,
              chequeAmount: totalChequeAmount,
              clearingDate: cheques[0].clearingDate,
              chequeNumber: cheques.map(c => c.chequeNumber).filter(Boolean).join(', ') || undefined,
              bankName: cheques.map(c => c.bankName).filter(Boolean).join(', ') || undefined,
            }
          : undefined,
    });

    if (record) {
      setReceiptRecord(record);
      toast({
        title: 'Wholesale Collection Saved',
        description: `Receipt #${record.receiptNumber}: Rs. ${grandTotal.toLocaleString()} credited to ${selectedClient.businessName || selectedClient.name}.`,
        type: 'success',
      });

      setIsRecordModalOpen(false);
      setCashAmount(0);
      setCheques([]);
      setNotes('');
      setCollections(paymentsService.getCollectionsByType('Wholesale'));
      setWholesaleClients(customersService.getAll().filter(c => c.type === 'Wholesale' || c.businessName));
    }
  };

  const filteredCollections = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return collections;
    return collections.filter(c => {
      return (
        c.receiptNumber.toLowerCase().includes(q) ||
        c.customerName.toLowerCase().includes(q) ||
        (c.clientName && c.clientName.toLowerCase().includes(q)) ||
        (c.customerCity && c.customerCity.toLowerCase().includes(q)) ||
        c.staffName.toLowerCase().includes(q)
      );
    });
  }, [collections, searchQuery]);

  const totalCollected = useMemo(() => {
    return collections.reduce((sum, c) => sum + c.amountCollected, 0);
  }, [collections]);

  return (
    <ProtectedRoute permission="wholesale_recovery">
      <AppShell>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1 rounded bg-cyan-50 text-cyan-700 font-mono text-[10px] font-bold uppercase">
                  Wholesale Finance
                </span>
                <span className="text-xs text-slate-500 font-medium">Wholesale Client Recovery & Cheques</span>
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <Truck className="w-5 h-5 text-cyan-600" />
                Wholesale Recovery
              </h1>
              <p className="text-xs text-slate-500">
                Payment collection desk specifically for Wholesale Clients, supporting cash and multi-cheque tracking.
              </p>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={() => {
                if (selectedClient) {
                  setCashAmount(Math.min(50000, selectedClient.currentBalance));
                }
                setIsRecordModalOpen(true);
              }}
              className="gap-2 font-bold bg-cyan-600 hover:bg-cyan-700 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Record Wholesale Client Collection
            </Button>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Wholesale Recovered
              </span>
              <div className="text-2xl font-black text-cyan-600 mt-1">
                Rs. {totalCollected.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-1">From registered wholesale business clients</div>
            </Card>

            <Card className="p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Registered Wholesale Clients
              </span>
              <div className="text-lg font-bold text-slate-900 mt-1">
                {wholesaleClients.length} Clients
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Active wholesale accounts in CRM
              </div>
            </Card>

            <Card className="p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Recovery Officer / Staff
              </span>
              <div className="text-lg font-bold text-slate-900 mt-1">
                {currentStaff?.name || 'Administrator'}
              </div>
              <div className="text-xs text-slate-500 mt-1">Counter: {currentStaff?.counter || 'Head Office'}</div>
            </Card>
          </div>

          {/* Search Strip */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search by receipt #, client, business, city, officer..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Showing <strong>{filteredCollections.length}</strong> wholesale collection record(s)
            </div>
          </div>

          {/* Collections Table */}
          <Card className="overflow-hidden border-slate-200/80 shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3.5">Receipt #</th>
                    <th className="px-4 py-3.5">Date</th>
                    <th className="px-4 py-3.5">Wholesale Client</th>
                    <th className="px-4 py-3.5">City</th>
                    <th className="px-4 py-3.5">Cash Amount</th>
                    <th className="px-4 py-3.5">Cheques Info</th>
                    <th className="px-4 py-3.5 font-black text-slate-900">Total Collected</th>
                    <th className="px-4 py-3.5">Remaining Balance</th>
                    <th className="px-4 py-3.5">Officer</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCollections.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12 text-slate-400">
                        <Truck className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                        <p className="font-semibold text-sm text-slate-600">No wholesale collections found</p>
                        <p className="text-xs mt-1">Click &quot;Record Wholesale Client Collection&quot; to log payments from wholesale buyers.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredCollections.map(col => {
                      const hasCheques = col.cheques && col.cheques.length > 0;
                      return (
                        <tr key={col.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-cyan-800">
                            {col.receiptNumber}
                          </td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            {new Date(col.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900">
                              {col.clientName || col.customerName}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Contact: {col.customerName} • {col.customerPhone}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {col.customerCity || 'N/A'}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-slate-900">
                            Rs. {(col.cashAmount || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            {hasCheques ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px] border border-amber-200">
                                  <Clock className="w-3 h-3" /> {col.cheques!.length} Cheque(s)
                                </span>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  Total: Rs. {(col.chequeAmount || 0).toLocaleString()}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">None (Cash Only)</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono font-black text-cyan-800 text-sm">
                            Rs. {col.amountCollected.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-700">
                            Rs. {col.newBalance.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {col.staffName}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setReceiptRecord(col)}
                              className="gap-1 text-[11px] h-7 px-2"
                            >
                              <Receipt className="w-3 h-3" /> View Receipt
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* MODAL: Record Wholesale Collection */}
          <Modal
            isOpen={isRecordModalOpen}
            onClose={() => setIsRecordModalOpen(false)}
            title="Record Wholesale Client Collection"
            description="Collect cash and cheques from registered wholesale business clients."
            maxWidth="2xl"
          >
            <form onSubmit={handleSaveCollection} className="space-y-4 text-xs">
              {/* Client Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Select Wholesale Client Account *
                </label>
                <select
                  value={selectedClientId}
                  onChange={e => {
                    setSelectedClientId(e.target.value);
                    const c = wholesaleClients.find(x => x.id === e.target.value);
                    if (c) {
                      setCashAmount(Math.min(50000, c.currentBalance));
                    }
                  }}
                  className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  {wholesaleClients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.businessName ? `${c.businessName} (${c.name})` : c.name} — Balance: Rs. {c.currentBalance.toLocaleString()} ({c.city})
                    </option>
                  ))}
                </select>
              </div>

              {/* Client Balance Snapshot */}
              {selectedClient && (
                <div className="p-3 rounded-xl bg-cyan-50/70 border border-cyan-200 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Current Ledger Debt</span>
                    <span className="font-mono font-black text-rose-700 text-sm">
                      Rs. {selectedClient.currentBalance.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">This Collection</span>
                    <span className="font-mono font-black text-cyan-800 text-sm">
                      Rs. {grandTotal.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Projected Balance</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      Rs. {Math.max(0, selectedClient.currentBalance - grandTotal).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Collection Date *
                </label>
                <input
                  type="date"
                  value={collectionDate}
                  onChange={e => setCollectionDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                  required
                />
              </div>

              {/* Cash Component */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Banknote className="w-4 h-4 text-emerald-600" /> Cash Received
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-mono">Rs.</span>
                    <input
                      type="number"
                      min="0"
                      value={cashAmount || ''}
                      placeholder="0"
                      onChange={e => setCashAmount(parseFloat(e.target.value) || 0)}
                      className="w-36 h-8 px-2 text-right border border-slate-300 rounded-lg text-xs font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* Multiple Cheques Component */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-cyan-600" /> Cheques Collected ({cheques.length})
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddCheque}
                    className="gap-1 text-xs h-7 border-cyan-300 text-cyan-800 hover:bg-cyan-50"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Cheque Entry
                  </Button>
                </div>

                {cheques.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">
                    No cheques added. If client gave cheques, click &quot;Add Cheque Entry&quot;.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {cheques.map((chq, idx) => (
                      <div
                        key={chq.id}
                        className="p-2.5 rounded-lg bg-white border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                      >
                        <div className="sm:col-span-1 text-[11px] font-bold text-slate-400">
                          #{idx + 1}
                        </div>
                        <div className="sm:col-span-3">
                          <label className="text-[10px] text-slate-400 block">Cheque #</label>
                          <input
                            type="text"
                            placeholder="e.g. 984012"
                            value={chq.chequeNumber || ''}
                            onChange={e => handleUpdateCheque(chq.id, 'chequeNumber', e.target.value)}
                            className="w-full h-7 px-2 border border-slate-200 rounded text-xs font-mono"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <label className="text-[10px] text-slate-400 block">Bank Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Meezan Bank"
                            value={chq.bankName || ''}
                            onChange={e => handleUpdateCheque(chq.id, 'bankName', e.target.value)}
                            className="w-full h-7 px-2 border border-slate-200 rounded text-xs"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-[10px] text-slate-400 block">Passing Date</label>
                          <input
                            type="date"
                            value={chq.clearingDate}
                            onChange={e => handleUpdateCheque(chq.id, 'clearingDate', e.target.value)}
                            className="w-full h-7 px-1.5 border border-slate-200 rounded text-xs font-mono"
                            required
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-[10px] text-slate-400 block">Amount (Rs.)</label>
                          <input
                            type="number"
                            min="1"
                            placeholder="0"
                            value={chq.chequeAmount || ''}
                            onChange={e =>
                              handleUpdateCheque(chq.id, 'chequeAmount', parseFloat(e.target.value) || 0)
                            }
                            className="w-full h-7 px-2 text-right border border-slate-200 rounded text-xs font-mono font-bold text-cyan-800"
                            required
                          />
                        </div>
                        <div className="sm:col-span-1 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveCheque(chq.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded"
                            title="Remove cheque"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes / Outstation Destination / Order Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. Received at Faisalabad Warehouse, Cheque clearance authorized by Mr. Tariq"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {/* Grand Total Summary */}
              <div className="p-3 rounded-xl bg-cyan-900 text-white flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-cyan-200 uppercase font-bold tracking-wider block">
                    Total Wholesale Recovery
                  </span>
                  <div className="text-xl font-black font-mono mt-0.5">
                    Rs. {grandTotal.toLocaleString()}
                  </div>
                </div>
                <div className="text-right text-[11px] text-cyan-200">
                  <div>Cash: Rs. {totalCash.toLocaleString()}</div>
                  <div>Cheques: Rs. {totalChequeAmount.toLocaleString()}</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <Button type="button" variant="outline" size="md" onClick={() => setIsRecordModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={grandTotal <= 0}
                  className="gap-2 font-bold bg-cyan-600 hover:bg-cyan-700"
                >
                  <CheckCircle2 className="w-4 h-4" /> Save Wholesale Collection
                </Button>
              </div>
            </form>
          </Modal>

          {/* MODAL: View Wholesale Receipt */}
          <Modal
            isOpen={!!receiptRecord}
            onClose={() => setReceiptRecord(null)}
            title="Wholesale Client Recovery Receipt"
            maxWidth="md"
          >
            {receiptRecord && (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Receipt #</span>
                      <div className="font-mono font-black text-cyan-800 text-sm">
                        {receiptRecord.receiptNumber}
                      </div>
                    </div>
                    <Badge variant="outline" className="font-mono">
                      {new Date(receiptRecord.date).toLocaleDateString()}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Wholesale Client:</span>
                      <strong className="text-slate-900">{receiptRecord.clientName || receiptRecord.customerName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Contact Person:</span>
                      <strong className="text-slate-900">{receiptRecord.customerName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">City:</span>
                      <span className="text-slate-700">{receiptRecord.customerCity || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Recovery Officer:</span>
                      <span className="text-slate-700">{receiptRecord.staffName}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 space-y-1">
                    <div className="flex justify-between text-slate-600">
                      <span>Cash Tendered:</span>
                      <span className="font-mono font-bold">Rs. {(receiptRecord.cashAmount || 0).toLocaleString()}</span>
                    </div>
                    {receiptRecord.cheques && receiptRecord.cheques.length > 0 && (
                      <div className="flex justify-between text-cyan-800">
                        <span>Cheques ({receiptRecord.cheques.length}):</span>
                        <span className="font-mono font-bold">Rs. {(receiptRecord.chequeAmount || 0).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
                      <span>Total Credited:</span>
                      <span className="text-cyan-800 font-mono">Rs. {receiptRecord.amountCollected.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                      <span>New Ledger Balance:</span>
                      <span className="font-mono font-bold text-slate-800">Rs. {receiptRecord.newBalance.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Cheque List if any */}
                {receiptRecord.cheques && receiptRecord.cheques.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="font-bold text-slate-700 text-xs">Cheque Entries & Due Dates:</span>
                    {receiptRecord.cheques.map(c => (
                      <div key={c.id} className="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900">
                            {c.bankName || 'Cheque'} #{c.chequeNumber || 'N/A'}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Pass Date: <strong>{c.clearingDate}</strong>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-slate-900">
                            Rs. {c.chequeAmount.toLocaleString()}
                          </div>
                          <Badge
                            size="sm"
                            variant={c.status === 'Passed' ? 'default' : 'secondary'}
                            className="text-[9px]"
                          >
                            {c.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setReceiptRecord(null)}>
                    Close
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      if (typeof window !== 'undefined') window.print();
                    }}
                    className="gap-1.5 bg-cyan-600 hover:bg-cyan-700"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print Receipt
                  </Button>
                </div>
              </div>
            )}
          </Modal>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
