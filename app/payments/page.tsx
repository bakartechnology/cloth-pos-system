'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import {
  Banknote,
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
} from 'lucide-react';
import { paymentsService } from '@/services/paymentsService';
import { customersService } from '@/services/customersService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Customer, PaymentCollectionRecord, PaymentMethod, ChequeItem } from '@/types';

export default function PaymentCollectionPage() {
  const { currentStaff } = useAuth();
  const { toast } = useToast();

  const [collections, setCollections] = useState<PaymentCollectionRecord[]>([]);
  const [khataCustomers, setKhataCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Record Collection Modal
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [collectionDate, setCollectionDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [cheques, setCheques] = useState<ChequeItem[]>([]);
  const [notes, setNotes] = useState('');
  const [receiptRecord, setReceiptRecord] = useState<PaymentCollectionRecord | null>(null);

  useEffect(() => {
    setCollections(paymentsService.getCollectionsByType('Khata'));
    const clients = customersService.getAll().filter(c => c.type === 'Khata' || c.currentBalance > 0);
    setKhataCustomers(clients);
    if (clients.length > 0) {
      setSelectedCustomerId(clients[0].id);
    }
  }, []);

  const selectedCustomer = khataCustomers.find(c => c.id === selectedCustomerId);

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
    setCollections(paymentsService.getCollectionsByType('Khata'));
    toast({
      title: 'Cheque Marked as Passed',
      description: 'The cheque status has been updated to Passed. Future due notifications stopped.',
      type: 'success',
    });
  };

  const handleSaveCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || grandTotal <= 0 || !currentStaff) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid cash or cheque payment amount greater than zero.',
        type: 'error',
      });
      return;
    }

    if (grandTotal > selectedCustomer.currentBalance) {
      toast({
        title: 'Amount Exceeds Balance',
        description: `Total collection (Rs. ${grandTotal.toLocaleString()}) exceeds customer balance of Rs. ${selectedCustomer.currentBalance.toLocaleString()}.`,
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
      customerId: selectedCustomer.id,
      staffId: currentStaff.id,
      staffName: currentStaff.name,
      amountCollected: grandTotal,
      cashAmount: totalCash,
      chequeAmount: totalChequeAmount,
      cheques: cheques.length > 0 ? cheques : undefined,
      paymentMethod: effectivePaymentMethod,
      date: new Date(collectionDate).toISOString(),
      notes: notes || (cheques.length > 0 ? `Field collection (${cheques.length} cheques + cash)` : 'Cash field recovery'),
      collectionType: 'Khata',
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
        title: 'Collection Saved & Ledger Reconciled',
        description: `Receipt #${record.receiptNumber}: Rs. ${grandTotal.toLocaleString()} credited. New customer balance: Rs. ${record.newBalance.toLocaleString()}`,
        type: 'success',
      });

      setIsRecordModalOpen(false);
      setCashAmount(0);
      setCheques([]);
      setNotes('');
      setCollections(paymentsService.getCollectionsByType('Khata'));
      setKhataCustomers(customersService.getAll().filter(c => c.type === 'Khata' || c.currentBalance > 0));
    }
  };

  const filteredCollections = collections.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    return (
      !q ||
      c.customerName.toLowerCase().includes(q) ||
      c.receiptNumber.toLowerCase().includes(q) ||
      c.customerCity.toLowerCase().includes(q) ||
      c.staffName.toLowerCase().includes(q)
    );
  });

  const totalCollected = collections.reduce((sum, c) => sum + c.amountCollected, 0);

  return (
    <ProtectedRoute permission="payment_collection">
      <AppShell>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1 rounded bg-emerald-50 text-emerald-700 font-mono text-[10px] font-bold uppercase">
                  Field Finance
                </span>
                <span className="text-xs text-slate-500 font-medium">Outstation Client Recovery</span>
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Payment Collection & Field Recovery
              </h1>
              <p className="text-xs text-slate-500">
                Authorized field recovery desk for recording outstation client payments and auto-reducing Khata balances.
              </p>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={() => {
                if (selectedCustomer) {
                  setCashAmount(Math.min(20000, selectedCustomer.currentBalance));
                }
                setIsRecordModalOpen(true);
              }}
              className="gap-2 font-bold bg-emerald-600 hover:bg-emerald-700 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Record Khata Field Collection
            </Button>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Collections Recorded
              </span>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                Rs. {totalCollected.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-1">Across all field recovery officers</div>
            </Card>

            <Card className="p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Logged Recovery Officer
              </span>
              <div className="text-lg font-bold text-slate-900 mt-1">
                {currentStaff?.name || 'Rashid Khan'}
              </div>
              <div className="text-xs text-cyan-600 font-semibold mt-0.5">
                Role: {currentStaff?.role}
              </div>
            </Card>

            <Card className="p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Active Outstation Routes
              </span>
              <div className="text-lg font-bold text-slate-900 mt-1">
                Faisalabad, Gujranwala, Gujrat & Multan
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Automated balance deductions enabled</div>
            </Card>
          </div>

          {/* Collection Audit Trail Table */}
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold">Field Collection Receipts History</CardTitle>
                <CardDescription>Verified recovery transactions mapped to client accounts.</CardDescription>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search receipt #, customer, city, staff..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none"
                />
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Receipt #</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Customer & City</th>
                      <th className="py-3 px-4 text-right">Previous Balance</th>
                      <th className="py-3 px-4 text-right text-emerald-700">Amount Collected</th>
                      <th className="py-3 px-4 text-right">New Balance</th>
                      <th className="py-3 px-4">Channel</th>
                      <th className="py-3 px-4">Recovery Staff</th>
                      <th className="py-3 px-4">Field Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCollections.map(col => (
                      <tr key={col.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-600 whitespace-nowrap">
                          {col.receiptNumber}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                          {new Date(col.date).toLocaleDateString('en-PK', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{col.customerName}</div>
                          <div className="text-[10px] text-slate-500">{col.customerCity}</div>
                        </td>

                        <td className="py-3 px-4 text-right font-medium text-slate-600">
                          Rs. {col.previousBalance.toLocaleString()}
                        </td>

                        <td className="py-3 px-4 text-right font-black text-emerald-700 text-sm">
                          Rs. {col.amountCollected.toLocaleString()}
                        </td>

                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          Rs. {col.newBalance.toLocaleString()}
                        </td>

                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <Badge
                              size="sm"
                              variant={
                                col.cheques && col.cheques.length > 0
                                  ? col.cashAmount && col.cashAmount > 0
                                    ? 'cyan'
                                    : 'warning'
                                  : 'secondary'
                              }
                            >
                              {col.cheques && col.cheques.length > 0
                                ? col.cashAmount && col.cashAmount > 0
                                  ? 'Cash + Cheque'
                                  : 'Cheque'
                                : col.paymentMethod}
                            </Badge>

                            {col.cashAmount !== undefined && col.cashAmount > 0 && (
                              <div className="text-[10px] text-slate-500 font-mono">
                                Cash: Rs. {col.cashAmount.toLocaleString()}
                              </div>
                            )}

                            {col.cheques && col.cheques.length > 0 && (
                              <div className="space-y-1 mt-1">
                                {col.cheques.map((chq, idx) => (
                                  <div
                                    key={chq.id || idx}
                                    className="text-[10px] p-1.5 rounded bg-amber-50 border border-amber-200 text-amber-900 space-y-0.5"
                                  >
                                    <div className="flex items-center justify-between font-bold">
                                      <span>
                                        Chq #{idx + 1}: Rs. {chq.chequeAmount.toLocaleString()}
                                      </span>
                                      <span
                                        className={`px-1 py-0.2 rounded text-[9px] ${
                                          chq.status === 'Passed'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : 'bg-amber-100 text-amber-800'
                                        }`}
                                      >
                                        {chq.status || 'Pending'}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between text-[9px] text-slate-500">
                                      <span>Pass: {chq.clearingDate}</span>
                                      {chq.status !== 'Passed' && (
                                        <button
                                          type="button"
                                          onClick={() => handleMarkChequePassed(col.id, chq.id)}
                                          className="text-blue-700 hover:text-blue-900 font-bold underline cursor-pointer"
                                          title="Mark this cheque as cleared/passed"
                                        >
                                          ✓ Mark Passed
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {!col.cheques && col.chequeDetails && (
                              <div className="text-[10px] text-amber-700 font-mono mt-0.5">
                                {col.chequeDetails.chequeCount} Cheque(s) | Pass: {col.chequeDetails.clearingDate}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-slate-800 font-medium whitespace-nowrap">
                          {col.staffName}
                        </td>

                        <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                          {col.notes || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modal: Record Field Collection */}
        <Modal
          isOpen={isRecordModalOpen}
          onClose={() => setIsRecordModalOpen(false)}
          title="Record Field Payment Collection"
          description="Record collection from outstation Khata customer. Support multiple cheques, cash, and pass dates."
          maxWidth="lg"
        >
          <form onSubmit={handleSaveCollection} className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Select Customer Account *
              </label>
              <select
                value={selectedCustomerId}
                onChange={e => {
                  setSelectedCustomerId(e.target.value);
                  const c = khataCustomers.find(cust => cust.id === e.target.value);
                  if (c) {
                    setCashAmount(Math.min(20000, c.currentBalance));
                  }
                }}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {khataCustomers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.businessName || c.city}) — Balance: Rs. {c.currentBalance.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            {selectedCustomer && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Previous Balance</span>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">
                    Rs. {selectedCustomer.currentBalance.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Collecting (Grand Total)</span>
                  <div className="font-bold text-emerald-700 text-sm mt-0.5">
                    Rs. {grandTotal.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">New Balance Owed</span>
                  <div className="font-black text-blue-600 text-sm mt-0.5">
                    Rs. {Math.max(0, selectedCustomer.currentBalance - grandTotal).toLocaleString()}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Collection Date *
                </label>
                <input
                  type="date"
                  value={collectionDate}
                  onChange={e => setCollectionDate(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <Input
                  label="Cash Payment Amount (Rs.)"
                  type="number"
                  min="0"
                  max={selectedCustomer?.currentBalance || 99999999}
                  value={cashAmount}
                  onChange={e => setCashAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Multiple Cheque Entries Section */}
            <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-slate-800 text-xs">
                    Cheque Payment Details ({cheques.length})
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddCheque}
                  className="gap-1 text-xs font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Cheque (+)
                </Button>
              </div>

              {cheques.length === 0 ? (
                <div className="p-4 border border-dashed border-slate-200 rounded-lg text-center text-slate-400 text-xs">
                  No cheque entries added yet. If customer paid via cheque(s), click{' '}
                  <span className="font-semibold text-emerald-600">"Add Cheque (+)"</span> above.
                </div>
              ) : (
                <div className="space-y-3">
                  {cheques.map((chq, index) => (
                    <div
                      key={chq.id}
                      className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs space-y-2.5 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px]">
                            {index + 1}
                          </span>
                          Cheque #{index + 1} Details
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCheque(chq.id)}
                          className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 transition-colors"
                          title="Remove cheque"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <Input
                            label="Cheque Amount (Rs.) *"
                            type="number"
                            min="1"
                            value={chq.chequeAmount || ''}
                            onChange={e =>
                              handleUpdateCheque(chq.id, 'chequeAmount', parseFloat(e.target.value) || 0)
                            }
                            placeholder="e.g. 25000"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Cheque Passing / Clearing Date *
                          </label>
                          <input
                            type="date"
                            value={chq.clearingDate}
                            onChange={e => handleUpdateCheque(chq.id, 'clearingDate', e.target.value)}
                            className="w-full h-10 px-3 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <Input
                            label="Cheque Number (Optional)"
                            placeholder="e.g. CHQ-984021"
                            value={chq.chequeNumber || ''}
                            onChange={e => handleUpdateCheque(chq.id, 'chequeNumber', e.target.value)}
                          />
                        </div>
                        <div>
                          <Input
                            label="Issuing Bank (Optional)"
                            placeholder="e.g. Meezan Bank / HBL / MCB"
                            value={chq.bankName || ''}
                            onChange={e => handleUpdateCheque(chq.id, 'bankName', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Clear Payment Summary Box */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5 text-xs">
              <div className="font-bold text-emerald-900 flex items-center justify-between">
                <span>Payment Summary</span>
                <span className="text-[10px] text-emerald-700 font-mono">Auto-Calculated</span>
              </div>
              <div className="flex justify-between text-slate-600 text-[11px]">
                <span>Cash Total:</span>
                <span className="font-mono font-bold text-slate-900">Rs. {totalCash.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600 text-[11px]">
                <span>Total Cheque Amount:</span>
                <span className="font-mono font-bold text-slate-900">
                  Rs. {totalChequeAmount.toLocaleString()} ({cheques.length} Cheque{cheques.length === 1 ? '' : 's'})
                </span>
              </div>
              <div className="flex justify-between text-emerald-900 font-bold text-sm pt-1 border-t border-emerald-200">
                <span>Grand Total (Credited to Khata):</span>
                <span className="font-mono text-emerald-700">Rs. {grandTotal.toLocaleString()}</span>
              </div>
            </div>

            <div>
              <Input
                label="Field Visit Notes / Location"
                placeholder="e.g. Collected at Gujranwala shop; issued receipt # 482"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" size="md" onClick={() => setIsRecordModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle2 className="w-4 h-4" /> Save Collection & Reconcile (Rs. {grandTotal.toLocaleString()})
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal: Receipt Stamped Printable Slip */}
        <Modal
          isOpen={!!receiptRecord}
          onClose={() => setReceiptRecord(null)}
          title="Payment Collection Receipt"
          maxWidth="md"
        >
          {receiptRecord && (
            <div className="space-y-4 text-xs font-mono">
              <div
                id="printable-payment-receipt"
                className="printable-area p-4 border border-dashed border-slate-300 rounded-xl bg-slate-50/50 space-y-2 text-slate-900 print:border-none print:p-2"
              >
                <div className="text-center pb-2 border-b border-dashed border-slate-300">
                  <h3 className="font-bold text-sm">AL-NOOR FABRICS</h3>
                  <p className="text-[10px] text-slate-500">Official Field Recovery Voucher</p>
                  <div className="text-[11px] font-bold text-blue-600 mt-1">
                    {receiptRecord.receiptNumber}
                  </div>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span>{new Date(receiptRecord.date).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold">{receiptRecord.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">City:</span>
                  <span>{receiptRecord.customerCity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Mode:</span>
                  <span className="font-semibold">{receiptRecord.paymentMethod}</span>
                </div>

                {receiptRecord.cashAmount !== undefined && receiptRecord.cashAmount > 0 && (
                  <div className="flex justify-between text-slate-700">
                    <span>Cash Payment:</span>
                    <span className="font-bold">Rs. {receiptRecord.cashAmount.toLocaleString()}</span>
                  </div>
                )}

                {receiptRecord.cheques && receiptRecord.cheques.length > 0 && (
                  <div className="bg-amber-50 p-2 rounded border border-amber-200 text-[11px] space-y-1.5">
                    <div className="font-bold text-amber-900 border-b border-amber-200/60 pb-0.5">
                      Cheques Received ({receiptRecord.cheques.length})
                    </div>
                    {receiptRecord.cheques.map((chq, i) => (
                      <div key={chq.id || i} className="flex justify-between text-amber-950 text-[10px]">
                        <span>
                          Cheque #{i + 1} {chq.chequeNumber ? `(${chq.chequeNumber})` : ''} - Pass: {chq.clearingDate}
                        </span>
                        <span className="font-bold">Rs. {chq.chequeAmount.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-bold text-amber-900 pt-1 border-t border-amber-200/60">
                      <span>Total Cheque Amount:</span>
                      <span>Rs. {(receiptRecord.chequeAmount || 0).toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-slate-500">Collector Staff:</span>
                  <span>{receiptRecord.staffName}</span>
                </div>
                <div className="border-t border-dashed border-slate-300 pt-2 flex justify-between font-bold text-sm">
                  <span>Grand Total Credited:</span>
                  <span className="text-emerald-700">Rs. {receiptRecord.amountCollected.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Remaining Khata Balance:</span>
                  <span>Rs. {receiptRecord.newBalance.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 no-print">
                <Button variant="outline" size="sm" onClick={() => setReceiptRecord(null)}>
                  Done
                </Button>
                <Button variant="primary" size="sm" onClick={() => window.print()} className="gap-1.5">
                  <Printer className="w-4 h-4" /> Print Slip
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </AppShell>
    </ProtectedRoute>
  );
}
