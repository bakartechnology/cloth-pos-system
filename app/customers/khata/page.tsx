'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { KhataStatementPrint } from '@/components/print/KhataStatementPrint';
import {
  BookOpen,
  Search,
  Printer,
  Plus,
  Building,
  Phone,
  MapPin,
  CheckCircle2,
  Banknote,
  Calendar,
  History,
  AlertTriangle,
} from 'lucide-react';
import { customersService } from '@/services/customersService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Customer, KhataTransaction, PaymentMethod } from '@/types';

export default function KhataLedgerPage() {
  const { currentStaff } = useAuth();
  const { toast } = useToast();

  const [khataCustomers, setKhataCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('cst-001');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'All' | 'Month' | 'Year'>('All');

  // Record Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Print Statement Modal State
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);

  useEffect(() => {
    const clients = customersService.getAll().filter(c => c.type === 'Khata' || c.creditLimit > 0);
    setKhataCustomers(clients);
    if (clients.length > 0) {
      setSelectedCustomerId(clients[0].id);
    }
  }, []);

  const selectedCustomer =
    khataCustomers.find(c => c.id === selectedCustomerId) || khataCustomers[0];

  const allTransactions = selectedCustomer
    ? customersService.getKhataTransactions(selectedCustomer.id)
    : [];

  const filteredTransactions = allTransactions.filter(t => {
    if (dateFilter === 'Month') {
      const currentMonth = new Date().toISOString().slice(0, 7);
      return t.date.startsWith(currentMonth);
    }
    if (dateFilter === 'Year') {
      const currentYear = new Date().getFullYear().toString();
      return t.date.startsWith(currentYear);
    }
    return true;
  });

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || paymentAmount <= 0 || !currentStaff) {
      toast({ title: 'Invalid Amount', description: 'Enter a valid payment amount.', type: 'error' });
      return;
    }

    const res = customersService.recordKhataPayment({
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      amount: paymentAmount,
      paymentMethod,
      staffId: currentStaff.id,
      staffName: currentStaff.name,
      notes: paymentNotes || 'Counter payment',
    });

    if (res) {
      toast({
        title: 'Payment Credited',
        description: `Rs. ${paymentAmount.toLocaleString()} received from ${selectedCustomer.name}. New balance: Rs. ${res.newBalance.toLocaleString()}`,
        type: 'success',
      });

      setIsPaymentModalOpen(false);
      setPaymentAmount(0);
      setPaymentNotes('');
      // Refresh
      const updatedClients = customersService.getAll().filter(c => c.type === 'Khata' || c.creditLimit > 0);
      setKhataCustomers(updatedClients);
    }
  };

  const filteredCustomers = khataCustomers.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    return !q || c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.businessName && c.businessName.toLowerCase().includes(q));
  });

  return (
    <ProtectedRoute permission="customers_view">
      <AppShell>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Khata Ledger Accounts & Customer Balances
                </h1>
                <p className="text-xs text-slate-500">
                  Manage individual credit statements, debit transactions, and payment clearances.
                </p>
              </div>
            </div>

            {selectedCustomer && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setIsStatementModalOpen(true)}
                  className="gap-2 font-semibold"
                >
                  <Printer className="w-4 h-4" /> Print Full Statement
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => {
                    setPaymentAmount(selectedCustomer.currentBalance);
                    setIsPaymentModalOpen(true);
                  }}
                  className="gap-2 font-bold bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                >
                  <Banknote className="w-4 h-4" /> Receive Payment
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Accounts List */}
            <Card className="p-4 flex flex-col h-[560px]">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Khata Account Holders ({filteredCustomers.length})
              </label>
              <div className="relative mb-3">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search account name, city, shop..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                {filteredCustomers.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCustomerId(c.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all text-xs ${
                      selectedCustomerId === c.id
                        ? 'bg-amber-50 border border-amber-300 text-amber-950 font-bold shadow-2xs'
                        : 'hover:bg-slate-50 border border-transparent text-slate-700'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="truncate font-bold">{c.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {c.businessName || c.city}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-black text-rose-600 text-xs">
                        Rs. {c.currentBalance.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400">Balance Due</div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            {/* Right: Selected Customer Ledger & Statement Details */}
            {selectedCustomer && (
              <div className="lg:col-span-2 space-y-6">
                {/* Account Summary Strip */}
                <Card className="p-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Account Title</span>
                      <div className="font-extrabold text-slate-900 text-sm mt-0.5">{selectedCustomer.name}</div>
                      <div className="text-xs text-slate-500">{selectedCustomer.phone}</div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Total Lifetime Sales</span>
                      <div className="font-bold text-slate-800 text-sm mt-0.5">
                        Rs. {selectedCustomer.totalPurchased.toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-500">Gross Debited</div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Total Paid / Cleared</span>
                      <div className="font-bold text-emerald-700 text-sm mt-0.5">
                        Rs. {selectedCustomer.totalPaid.toLocaleString()}
                      </div>
                      <div className="text-xs text-emerald-600">Total Credits</div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Current Balance Owed</span>
                      <div className="font-black text-rose-600 text-base mt-0.5">
                        Rs. {selectedCustomer.currentBalance.toLocaleString()}
                      </div>
                      <div className="text-xs text-rose-500">Net Due</div>
                    </div>
                  </div>

                  <div className="pt-3 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{selectedCustomer.address || 'Liberty Cloth Market'}, {selectedCustomer.city}</span>
                    </div>
                    <div>
                      Credit Limit: <span className="font-bold text-slate-800">Rs. {selectedCustomer.creditLimit.toLocaleString()}</span>
                    </div>
                  </div>
                </Card>

                {/* Ledger Transactions Table */}
                <Card className="overflow-hidden">
                  <CardHeader className="py-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Transaction Ledger
                      </CardTitle>
                    </div>

                    {/* Date filter selector */}
                    <div className="flex items-center p-0.5 bg-slate-100 rounded-lg text-xs font-semibold">
                      <button
                        onClick={() => setDateFilter('All')}
                        className={`px-2.5 py-1 rounded-md transition-colors ${
                          dateFilter === 'All' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
                        }`}
                      >
                        All Entries
                      </button>
                      <button
                        onClick={() => setDateFilter('Month')}
                        className={`px-2.5 py-1 rounded-md transition-colors ${
                          dateFilter === 'Month' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
                        }`}
                      >
                        This Month
                      </button>
                      <button
                        onClick={() => setDateFilter('Year')}
                        className={`px-2.5 py-1 rounded-md transition-colors ${
                          dateFilter === 'Year' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
                        }`}
                      >
                        This Year
                      </button>
                    </div>
                  </CardHeader>

                  <CardContent className="p-0">
                    <div className="overflow-x-auto max-h-80 overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-bold uppercase tracking-wider text-[11px] sticky top-0 bg-slate-50">
                            <th className="py-2.5 px-4">Date</th>
                            <th className="py-2.5 px-4">Ref / Invoice</th>
                            <th className="py-2.5 px-4">Description</th>
                            <th className="py-2.5 px-4 text-right">Debit (+)</th>
                            <th className="py-2.5 px-4 text-right">Credit (-)</th>
                            <th className="py-2.5 px-4 text-right">Running Balance</th>
                            <th className="py-2.5 px-4">Handled By</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredTransactions.map(tx => (
                            <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-2.5 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                                {new Date(tx.date).toLocaleDateString('en-PK', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </td>
                              <td className="py-2.5 px-4 font-mono font-semibold text-blue-600">
                                {tx.invoiceId || 'PAYMENT'}
                              </td>
                              <td className="py-2.5 px-4 text-slate-800 max-w-xs">{tx.description}</td>
                              <td className="py-2.5 px-4 text-right font-bold text-rose-600">
                                {tx.type === 'DEBIT' ? `Rs. ${tx.amount.toLocaleString()}` : '—'}
                              </td>
                              <td className="py-2.5 px-4 text-right font-bold text-emerald-600">
                                {tx.type === 'CREDIT' ? `Rs. ${tx.amount.toLocaleString()}` : '—'}
                              </td>
                              <td className="py-2.5 px-4 text-right font-black text-slate-900">
                                Rs. {tx.balanceAfter.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-4 text-slate-500">{tx.staffName}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Modal: Record Payment from Customer */}
        <Modal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          title={`Record Payment: ${selectedCustomer?.name || ''}`}
          description="Enter received payment amount to immediately decrease customer outstanding balance."
          maxWidth="md"
        >
          <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
              <span className="text-slate-600">Total Outstanding Balance:</span>
              <span className="font-black text-rose-600 text-sm">
                Rs. {selectedCustomer?.currentBalance.toLocaleString()}
              </span>
            </div>

            <div>
              <Input
                label="Amount Collected (Rs.) *"
                type="number"
                min="1"
                max={selectedCustomer?.currentBalance || 99999999}
                value={paymentAmount}
                onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            <div>
              <Select
                label="Payment Channel *"
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
              >
                <option value="Cash">Cash (Counter)</option>
                <option value="Bank Transfer">Bank Online Transfer / Raast</option>
                <option value="Card">POS Card Swipe</option>
                <option value="Other">Crossed Bank Cheque</option>
              </Select>
            </div>

            <div>
              <Input
                label="Receipt Reference / Remarks"
                placeholder="e.g. Cleared via HBL online reference # 99201"
                value={paymentNotes}
                onChange={e => setPaymentNotes(e.target.value)}
              />
            </div>

            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-800 text-[11px]">
              Remaining balance after this payment:{' '}
              <span className="font-bold">
                Rs. {Math.max(0, (selectedCustomer?.currentBalance || 0) - paymentAmount).toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" size="md" onClick={() => setIsPaymentModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md" className="gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle2 className="w-4 h-4" /> Save & Credit Ledger
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal: Khata Statement Print */}
        <Modal
          isOpen={isStatementModalOpen}
          onClose={() => setIsStatementModalOpen(false)}
          title="Print Customer Statement"
          maxWidth="4xl"
        >
          {selectedCustomer && (
            <KhataStatementPrint
              customer={selectedCustomer}
              transactions={filteredTransactions}
              dateRangeLabel={dateFilter === 'All' ? 'All Historical Records' : `Filter: ${dateFilter}`}
              onClose={() => setIsStatementModalOpen(false)}
            />
          )}
        </Modal>
      </AppShell>
    </ProtectedRoute>
  );
}
