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
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Users,
  Plus,
  Search,
  BookOpen,
  Phone,
  MapPin,
  Building,
  CheckCircle2,
  ArrowRight,
  Printer,
} from 'lucide-react';
import Link from 'next/link';
import { customersService } from '@/services/customersService';
import { useToast } from '@/context/ToastContext';
import { Customer, CustomerType } from '@/types';

export default function CustomersCRMPage() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | CustomerType>('All');

  // Add Customer Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCity, setNewCity] = useState('Lahore');
  const [newType, setNewType] = useState<CustomerType>('Retail');
  const [newBusiness, setNewBusiness] = useState('');
  const [newCreditLimit, setNewCreditLimit] = useState<number>(100000);

  useEffect(() => {
    setCustomers(customersService.getAll());
  }, []);

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast({ title: 'Validation Error', description: 'Customer name is required.', type: 'error' });
      return;
    }

    const created = customersService.add({
      name: newName,
      phone: newPhone || '+92 300 0000000',
      address: newAddress || 'Local Area',
      city: newCity || 'Lahore',
      type: newType,
      businessName: newBusiness || undefined,
      creditLimit: newType === 'Khata' ? newCreditLimit : 0,
    });

    toast({
      title: 'Customer Registered',
      description: `${created.name} (${created.type}) has been added to the system.`,
      type: 'success',
    });

    setCustomers(customersService.getAll());
    setIsAddModalOpen(false);
    setNewName('');
    setNewPhone('');
    setNewAddress('');
    setNewBusiness('');
  };

  const filteredCustomers = customers.filter(c => {
    const matchesType = typeFilter === 'All' || c.type === typeFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.city.toLowerCase().includes(q) ||
      (c.businessName && c.businessName.toLowerCase().includes(q));
    return matchesType && matchesQuery;
  });

  const totalOutstanding = customers.reduce((sum, c) => sum + c.currentBalance, 0);

  return (
    <ProtectedRoute permission="customers_view">
      <AppShell>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1 rounded bg-blue-50 text-blue-700 font-mono text-[10px] font-bold uppercase">
                  CRM Directory
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {customers.length} registered customers & businesses
                </span>
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Customer Relations & Khata Accounts
              </h1>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsAddModalOpen(true)}
                className="gap-2 font-bold shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add New Customer
              </Button>
            </div>
          </div>

          {/* CRM KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Receivables Owed
              </span>
              <div className="text-2xl font-black text-rose-600 mt-1">
                Rs. {totalOutstanding.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Across {customers.filter(c => c.currentBalance > 0).length} active khata credit ledgers
              </div>
            </Card>

            <Card className="p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Wholesale Textile Hubs
              </span>
              <div className="text-2xl font-black text-cyan-600 mt-1">
                {customers.filter(c => c.type === 'Wholesale').length} Clients
              </div>
              <div className="text-xs text-slate-500 mt-1">Karachi, Faisalabad, Peshawar & Quetta</div>
            </Card>

            <Card className="p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Khata Credit Accounts
              </span>
              <div className="text-2xl font-black text-amber-600 mt-1">
                {customers.filter(c => c.type === 'Khata').length} Accounts
              </div>
              <div className="text-xs text-slate-500 mt-1">Approved for flexible credit billing</div>
            </Card>
          </div>

          {/* Filter Bar */}
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search customer name, phone, city, business..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Type Filter Buttons */}
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                {(['All', 'Khata', 'Wholesale', 'Retail'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      typeFilter === t
                        ? 'bg-slate-900 text-white shadow-2xs font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {t === 'All' ? 'All Accounts' : t}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Customer Table */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {filteredCustomers.length === 0 ? (
                <EmptyState
                  icon={<Users className="w-8 h-8 text-slate-400" />}
                  title="No customers found"
                  description="No matching clients found for your active filter."
                  className="m-6 border-none"
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">Customer / Business Name</th>
                        <th className="py-3 px-4">Contact & Location</th>
                        <th className="py-3 px-4">Account Type</th>
                        <th className="py-3 px-4 text-right">Credit Limit</th>
                        <th className="py-3 px-4 text-right">Total Lifetime Purchases</th>
                        <th className="py-3 px-4 text-right">Current Balance Owed</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCustomers.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 max-w-xs">
                            <div className="font-bold text-slate-900 leading-tight">{c.name}</div>
                            {c.businessName && (
                              <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                                <Building className="w-3 h-3 text-slate-400 shrink-0" />
                                {c.businessName}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-mono text-slate-700">{c.phone}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              {c.city}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <Badge
                              size="sm"
                              variant={
                                c.type === 'Khata' ? 'warning' : c.type === 'Wholesale' ? 'cyan' : 'secondary'
                              }
                            >
                              {c.type}
                            </Badge>
                          </td>

                          <td className="py-3 px-4 text-right font-mono text-slate-600">
                            {c.creditLimit > 0 ? `Rs. ${c.creditLimit.toLocaleString()}` : '—'}
                          </td>

                          <td className="py-3 px-4 text-right font-semibold text-slate-900">
                            Rs. {c.totalPurchased.toLocaleString()}
                          </td>

                          <td className="py-3 px-4 text-right font-black text-xs">
                            {c.currentBalance > 0 ? (
                              <span className="text-rose-600">
                                Rs. {c.currentBalance.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-emerald-600 font-semibold">Cleared</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            {c.type === 'Khata' ? (
                              <Link href={`/customers/khata?id=${c.id}`}>
                                <Button size="sm" variant="outline" className="gap-1 text-[11px] h-7">
                                  <BookOpen className="w-3 h-3" /> Ledger
                                </Button>
                              </Link>
                            ) : (
                              <span className="text-slate-400 text-[11px]">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Modal: Add Customer Form */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Register New Customer"
          description="Create a client record for Retail walk-ins, Wholesale traders, or Khata credit accounts."
          maxWidth="lg"
        >
          <form onSubmit={handleAddCustomer} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Input
                  label="Customer Full Name *"
                  placeholder="e.g. Haji Ghulam Rasool"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  required
                />
              </div>

              <div>
                <Input
                  label="Phone / Mobile Number *"
                  placeholder="e.g. +92 300 1234567"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  required
                />
              </div>

              <div>
                <Input
                  label="City *"
                  placeholder="e.g. Lahore or Faisalabad"
                  value={newCity}
                  onChange={e => setNewCity(e.target.value)}
                  required
                />
              </div>

              <div>
                <Select
                  label="Account Type *"
                  value={newType}
                  onChange={e => setNewType(e.target.value as CustomerType)}
                >
                  <option value="Retail">Retail Customer (Cash / Walk-in)</option>
                  <option value="Wholesale">Wholesale Trader (Commercial B2B)</option>
                  <option value="Khata">Khata Customer (Ledger Credit Account)</option>
                </Select>
              </div>

              <div>
                <Input
                  label="Shop / Business Name (Optional)"
                  placeholder="e.g. Rasool Cloth Emporium"
                  value={newBusiness}
                  onChange={e => setNewBusiness(e.target.value)}
                />
              </div>

              {newType === 'Khata' && (
                <div className="sm:col-span-2">
                  <Input
                    label="Approved Khata Credit Ceiling (Rs.) *"
                    type="number"
                    min="10000"
                    step="10000"
                    value={newCreditLimit}
                    onChange={e => setNewCreditLimit(parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
              )}

              <div className="sm:col-span-2">
                <Input
                  label="Market Address"
                  placeholder="e.g. Shop # 45, Azam Cloth Market"
                  value={newAddress}
                  onChange={e => setNewAddress(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" size="md" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md" className="gap-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4" /> Save Customer Record
              </Button>
            </div>
          </form>
        </Modal>
      </AppShell>
    </ProtectedRoute>
  );
}
