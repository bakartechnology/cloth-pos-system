'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import {
  Truck,
  Plus,
  Search,
  UserCheck,
  Phone,
  MapPin,
  FileText,
  Edit,
  Trash2,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Pandi } from '@/types';
import { pandisService } from '@/services/pandisService';
import { useToast } from '@/context/ToastContext';

function PandiManagementContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [pandis, setPandis] = useState<Pandi[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [transportFilter, setTransportFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPandi, setEditingPandi] = useState<Pandi | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCnic, setFormCnic] = useState('');
  const [formTransport, setFormTransport] = useState<Pandi['transportMode']>('Rehri / Handcart');
  const [formMarketZone, setFormMarketZone] = useState('Liberty Cloth Market');
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive'>('Active');
  const [formNotes, setFormNotes] = useState('');

  const refreshPandis = () => {
    setPandis(pandisService.getAll());
  };

  useEffect(() => {
    refreshPandis();
    if (searchParams.get('action') === 'add') {
      openAddModal();
    }
  }, [searchParams]);

  const openAddModal = () => {
    setEditingPandi(null);
    setFormName('');
    setFormPhone('');
    setFormCnic('');
    setFormTransport('Rehri / Handcart');
    setFormMarketZone('Liberty Cloth Market');
    setFormStatus('Active');
    setFormNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (pandi: Pandi) => {
    setEditingPandi(pandi);
    setFormName(pandi.name);
    setFormPhone(pandi.phone || '');
    setFormCnic(pandi.cnic || '');
    setFormTransport(pandi.transportMode);
    setFormMarketZone(pandi.marketZone || 'Liberty Cloth Market');
    setFormStatus(pandi.status);
    setFormNotes(pandi.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter the Pandi Name.',
        type: 'error',
      });
      return;
    }

    if (editingPandi) {
      pandisService.update(editingPandi.id, {
        name: formName.trim(),
        phone: formPhone.trim(),
        cnic: formCnic.trim(),
        transportMode: formTransport,
        marketZone: formMarketZone.trim(),
        status: formStatus,
        notes: formNotes.trim(),
      });
      toast({
        title: 'Pandi Updated',
        description: `${formName} has been updated successfully.`,
        type: 'success',
      });
    } else {
      pandisService.add({
        name: formName.trim(),
        phone: formPhone.trim(),
        cnic: formCnic.trim(),
        transportMode: formTransport,
        marketZone: formMarketZone.trim(),
        status: formStatus,
        notes: formNotes.trim(),
        totalTrips: 0,
      });
      toast({
        title: 'Pandi Registered',
        description: `${formName} has been registered successfully.`,
        type: 'success',
      });
    }

    setIsModalOpen(false);
    refreshPandis();
  };

  const handleDelete = (pandi: Pandi) => {
    if (window.confirm(`Are you sure you want to remove ${pandi.name}?`)) {
      pandisService.delete(pandi.id);
      toast({
        title: 'Pandi Removed',
        description: `${pandi.name} has been removed.`,
        type: 'warning',
      });
      refreshPandis();
    }
  };

  const toggleStatus = (pandi: Pandi) => {
    const newStatus = pandi.status === 'Active' ? 'Inactive' : 'Active';
    pandisService.update(pandi.id, { status: newStatus });
    refreshPandis();
    toast({
      title: 'Status Updated',
      description: `${pandi.name} is now ${newStatus}.`,
      type: 'info',
    });
  };

  // Metrics
  const stats = useMemo(() => {
    const total = pandis.length;
    const active = pandis.filter(p => p.status === 'Active').length;
    const totalTrips = pandis.reduce((sum, p) => sum + (p.totalTrips || 0), 0);

    const todayStr = new Date().toISOString().split('T')[0];
    let todayOrdersCount = 0;
    pandis.forEach(p => {
      const orders = pandisService.getPandiOrders(p.name, { date: todayStr });
      todayOrdersCount += orders.length;
    });

    return { total, active, totalTrips, todayOrdersCount };
  }, [pandis]);

  // Filtered List
  const filteredPandis = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return pandis.filter(p => {
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.phone && p.phone.includes(q)) ||
        (p.cnic && p.cnic.includes(q)) ||
        (p.marketZone && p.marketZone.toLowerCase().includes(q));

      const matchTransport = transportFilter === 'All' || p.transportMode === transportFilter;
      const matchStatus = statusFilter === 'All' || p.status === statusFilter;

      return matchSearch && matchTransport && matchStatus;
    });
  }, [pandis, searchQuery, transportFilter, statusFilter]);

  return (
    <ProtectedRoute permission="wholesale_statement_view">
      <AppShell>
        <div className="space-y-6 max-w-[1700px] mx-auto select-none pb-12">
          {/* TOP HEADER */}
          <div className="bg-white rounded-2xl border border-[#DCE3E0] p-5 shadow-2xs flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#DCEDE6] text-[#125E45] flex items-center justify-center shadow-inner">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black text-[#17211D] tracking-tight">
                    Pandi Management & Porters
                  </h1>
                  <span className="text-[11px] font-bold text-[#197A5A] bg-[#E9F3EF] border border-[#197A5A]/20 px-2 py-0.5 rounded-full">
                    Active Registry
                  </span>
                </div>
                <p className="text-xs text-[#66726D] mt-0.5">
                  Register porters, delivery loaders, handcarts, and track daily parcel deliveries.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/statements/pandi">
                <Button variant="outline" size="md" className="gap-2 border-[#DCE3E0] text-[#17211D]">
                  <FileText className="w-4 h-4 text-[#197A5A]" />
                  <span>Pandi Statement</span>
                </Button>
              </Link>
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex items-center justify-center font-bold rounded-xl px-4 py-2.5 text-xs text-white bg-[#125E45] hover:bg-[#197A5A] active:scale-[0.98] transition-all shadow-2xs cursor-pointer gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Pandi</span>
              </button>
            </div>
          </div>

          {/* TOP METRIC CARDS - Using exact palette */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1 */}
            <div className="bg-white rounded-2xl border border-[#DCE3E0] p-4 shadow-2xs hover:border-[#197A5A] transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#66726D] uppercase tracking-wider">Registered Pandis</span>
                <span className="p-2 rounded-xl bg-[#F0F4F2] text-[#17211D]">
                  <UserCheck className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-[#17211D] mt-2">{stats.total}</div>
              <div className="text-[11px] text-[#66726D] mt-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#16835B]"></span>
                <span>{stats.active} Active Porters</span>
              </div>
            </div>

            {/* Card 2 - Today Orders Highlight */}
            <div className="bg-[#E9F3EF] rounded-2xl border border-[#197A5A]/30 p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#125E45] uppercase tracking-wider">Today&apos;s Dispatches</span>
                <span className="p-2 rounded-xl bg-[#DCEDE6] text-[#125E45]">
                  <Calendar className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-[#125E45] mt-2">{stats.todayOrdersCount} Orders</div>
              <div className="text-[11px] text-[#197A5A] mt-1 font-semibold">
                Today&apos;s total dispatched orders
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-2xl border border-[#DCE3E0] p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#66726D] uppercase tracking-wider">Lifetime Deliveries</span>
                <span className="p-2 rounded-xl bg-[#F7EEDC] text-[#9A6A16]">
                  <Truck className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-[#17211D] mt-2">{stats.totalTrips} Trips</div>
              <div className="text-[11px] text-[#66726D] mt-1">Total recorded shop & cargo dispatches</div>
            </div>

            {/* Card 4 - Quick Action to Statement */}
            <div className="bg-white rounded-2xl border border-[#DCE3E0] p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-[#66726D] uppercase tracking-wider">Delivery Statements</span>
                <p className="text-xs text-[#17211D] font-bold mt-1">View Daily, Monthly & Yearly Reports</p>
              </div>
              <Link
                href="/statements/pandi"
                className="mt-2 inline-flex items-center justify-between text-xs font-bold text-[#125E45] hover:text-[#197A5A] pt-2 border-t border-[#DCE3E0]"
              >
                <span>Open Statement</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* FILTER & SEARCH BAR */}
          <div className="bg-white rounded-2xl border border-[#DCE3E0] p-4 shadow-2xs flex items-center justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-[260px] relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A9590]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by Pandi name, phone number, CNIC, or market zone..."
                className="w-full pl-9 pr-4 py-2 border border-[#DCE3E0] rounded-xl text-xs bg-white text-[#17211D] placeholder:text-[#8A9590] focus:outline-none focus:ring-2 focus:ring-[#197A5A]"
              />
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Transport Filter */}
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-[#66726D]">Transport:</span>
                <select
                  value={transportFilter}
                  onChange={e => setTransportFilter(e.target.value)}
                  className="px-3 py-1.5 border border-[#DCE3E0] rounded-xl text-xs bg-white text-[#17211D] focus:outline-none focus:ring-1 focus:ring-[#197A5A]"
                >
                  <option value="All">All Types</option>
                  <option value="Rehri / Handcart">Rehri / Handcart</option>
                  <option value="Loader Rickshaw">Loader Rickshaw</option>
                  <option value="Motorcycle">Motorcycle</option>
                  <option value="On Foot">On Foot</option>
                  <option value="Cargo / Builty">Cargo / Builty</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-[#66726D]">Status:</span>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                  className="px-3 py-1.5 border border-[#DCE3E0] rounded-xl text-xs bg-white text-[#17211D] focus:outline-none focus:ring-1 focus:ring-[#197A5A]"
                >
                  <option value="All">All Status</option>
                  <option value="Active">Active Only</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* PANDIS TABLE */}
          <div className="bg-white rounded-2xl border border-[#DCE3E0] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#DCE3E0] bg-[#F0F4F2] text-[#66726D] font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Pandi Name & Contact</th>
                    <th className="py-3 px-4">Transport Mode</th>
                    <th className="py-3 px-4">Market Zone / Territory</th>
                    <th className="py-3 px-4 text-center">Today&apos;s Orders</th>
                    <th className="py-3 px-4 text-center">Total Trips</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE3E0]">
                  {filteredPandis.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-[#66726D]">
                        <Truck className="w-10 h-10 mx-auto text-[#8A9590] mb-2 opacity-60" />
                        <p className="font-bold text-[#17211D]">No Pandis Found</p>
                        <p className="text-[11px] text-[#8A9590] mt-0.5">
                          Try adjusting your search criteria or register a new Pandi.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredPandis.map(pandi => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      const todayOrders = pandisService.getPandiOrders(pandi.name, { date: todayStr });

                      return (
                        <tr key={pandi.id} className="hover:bg-[#F0F4F2]/50 transition-colors">
                          {/* Name & Phone */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-[#DCEDE6] text-[#125E45] font-black flex items-center justify-center shrink-0">
                                {pandi.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-[#17211D] text-xs leading-snug">
                                  {pandi.name}
                                </div>
                                <div className="text-[11px] text-[#66726D] flex items-center gap-2 mt-0.5 font-mono">
                                  {pandi.phone && <span>📞 {pandi.phone}</span>}
                                  {pandi.cnic && <span className="text-[#8A9590]">| CNIC: {pandi.cnic}</span>}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Transport Mode */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#F7EEDC] text-[#9A6A16] border border-[#9A6A16]/20">
                              <Truck className="w-3.5 h-3.5" />
                              <span>{pandi.transportMode}</span>
                            </span>
                          </td>

                          {/* Market Zone */}
                          <td className="py-3.5 px-4 text-[#66726D]">
                            <div className="flex items-center gap-1 text-xs">
                              <MapPin className="w-3.5 h-3.5 text-[#197A5A] shrink-0" />
                              <span className="truncate max-w-[200px]">{pandi.marketZone || 'Liberty Market'}</span>
                            </div>
                          </td>

                          {/* Today's Orders */}
                          <td className="py-3.5 px-4 text-center">
                            <Link href={`/statements/pandi?pandi=${encodeURIComponent(pandi.name)}&period=Today`}>
                              <span
                                className={`inline-block px-3 py-1 rounded-lg font-black text-xs transition-colors cursor-pointer ${
                                  todayOrders.length > 0
                                    ? 'bg-[#16835B] text-white hover:bg-[#125E45]'
                                    : 'bg-[#DCE3E0]/50 text-[#66726D] hover:bg-[#DCE3E0]'
                                }`}
                              >
                                {todayOrders.length} {todayOrders.length === 1 ? 'Order' : 'Orders'}
                              </span>
                            </Link>
                          </td>

                          {/* Total Trips */}
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-[#17211D]">
                            {pandi.totalTrips || 0}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => toggleStatus(pandi)}
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
                                pandi.status === 'Active'
                                  ? 'bg-[#DCEDE6] text-[#16835B] hover:bg-[#16835B] hover:text-white'
                                  : 'bg-[#F0F4F2] text-[#8A9590] hover:bg-[#8A9590] hover:text-white'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  pandi.status === 'Active' ? 'bg-[#16835B]' : 'bg-[#8A9590]'
                                }`}
                              ></span>
                              <span>{pandi.status}</span>
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link href={`/statements/pandi?pandi=${encodeURIComponent(pandi.name)}`}>
                                <button
                                  type="button"
                                  className="p-1.5 rounded-lg border border-[#DCE3E0] text-[#125E45] hover:bg-[#E9F3EF] transition-colors"
                                  title="View Pandi Statement"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                              </Link>
                              <button
                                type="button"
                                onClick={() => openEditModal(pandi)}
                                className="p-1.5 rounded-lg border border-[#DCE3E0] text-[#657084] hover:bg-[#F0F4F2] transition-colors"
                                title="Edit Pandi"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(pandi)}
                                className="p-1.5 rounded-lg border border-[#DCE3E0] text-[#C23D45] hover:bg-rose-50 transition-colors"
                                title="Delete Pandi"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* MODAL: ADD / EDIT PANDI */}
          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title={editingPandi ? 'Edit Pandi Details' : 'Register New Pandi'}
            maxWidth="md"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#17211D] mb-1">
                  Pandi Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Muhammad Akram, Rashid Loader..."
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#DCE3E0] rounded-xl text-xs bg-white text-[#17211D] focus:outline-none focus:ring-2 focus:ring-[#197A5A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#17211D] mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="0300-1234567"
                    value={formPhone}
                    onChange={e => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-[#DCE3E0] rounded-xl text-xs bg-white text-[#17211D] focus:outline-none focus:ring-2 focus:ring-[#197A5A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#17211D] mb-1">
                    CNIC / ID Card #
                  </label>
                  <input
                    type="text"
                    placeholder="35201-1234567-1"
                    value={formCnic}
                    onChange={e => setFormCnic(e.target.value)}
                    className="w-full px-3 py-2 border border-[#DCE3E0] rounded-xl text-xs bg-white text-[#17211D] focus:outline-none focus:ring-2 focus:ring-[#197A5A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#17211D] mb-1">
                    Transport Mode
                  </label>
                  <select
                    value={formTransport}
                    onChange={e => setFormTransport(e.target.value as Pandi['transportMode'])}
                    className="w-full px-3 py-2 border border-[#DCE3E0] rounded-xl text-xs bg-white text-[#17211D] focus:outline-none focus:ring-2 focus:ring-[#197A5A]"
                  >
                    <option value="Rehri / Handcart">Rehri / Handcart</option>
                    <option value="Loader Rickshaw">Loader Rickshaw</option>
                    <option value="Motorcycle">Motorcycle</option>
                    <option value="On Foot">On Foot / Cart</option>
                    <option value="Cargo / Builty">Cargo / Builty</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#17211D] mb-1">
                    Account Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as 'Active' | 'Inactive')}
                    className="w-full px-3 py-2 border border-[#DCE3E0] rounded-xl text-xs bg-white text-[#17211D] focus:outline-none focus:ring-2 focus:ring-[#197A5A]"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17211D] mb-1">
                  Market Zone / Area
                </label>
                <input
                  type="text"
                  placeholder="e.g. Liberty Cloth Market, Azam Cloth Market, Ichhra..."
                  value={formMarketZone}
                  onChange={e => setFormMarketZone(e.target.value)}
                  className="w-full px-3 py-2 border border-[#DCE3E0] rounded-xl text-xs bg-white text-[#17211D] focus:outline-none focus:ring-2 focus:ring-[#197A5A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17211D] mb-1">
                  Notes / References
                </label>
                <textarea
                  rows={2}
                  placeholder="Any additional dispatch or emergency contact notes..."
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-[#DCE3E0] rounded-xl text-xs bg-white text-[#17211D] focus:outline-none focus:ring-2 focus:ring-[#197A5A]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DCE3E0]">
                <Button variant="outline" size="md" type="button" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center font-bold rounded-xl px-5 py-2.5 text-xs text-white bg-[#125E45] hover:bg-[#197A5A] active:scale-[0.98] transition-all shadow-2xs cursor-pointer gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingPandi ? 'Save Changes' : 'Register Pandi'}</span>
                </button>
              </div>
            </form>
          </Modal>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}

export default function PandiManagementPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAF9] flex items-center justify-center text-xs font-semibold text-[#8A9590]">
          Loading Pandi Management...
        </div>
      }
    >
      <PandiManagementContent />
    </Suspense>
  );
}
