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
} from 'lucide-react';
import { paymentsService } from '@/services/paymentsService';
import { customersService } from '@/services/customersService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Customer, PaymentCollectionRecord, PaymentMethod } from '@/types';

export default function PaymentCollectionPage() {
  const { currentStaff } = useAuth();
  const { toast } = useToast();

  const [collections, setCollections] = useState<PaymentCollectionRecord[]>([]);
  const [khataCustomers, setKhataCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Record Collection Modal
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [amountCollected, setAmountCollected] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [notes, setNotes] = useState('');
  const [receiptRecord, setReceiptRecord] = useState<PaymentCollectionRecord | null>(null);

  useEffect(() => {
    setCollections(paymentsService.getAllCollections());
    const clients = customersService.getAll().filter(c => c.type === 'Khata' || c.currentBalance > 0);
    setKhataCustomers(clients);
    if (clients.length > 0) {
      setSelectedCustomerId(clients[0].id);
    }
  }, []);

  const selectedCustomer = khataCustomers.find(c => c.id === selectedCustomerId);

  const handleSaveCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || amountCollected <= 0 || !currentStaff) {
      toast({ title: 'Validation Error', description: 'Please specify a valid collection amount.', type: 'error' });
      return;
    }

    if (amountCollected > selectedCustomer.currentBalance) {
      toast({
        title: 'Amount Exceeds Balance',
        description: `Customer only owes Rs. ${selectedCustomer.currentBalance.toLocaleString()}.`,
        type: 'warning',
      });
      return;
    }

    const record = paymentsService.recordCollection({
      customerId: selectedCustomer.id,
      staffId: currentStaff.id,
      staffName: currentStaff.name,
      amountCollected,
      paymentMethod,
      notes: notes || 'Field recovery visit',
    });

    if (record) {
      setReceiptRecord(record);
      toast({
        title: 'Collection Saved & Ledger Reconciled',
        description: `Receipt #${record.receiptNumber}: Rs. ${amountCollected.toLocaleString()} credited. New customer balance: Rs. ${record.newBalance.toLocaleString()}`,
        type: 'success',
      });

      setIsRecordModalOpen(false);
      setAmountCollected(0);
      setNotes('');
      setCollections(paymentsService.getAllCollections());
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
                  setAmountCollected(Math.min(20000, selectedCustomer.currentBalance));
                }
                setIsRecordModalOpen(true);
              }}
              className="gap-2 font-bold bg-emerald-600 hover:bg-emerald-700 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Record New Field Collection
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
                          <Badge size="sm" variant="secondary">
                            {col.paymentMethod}
                          </Badge>
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
          description="Record collection from outstation Khata customer. Balance will deduct automatically."
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
                    setAmountCollected(Math.min(20000, c.currentBalance));
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
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Collecting Now</span>
                  <div className="font-bold text-emerald-700 text-sm mt-0.5">
                    Rs. {amountCollected.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">New Balance Owed</span>
                  <div className="font-black text-blue-600 text-sm mt-0.5">
                    Rs. {Math.max(0, selectedCustomer.currentBalance - amountCollected).toLocaleString()}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Input
                  label="Amount Collected (Rs.) *"
                  type="number"
                  min="1"
                  max={selectedCustomer?.currentBalance || 99999999}
                  value={amountCollected}
                  onChange={e => setAmountCollected(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>

              <div>
                <Select
                  label="Payment Method *"
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                >
                  <option value="Cash">Cash (Collected on site)</option>
                  <option value="Bank Transfer">Online Transfer / Raast</option>
                  <option value="Other">Crossed Cheque</option>
                </Select>
              </div>
            </div>

            <div>
              <Input
                label="Field Visit Notes / Location / Cheque #"
                placeholder="e.g. Collected at Gujranwala shop; issued receipt # 482"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" size="md" onClick={() => setIsRecordModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md" className="gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle2 className="w-4 h-4" /> Save Collection & Reconcile
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
              <div className="p-4 border border-dashed border-slate-300 rounded-xl bg-slate-50/50 space-y-2 text-slate-900">
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
                  <span className="text-slate-500">Collector:</span>
                  <span>{receiptRecord.staffName}</span>
                </div>
                <div className="border-t border-dashed border-slate-300 pt-2 flex justify-between font-bold text-sm">
                  <span>Amount Collected:</span>
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
