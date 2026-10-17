'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  Truck,
  Calendar,
  Search,
  Printer,
  ChevronRight,
  ChevronDown,
  Building,
  User,
  Phone,
  MapPin,
  Receipt,
  FileText,
  Clock,
  ArrowRight,
  CheckCircle2,
  Package,
  Layers,
  Sparkles,
  X,
  ExternalLink,
} from 'lucide-react';
import { Pandi, Bill } from '@/types';
import { pandisService } from '@/services/pandisService';
import { storageService } from '@/services/storageService';
import { WholesaleInvoicePrint } from '@/components/print/WholesaleInvoicePrint';

function PandiStatementContent() {
  const searchParams = useSearchParams();
  const printContainerRef = useRef<HTMLDivElement>(null);

  const [pandis, setPandis] = useState<Pandi[]>([]);
  const [allBills, setAllBills] = useState<Bill[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Timeframe Filter: 'Today' | 'Day' | 'Month' | 'Year' | 'All'
  const [periodType, setPeriodType] = useState<'Today' | 'Day' | 'Month' | 'Year' | 'All'>('Today');
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedYear, setSelectedYear] = useState<string>(() => new Date().getFullYear().toString());

  // Selected Pandi for Detail Drilldown (Modal or expanded card)
  const [selectedPandi, setSelectedPandi] = useState<Pandi | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Invoice Preview Modal
  const [billToView, setBillToView] = useState<Bill | null>(null);
  const [isInvoicePreviewOpen, setIsInvoicePreviewOpen] = useState(false);

  useEffect(() => {
    const list = pandisService.getAll();
    setPandis(list);
    setAllBills(storageService.getBills());

    // Check query params if directed from another page
    const initialPandiName = searchParams.get('pandi');
    const initialPeriod = searchParams.get('period');
    if (initialPeriod === 'Today' || initialPeriod === 'Day' || initialPeriod === 'Month' || initialPeriod === 'Year') {
      setPeriodType(initialPeriod);
    }
    if (initialPandiName) {
      const match = list.find(p => p.name.toLowerCase() === initialPandiName.toLowerCase());
      if (match) {
        setSelectedPandi(match);
        setIsDetailModalOpen(true);
      }
    }
  }, [searchParams]);

  // Compute active date filter object
  const activeFilters = useMemo(() => {
    if (periodType === 'Today') {
      return { date: new Date().toISOString().split('T')[0] };
    }
    if (periodType === 'Day') {
      return { date: selectedDate };
    }
    if (periodType === 'Month') {
      return { month: selectedMonth };
    }
    if (periodType === 'Year') {
      return { year: selectedYear };
    }
    return {};
  }, [periodType, selectedDate, selectedMonth, selectedYear]);

  // Calculate stats for all Pandis based on current filter
  const pandiSummaries = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    return pandis.map(pandi => {
      const metrics = pandisService.getPandiMetrics(pandi, activeFilters);
      // Today orders always calculated regardless of active filter
      const todayOrders = pandisService.getPandiOrders(pandi.name, { date: todayStr });

      return {
        pandi,
        todayCount: todayOrders.length,
        periodCount: metrics.periodCount,
        periodAmount: metrics.periodAmount,
        clientsCount: metrics.uniqueClientsCount,
        clientsList: metrics.clientsList,
        orders: metrics.orders,
      };
    });
  }, [pandis, activeFilters]);

  // Filtered Pandis based on search query
  const filteredSummaries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return pandiSummaries;

    return pandiSummaries.filter(item => {
      const p = item.pandi;
      const matchesPandi =
        p.name.toLowerCase().includes(q) ||
        (p.phone && p.phone.includes(q)) ||
        (p.marketZone && p.marketZone.toLowerCase().includes(q));

      // Also allow searching by client/customer name or invoice #
      const matchesClientOrOrder = item.orders.some(
        b =>
          (b.clientName && b.clientName.toLowerCase().includes(q)) ||
          (b.customerName && b.customerName.toLowerCase().includes(q)) ||
          b.invoiceNumber.toLowerCase().includes(q)
      );

      return matchesPandi || matchesClientOrOrder;
    });
  }, [pandiSummaries, searchQuery]);

  // Grand totals across all Pandis
  const overallTotals = useMemo(() => {
    const totalTodayOrders = pandiSummaries.reduce((sum, item) => sum + item.todayCount, 0);
    const totalPeriodOrders = pandiSummaries.reduce((sum, item) => sum + item.periodCount, 0);
    const totalPeriodAmount = pandiSummaries.reduce((sum, item) => sum + item.periodAmount, 0);
    const activePandis = pandiSummaries.filter(item => item.periodCount > 0).length;

    return { totalTodayOrders, totalPeriodOrders, totalPeriodAmount, activePandis };
  }, [pandiSummaries]);

  // Active orders for currently selected pandi in detail modal
  const activePandiDetail = useMemo(() => {
    if (!selectedPandi) return null;
    return pandiSummaries.find(item => item.pandi.id === selectedPandi.id) || null;
  }, [selectedPandi, pandiSummaries]);

  const handleOpenDetail = (pandi: Pandi) => {
    setSelectedPandi(pandi);
    setIsDetailModalOpen(true);
  };

  const handlePrintStatement = () => {
    window.print();
  };

  return (
    <ProtectedRoute permission="pandi_view">
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
                    Pandi Dispatch Statement
                  </h1>
                  <span className="text-[11px] font-bold text-[#197A5A] bg-[#E9F3EF] border border-[#197A5A]/20 px-2 py-0.5 rounded-full">
                    Dispatches Report
                  </span>
                </div>
                <p className="text-xs text-[#66726D] mt-0.5">
                  Track daily, monthly, and yearly cloth deliveries and inspect clients associated with each porter.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePrintStatement}
                className="inline-flex items-center justify-center font-bold rounded-xl px-4 py-2.5 text-xs text-[#17211D] bg-[#F0F4F2] hover:bg-[#DCE3E0] border border-[#DCE3E0] transition-all cursor-pointer gap-2"
              >
                <Printer className="w-4 h-4 text-[#197A5A]" />
                <span>Print Statement</span>
              </button>

              <Link href="/pandi?action=add">
                <button
                  type="button"
                  className="inline-flex items-center justify-center font-bold rounded-xl px-4 py-2.5 text-xs text-white bg-[#125E45] hover:bg-[#197A5A] active:scale-[0.98] transition-all shadow-2xs cursor-pointer gap-2"
                >
                  <Truck className="w-4 h-4" />
                  <span>Register Pandi</span>
                </button>
              </Link>
            </div>
          </div>

          {/* SUMMARY CARDS - Using exact color palette */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1 - Today's Orders Highlight */}
            <div className="bg-[#E9F3EF] rounded-2xl border border-[#197A5A]/30 p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#125E45] uppercase tracking-wider">
                  Today&apos;s Dispatches
                </span>
                <span className="p-2 rounded-xl bg-[#DCEDE6] text-[#125E45]">
                  <Calendar className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-[#125E45] mt-2">
                {overallTotals.totalTodayOrders} <span className="text-sm font-bold">Orders</span>
              </div>
              <div className="text-[11px] text-[#197A5A] mt-1 font-semibold">
                Today&apos;s total dispatched orders
              </div>
            </div>

            {/* Card 2 - Period Orders */}
            <div className="bg-white rounded-2xl border border-[#DCE3E0] p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#66726D] uppercase tracking-wider">
                  Period Orders ({periodType})
                </span>
                <span className="p-2 rounded-xl bg-[#F0F4F2] text-[#17211D]">
                  <Package className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-[#17211D] mt-2">
                {overallTotals.totalPeriodOrders} <span className="text-sm font-bold">Orders</span>
              </div>
              <div className="text-[11px] text-[#66726D] mt-1">
                Delivered across {overallTotals.activePandis} active Pandis
              </div>
            </div>

            {/* Card 3 - Dispatched Value */}
            <div className="bg-white rounded-2xl border border-[#DCE3E0] p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#66726D] uppercase tracking-wider">
                  Cargo Value Handled
                </span>
                <span className="p-2 rounded-xl bg-[#F7EEDC] text-[#9A6A16]">
                  <Receipt className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-[#17211D] mt-2">
                Rs. {overallTotals.totalPeriodAmount.toLocaleString()}
              </div>
              <div className="text-[11px] text-[#9A6A16] font-semibold mt-1">
                Total parcel amount carried
              </div>
            </div>

            {/* Card 4 - Active Carriers */}
            <div className="bg-white rounded-2xl border border-[#DCE3E0] p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#66726D] uppercase tracking-wider">
                  Registered Porters
                </span>
                <span className="p-2 rounded-xl bg-[#DCEDE6] text-[#16835B]">
                  <Truck className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-[#17211D] mt-2">
                {pandis.length} <span className="text-sm font-bold">Pandis</span>
              </div>
              <div className="text-[11px] text-[#16835B] font-semibold mt-1">
                {overallTotals.activePandis} dispatched orders in this timeframe
              </div>
            </div>
          </div>

          {/* TIMEFRAME FILTER BAR */}
          <div className="bg-white rounded-2xl border border-[#DCE3E0] p-4 shadow-2xs flex items-center justify-between gap-4 flex-wrap">
            {/* Period Tabs: Today, Day, Month, Year, All */}
            <div className="flex items-center gap-1.5 p-1 bg-[#F0F4F2] rounded-xl border border-[#DCE3E0]">
              {(['Today', 'Day', 'Month', 'Year', 'All'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setPeriodType(tab)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    periodType === tab
                      ? 'bg-[#125E45] text-white shadow-2xs'
                      : 'text-[#66726D] hover:text-[#17211D]'
                  }`}
                >
                  {tab === 'Today' && 'Today'}
                  {tab === 'Day' && 'Specific Day'}
                  {tab === 'Month' && 'Month'}
                  {tab === 'Year' && 'Year'}
                  {tab === 'All' && 'All Time'}
                </button>
              ))}
            </div>

            {/* Sub-selectors for Day, Month, Year */}
            <div className="flex items-center gap-3 flex-wrap">
              {periodType === 'Day' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#66726D]">Select Date:</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="px-3 py-1.5 border border-[#DCE3E0] rounded-xl text-xs bg-white text-[#17211D] focus:outline-none focus:ring-1 focus:ring-[#197A5A]"
                  />
                </div>
              )}

              {periodType === 'Month' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#66726D]">Select Month:</span>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(e.target.value)}
                    className="px-3 py-1.5 border border-[#DCE3E0] rounded-xl text-xs bg-white text-[#17211D] focus:outline-none focus:ring-1 focus:ring-[#197A5A]"
                  />
                </div>
              )}

              {periodType === 'Year' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#66726D]">Select Year:</span>
                  <select
                    value={selectedYear}
                    onChange={e => setSelectedYear(e.target.value)}
                    className="px-3 py-1.5 border border-[#DCE3E0] rounded-xl text-xs bg-white text-[#17211D] focus:outline-none focus:ring-1 focus:ring-[#197A5A]"
                  >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                    <option value="2022">2022</option>
                  </select>
                </div>
              )}

              {/* Search Bar */}
              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A9590]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Filter by Pandi or Client name..."
                  className="w-full pl-9 pr-3 py-1.5 border border-[#DCE3E0] rounded-xl text-xs bg-white text-[#17211D] placeholder:text-[#8A9590] focus:outline-none focus:ring-1 focus:ring-[#197A5A]"
                />
              </div>
            </div>
          </div>

          {/* MAIN STATEMENT TABLE: PROMINENT TODAY'S ORDERS & DRILLDOWN */}
          <div className="bg-white rounded-2xl border border-[#DCE3E0] shadow-2xs overflow-hidden">
            <div className="px-5 py-4 border-b border-[#DCE3E0] bg-[#F0F4F2] flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-sm font-black text-[#17211D] flex items-center gap-2">
                  <span>Pandi Performance & Deliveries Summary</span>
                  <span className="text-[10px] bg-[#DCEDE6] text-[#125E45] font-bold px-2 py-0.5 rounded-full">
                    Active Filter: {periodType}
                  </span>
                </h2>
                <p className="text-[11px] text-[#66726D] mt-0.5">
                  Click on any Pandi name to view the list of clients and order receipts in their custody.
                </p>
              </div>

              <div className="text-xs text-[#66726D]">
                Showing <strong>{filteredSummaries.length}</strong> Porters
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#DCE3E0] bg-[#F0F4F2]/50 text-[#66726D] font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4">Pandi Name & Transport</th>
                    {/* Explicit user requirement: "shuru mein hi bandi ka name ka ho aj roz ka aj kitnay order la ja gaya hai in mein" */}
                    <th className="py-3.5 px-4 text-center bg-[#E9F3EF] border-x border-[#DCE3E0] text-[#125E45]">
                      Today&apos;s Orders
                    </th>
                    <th className="py-3.5 px-4 text-center">Period Orders</th>
                    <th className="py-3.5 px-4 text-right">Cargo Value Handled</th>
                    <th className="py-3.5 px-4">Clients / Customers Served</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Inspection Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE3E0]">
                  {filteredSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-[#66726D]">
                        <Truck className="w-10 h-10 mx-auto text-[#8A9590] mb-2 opacity-50" />
                        <p className="font-bold text-[#17211D]">No Orders Found for this Period</p>
                        <p className="text-[11px] text-[#8A9590] mt-0.5">
                          Change the timeframe filter or select a different date.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredSummaries.map(item => {
                      const { pandi, todayCount, periodCount, periodAmount, clientsCount, clientsList } = item;

                      return (
                        <tr
                          key={pandi.id}
                          className="hover:bg-[#F0F4F2]/60 transition-colors group cursor-pointer"
                          onClick={() => handleOpenDetail(pandi)}
                        >
                          {/* Pandi Name & Info */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-[#DCEDE6] text-[#125E45] font-black flex items-center justify-center shrink-0">
                                {pandi.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-[#17211D] text-xs group-hover:text-[#197A5A] transition-colors flex items-center gap-1.5">
                                  <span>{pandi.name}</span>
                                  <ExternalLink className="w-3 h-3 text-[#8A9590] opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <div className="text-[11px] text-[#66726D] flex items-center gap-2 mt-0.5 font-mono">
                                  {pandi.phone && <span>📞 {pandi.phone}</span>}
                                  <span className="px-1.5 py-0.2 bg-[#F7EEDC] text-[#9A6A16] rounded border border-[#9A6A16]/20 font-sans">
                                    {pandi.transportMode}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Today's Orders - First highlighted column */}
                          <td className="py-3.5 px-4 text-center bg-[#E9F3EF]/60 border-x border-[#DCE3E0]">
                            <span
                              className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg font-black text-xs ${
                                todayCount > 0
                                  ? 'bg-[#16835B] text-white shadow-2xs'
                                  : 'bg-[#DCE3E0]/60 text-[#66726D]'
                              }`}
                            >
                              <Calendar className="w-3 h-3" />
                              <span>{todayCount} Today</span>
                            </span>
                          </td>

                          {/* Period Orders */}
                          <td className="py-3.5 px-4 text-center font-bold text-[#17211D]">
                            <span className="inline-block px-2.5 py-0.5 rounded-md bg-[#F0F4F2] text-[#17211D] border border-[#DCE3E0]">
                              {periodCount} Orders
                            </span>
                          </td>

                          {/* Period Amount */}
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-[#17211D]">
                            Rs. {periodAmount.toLocaleString()}
                          </td>

                          {/* Unique Clients Summary */}
                          <td className="py-3.5 px-4">
                            {clientsList.length === 0 ? (
                              <span className="text-[11px] text-[#8A9590]">No dispatches</span>
                            ) : (
                              <div className="flex items-center gap-1 flex-wrap max-w-xs">
                                {clientsList.slice(0, 2).map((c, i) => (
                                  <span
                                    key={i}
                                    className="text-[10px] font-semibold bg-[#F0F4F2] border border-[#DCE3E0] text-[#17211D] px-2 py-0.5 rounded-md truncate max-w-[130px]"
                                    title={`${c.name} (${c.count} orders)`}
                                  >
                                    {c.name} ({c.count})
                                  </span>
                                ))}
                                {clientsList.length > 2 && (
                                  <span className="text-[10px] font-bold text-[#197A5A] bg-[#DCEDE6] px-1.5 py-0.5 rounded">
                                    +{clientsList.length - 2} more
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                pandi.status === 'Active'
                                  ? 'bg-[#DCEDE6] text-[#16835B]'
                                  : 'bg-[#F0F4F2] text-[#8A9590]'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  pandi.status === 'Active' ? 'bg-[#16835B]' : 'bg-[#8A9590]'
                                }`}
                              ></span>
                              <span>{pandi.status}</span>
                            </span>
                          </td>

                          {/* Action Button */}
                          <td className="py-3.5 px-4 text-right" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleOpenDetail(pandi)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#125E45] hover:bg-[#197A5A] transition-all shadow-2xs cursor-pointer"
                            >
                              <span>View Orders ({periodCount})</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* DRILLDOWN DETAIL MODAL: CLIENTS & ORDERS FOR SELECTED PANDI */}
          {/* User requirement: "jesay 1 pandi na 5 order la ka gaya alaga alag kkhata walo ka client ka tho us ka us ka name ko click karay tho pata chal jaye kis kis clicent aur customer ka us ka pass hai" */}
          <Modal
            isOpen={isDetailModalOpen}
            onClose={() => setIsDetailModalOpen(false)}
            title={
              activePandiDetail
                ? `${activePandiDetail.pandi.name} — Order Delivery Manifest (${periodType})`
                : 'Delivery Orders'
            }
            maxWidth="3xl"
          >
            {activePandiDetail && (
              <div className="space-y-4">
                {/* Pandi Summary Header inside modal */}
                <div className="p-3.5 bg-[#F0F4F2] rounded-2xl border border-[#DCE3E0] flex items-center justify-between gap-3 flex-wrap">
                  <div className="space-y-0.5">
                    <div className="text-xs text-[#66726D]">Contact & Operational Zone</div>
                    <div className="text-xs font-bold text-[#17211D] flex items-center gap-2">
                      <span>📞 {activePandiDetail.pandi.phone || 'No phone'}</span>
                      <span>•</span>
                      <span>📍 {activePandiDetail.pandi.marketZone || 'Liberty Market'}</span>
                      <span>•</span>
                      <span className="text-[#9A6A16] font-semibold">{activePandiDetail.pandi.transportMode}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <div className="text-[10px] text-[#66726D] uppercase">Orders in Period</div>
                      <div className="text-sm font-black text-[#17211D]">{activePandiDetail.periodCount} Orders</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#66726D] uppercase">Total Cargo Amount</div>
                      <div className="text-sm font-black text-[#125E45]">
                        Rs. {activePandiDetail.periodAmount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Clients Grouped Breakdown */}
                {activePandiDetail.clientsList.length > 0 && (
                  <div>
                    <div className="text-xs font-bold text-[#17211D] mb-2 flex items-center justify-between">
                      <span>Associated Khata & Wholesale Clients ({activePandiDetail.clientsList.length})</span>
                      <span className="text-[11px] text-[#66726D] font-normal">
                        Clients whose parcels are assigned to this porter
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {activePandiDetail.clientsList.map((client, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 bg-white rounded-xl border border-[#DCE3E0] flex items-center justify-between gap-2 shadow-2xs"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-[#17211D] truncate flex items-center gap-1">
                              <Building className="w-3 h-3 text-[#197A5A] shrink-0" />
                              <span className="truncate">{client.name}</span>
                            </div>
                            <div className="text-[10px] text-[#66726D] mt-0.5">
                              {client.count} {client.count === 1 ? 'Dispatch' : 'Dispatches'}
                            </div>
                          </div>
                          <div className="text-right shrink-0 font-mono font-bold text-xs text-[#125E45]">
                            Rs. {client.total.toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Individual Orders Table */}
                <div>
                  <div className="text-xs font-bold text-[#17211D] mb-2 flex items-center justify-between">
                    <span>Itemized Invoices Carried</span>
                    <span className="text-[11px] text-[#66726D] font-normal">
                      Click invoice to view printable commercial copy
                    </span>
                  </div>

                  <div className="border border-[#DCE3E0] rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#DCE3E0] bg-[#F0F4F2] text-[#66726D] font-bold text-[10px] uppercase">
                          <th className="py-2.5 px-3">Invoice #</th>
                          <th className="py-2.5 px-3">Date & Time</th>
                          <th className="py-2.5 px-3">Billed Client / Customer</th>
                          <th className="py-2.5 px-3">Sale Type</th>
                          <th className="py-2.5 px-3">Dispatch Builty / Notes</th>
                          <th className="py-2.5 px-3 text-right">Bill Total</th>
                          <th className="py-2.5 px-3 text-right">View</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#DCE3E0]">
                        {activePandiDetail.orders.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-6 text-xs text-[#8A9590]">
                              No orders found for this porter in the active timeframe.
                            </td>
                          </tr>
                        ) : (
                          activePandiDetail.orders.map(bill => (
                            <tr key={bill.id} className="hover:bg-[#F0F4F2]/50 transition-colors">
                              <td className="py-2.5 px-3 font-mono font-bold text-[#17211D]">
                                #{bill.invoiceNumber}
                              </td>
                              <td className="py-2.5 px-3 text-[#66726D] text-[11px]">
                                {new Date(bill.date).toLocaleDateString('en-GB')} (
                                {new Date(bill.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                              </td>
                              <td className="py-2.5 px-3 font-bold text-[#17211D]">
                                {bill.clientName || bill.customerName || 'Walk-in'}
                                {bill.customerPhone && (
                                  <div className="text-[10px] text-[#8A9590] font-normal font-mono">
                                    {bill.customerPhone}
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    bill.saleType === 'Khata'
                                      ? 'bg-[#F7EEDC] text-[#9A6A16]'
                                      : 'bg-[#DCEDE6] text-[#125E45]'
                                  }`}
                                >
                                  {bill.saleType}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-[11px] text-[#66726D] max-w-xs truncate">
                                {bill.notes || '—'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-[#17211D]">
                                Rs. {bill.grandTotal.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBillToView(bill);
                                    setIsInvoicePreviewOpen(true);
                                  }}
                                  className="text-[11px] font-bold text-[#125E45] hover:text-[#197A5A] underline"
                                >
                                  Invoice
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DCE3E0]">
                  <Button variant="outline" size="md" onClick={() => setIsDetailModalOpen(false)}>
                    Close
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handlePrintStatement}
                    className="gap-2 bg-[#125E45] hover:bg-[#197A5A] text-white"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Pandi Manifest</span>
                  </Button>
                </div>
              </div>
            )}
          </Modal>

          {/* INVOICE PREVIEW MODAL */}
          <Modal
            isOpen={isInvoicePreviewOpen}
            onClose={() => setIsInvoicePreviewOpen(false)}
            title="Commercial Wholesale Invoice Preview"
            maxWidth="3xl"
          >
            {billToView && (
              <div className="space-y-4">
                <WholesaleInvoicePrint bill={billToView} onClose={() => setIsInvoicePreviewOpen(false)} />
              </div>
            )}
          </Modal>

          {/* PRINT-ONLY CONTAINER (Invisible on screen, visible during window.print()) */}
          <div className="hidden print:block font-sans text-black p-6">
            <div className="text-center pb-4 border-b-2 border-black">
              <h1 className="text-2xl font-black uppercase">AL-NOOR FABRICS & TEXTILES</h1>
              <p className="text-xs">Liberty Cloth Market, Gulberg III, Lahore | Tel: +92 (042) 3575-8991</p>
              <h2 className="text-lg font-bold mt-2 uppercase tracking-wide">
                Daily Pandi (Porter / Cargo) Dispatch Sheet
              </h2>
              <p className="text-xs text-gray-700">
                Period Filter: {periodType} | Date Generated: {new Date().toLocaleString('en-GB')}
              </p>
            </div>

            <div className="grid grid-cols-4 gap-4 py-4 border-b border-gray-300 text-xs">
              <div>
                <strong>Today&apos;s Orders:</strong> {overallTotals.totalTodayOrders}
              </div>
              <div>
                <strong>Period Deliveries:</strong> {overallTotals.totalPeriodOrders}
              </div>
              <div>
                <strong>Total Amount:</strong> Rs. {overallTotals.totalPeriodAmount.toLocaleString()}
              </div>
              <div>
                <strong>Active Porters:</strong> {overallTotals.activePandis}
              </div>
            </div>

            <table className="w-full text-left text-xs mt-4 border-collapse">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="py-2">Pandi Name</th>
                  <th className="py-2">Transport</th>
                  <th className="py-2 text-center">Today Orders</th>
                  <th className="py-2 text-center">Period Orders</th>
                  <th className="py-2 text-right">Total Amount</th>
                  <th className="py-2">Assigned Clients / Customers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300">
                {filteredSummaries.map(item => (
                  <tr key={item.pandi.id}>
                    <td className="py-2 font-bold">{item.pandi.name}</td>
                    <td className="py-2">{item.pandi.transportMode}</td>
                    <td className="py-2 text-center font-bold">{item.todayCount}</td>
                    <td className="py-2 text-center">{item.periodCount}</td>
                    <td className="py-2 text-right font-mono">Rs. {item.periodAmount.toLocaleString()}</td>
                    <td className="py-2">
                      {item.clientsList.map(c => `${c.name} (${c.count})`).join(', ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="grid grid-cols-2 gap-12 mt-16 text-center text-xs">
              <div className="border-t border-black pt-2">
                <strong>Pandi / Carrier Signature</strong>
              </div>
              <div className="border-t border-black pt-2">
                <strong>Store Manager / Billing Officer Signature</strong>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}

export default function PandiStatementPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAF9] flex items-center justify-center text-xs font-semibold text-[#8A9590]">
          Loading Pandi Statement...
        </div>
      }
    >
      <PandiStatementContent />
    </Suspense>
  );
}
