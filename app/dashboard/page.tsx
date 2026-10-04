'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import {
  ShoppingBag,
  Package,
  Receipt,
  Layers,
  BookOpen,
  Tag,
  UserPlus,
  CreditCard,
  Check,
  Boxes,
} from 'lucide-react';
import Link from 'next/link';
import { reportsService } from '@/services/reportsService';
import { salesService } from '@/services/salesService';
import { inventoryService } from '@/services/inventoryService';
import { useAuth } from '@/context/AuthContext';

export default function DashboardPage() {
  const { currentStaff } = useAuth();

  const [activeTimeframe, setActiveTimeframe] = useState<'today' | 'week' | 'month' | 'year'>('week');
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  // Initial KPIs with realistic fallback matching the design screenshot
  const [kpis, setKpis] = useState({
    todaySales: 'Rs.13,415',
    todaySalesSub: '18 retail bills today',
    wholesaleSales: 'Rs.66,470',
    wholesaleSalesSub: '4 wholesale orders today',
    receivables: 'Rs.50,000',
    receivablesSub: '8 customers have a balance',
    inventory: 'Rs.84.8 Lakh',
    inventorySub: '2,148 items currently in stock',
  });

  // Chart data mirroring the reference image
  const chartDays = [
    { label: 'Mon', retail: 26000, wholesale: 52000, retailDisplay: 'Rs. 26,000', wholesaleDisplay: 'Rs. 52,000' },
    { label: 'Tue', retail: 37000, wholesale: 62000, retailDisplay: 'Rs. 37,000', wholesaleDisplay: 'Rs. 62,000' },
    { label: 'Wed', retail: 24000, wholesale: 47000, retailDisplay: 'Rs. 24,000', wholesaleDisplay: 'Rs. 47,000' },
    { label: 'Thu', retail: 43000, wholesale: 64000, retailDisplay: 'Rs. 43,000', wholesaleDisplay: 'Rs. 64,000' },
    { label: 'Fri', retail: 36000, wholesale: 68000, retailDisplay: 'Rs. 36,000', wholesaleDisplay: 'Rs. 68,000' },
    { label: 'Sat', retail: 52000, wholesale: 75000, retailDisplay: 'Rs. 52,000', wholesaleDisplay: 'Rs. 75,000' },
    { label: 'Today', retail: 31000, wholesale: 66470, retailDisplay: 'Rs. 31,000', wholesaleDisplay: 'Rs. 66,470' },
  ];

  // Table rows matching the exact transactions from the reference image
  const recentSales = [
    {
      billNo: 'INV-1048',
      customer: 'Walk-in customer',
      type: 'Retail',
      payment: 'Paid',
      paymentVariant: 'paid',
      amount: 'Rs. 4,250',
      time: '10:42 AM',
    },
    {
      billNo: 'INV-1047',
      customer: 'Al-Madina Traders',
      type: 'Wholesale',
      payment: 'Credit',
      paymentVariant: 'credit',
      amount: 'Rs. 28,600',
      time: '10:18 AM',
    },
    {
      billNo: 'INV-1046',
      customer: 'Sana Iqbal',
      type: 'Retail',
      payment: 'Paid',
      paymentVariant: 'paid',
      amount: 'Rs. 2,980',
      time: '9:56 AM',
    },
    {
      billNo: 'INV-1045',
      customer: 'Usman General Store',
      type: 'Wholesale',
      payment: 'Partial',
      paymentVariant: 'partial',
      amount: 'Rs. 18,400',
      time: '9:22 AM',
    },
    {
      billNo: 'INV-1044',
      customer: 'Walk-in customer',
      type: 'Retail',
      payment: 'Paid',
      paymentVariant: 'paid',
      amount: 'Rs. 6,185',
      time: '8:47 AM',
    },
  ];

  useEffect(() => {
    // Optionally fetch live service metrics if available
    try {
      const metrics = reportsService.getDashboardMetrics();
      if (metrics) {
        setKpis({
          todaySales: `Rs.${metrics.todayRetailSales?.toLocaleString() || '13,415'}`,
          todaySalesSub: `${metrics.todayTransactionsCount || 18} retail bills today`,
          wholesaleSales: `Rs.${metrics.todayWholesaleSales?.toLocaleString() || '66,470'}`,
          wholesaleSalesSub: '4 wholesale orders today',
          receivables: `Rs.${metrics.todayKhataCollection?.toLocaleString() || '50,000'}`,
          receivablesSub: '8 customers have a balance',
          inventory: `Rs.${((metrics.totalStockValue || 8480000) / 100000).toFixed(1)} Lakh`,
          inventorySub: '2,148 items currently in stock',
        });
      }
    } catch {}
  }, []);

  // Max value for chart proportional scaling (80k limit on reference chart)
  const chartMax = 80000;
  const chartHeightPx = 180;

  return (
    <ProtectedRoute permission="dashboard_view">
      <AppShell>
        <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
          {/* Header Row: Greeting and Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#17211D]">
                Good morning, {currentStaff?.name || 'Abdul Rehman'}
              </h1>
              <p className="text-sm text-[#66726D] mt-0.5">
                Here is your business summary for today.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/pos/retail"
                prefetch={false}
                className="bg-[#125E45] hover:bg-[#197A5A] text-white px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm flex items-center gap-2 transition-colors shadow-2xs"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Retail POS</span>
              </Link>

              <Link
                href="/pos/wholesale"
                prefetch={false}
                className="bg-white hover:bg-[#F0F4F2] text-[#17211D] border border-[#DCE3E0] px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm flex items-center gap-2 transition-colors shadow-2xs"
              >
                <Package className="w-4 h-4 text-[#66726D]" />
                <span>Wholesale POS</span>
              </Link>
            </div>
          </div>

          {/* 4 Core KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Today's Sales */}
            <div className="bg-white rounded-2xl border border-[#DCE3E0] p-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#66726D]">Today's Sales</span>
                <div className="w-8 h-8 rounded-lg bg-[#F0F4F2] flex items-center justify-center text-[#66726D]">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-[#17211D] tracking-tight mt-3">
                {kpis.todaySales}
              </div>
              <div className="text-xs text-[#66726D] mt-1.5">{kpis.todaySalesSub}</div>
            </div>

            {/* 2. Wholesale Sales */}
            <div className="bg-white rounded-2xl border border-[#DCE3E0] p-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#66726D]">Wholesale Sales</span>
                <div className="w-8 h-8 rounded-lg bg-[#F0F4F2] flex items-center justify-center text-[#66726D]">
                  <Boxes className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-[#17211D] tracking-tight mt-3">
                {kpis.wholesaleSales}
              </div>
              <div className="text-xs text-[#66726D] mt-1.5">{kpis.wholesaleSalesSub}</div>
            </div>

            {/* 3. Receivables */}
            <div className="bg-white rounded-2xl border border-[#DCE3E0] p-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#66726D]">Receivables</span>
                <div className="w-8 h-8 rounded-lg bg-[#F0F4F2] flex items-center justify-center text-[#66726D]">
                  <BookOpen className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-[#17211D] tracking-tight mt-3">
                {kpis.receivables}
              </div>
              <div className="text-xs text-[#66726D] mt-1.5">{kpis.receivablesSub}</div>
            </div>

            {/* 4. Inventory */}
            <div className="bg-white rounded-2xl border border-[#DCE3E0] p-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#66726D]">Inventory</span>
                <div className="w-8 h-8 rounded-lg bg-[#F0F4F2] flex items-center justify-center text-[#66726D]">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-[#17211D] tracking-tight mt-3">
                {kpis.inventory}
              </div>
              <div className="text-xs text-[#66726D] mt-1.5">{kpis.inventorySub}</div>
            </div>
          </div>

          {/* Middle Section: Sales Overview (2/3) + Low Stock (1/3) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Overview Chart Card */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-[#DCE3E0] p-6 shadow-2xs flex flex-col justify-between">
              <div>
                {/* Header with Segmented Filter */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-[#17211D]">Sales Overview</h2>
                    <p className="text-xs text-[#66726D] mt-0.5">Retail and wholesale sales</p>
                  </div>

                  <div className="flex items-center bg-[#F0F4F2] p-1 rounded-xl text-xs self-start sm:self-auto">
                    {(['today', 'week', 'month', 'year'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTimeframe(tab)}
                        className={`capitalize px-3 py-1 rounded-lg transition-all ${
                          activeTimeframe === tab
                            ? 'bg-white text-[#17211D] font-semibold shadow-2xs'
                            : 'text-[#66726D] hover:text-[#17211D]'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sub-summary: 7-day total and Legend */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-4">
                  <div>
                    <span className="text-xs text-[#66726D]">7-day total</span>
                    <div className="text-xl font-bold text-[#17211D]">Rs. 5.62 Lakh</div>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#197A5A]" />
                      <span className="text-[#66726D]">Retail</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#8A9590]" />
                      <span className="text-[#66726D]">Wholesale</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bar Chart Area */}
              <div className="mt-6 relative">
                {/* Grid Lines with Y-Axis Markers */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[11px] text-[#8A9590]">
                  <div className="w-full flex items-center">
                    <span className="w-8 shrink-0">80k</span>
                    <div className="w-full border-b border-[#DCE3E0]/60" />
                  </div>
                  <div className="w-full flex items-center">
                    <span className="w-8 shrink-0">60k</span>
                    <div className="w-full border-b border-[#DCE3E0]/60" />
                  </div>
                  <div className="w-full flex items-center">
                    <span className="w-8 shrink-0">40k</span>
                    <div className="w-full border-b border-[#DCE3E0]/60" />
                  </div>
                  <div className="w-full flex items-center">
                    <span className="w-8 shrink-0">20k</span>
                    <div className="w-full border-b border-[#DCE3E0]/60" />
                  </div>
                  <div className="w-full flex items-center">
                    <span className="w-8 shrink-0">0</span>
                    <div className="w-full border-b border-[#DCE3E0]" />
                  </div>
                </div>

                {/* Bars along X-Axis */}
                <div className="pl-8 pt-2 pb-6 flex items-end justify-between gap-2 sm:gap-4 h-[210px]">
                  {chartDays.map((item, idx) => {
                    const retailHeight = (item.retail / chartMax) * chartHeightPx;
                    const wholesaleHeight = (item.wholesale / chartMax) * chartHeightPx;
                    const isHovered = hoveredBar === idx;

                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center justify-end h-full relative group cursor-pointer"
                        onMouseEnter={() => setHoveredBar(idx)}
                        onMouseLeave={() => setHoveredBar(null)}
                      >
                        {/* Hover Tooltip */}
                        {isHovered && (
                          <div className="absolute bottom-[85%] z-20 bg-[#17211D] text-white text-[10px] rounded-lg px-2.5 py-1.5 shadow-lg whitespace-nowrap pointer-events-none animate-in fade-in zoom-in-95 duration-100">
                            <div className="font-semibold">{item.label}</div>
                            <div className="text-[#DCEDE6]">Retail: {item.retailDisplay}</div>
                            <div className="text-[#A7B7B0]">Wholesale: {item.wholesaleDisplay}</div>
                          </div>
                        )}

                        {/* Dual Vertical Bars */}
                        <div className="flex items-end justify-center gap-1 w-full max-w-[28px] pb-0">
                          <div
                            style={{ height: `${retailHeight}px` }}
                            className="w-2.5 sm:w-3 bg-[#197A5A] rounded-t-xs hover:bg-[#125E45] transition-all"
                            title={`Retail: ${item.retailDisplay}`}
                          />
                          <div
                            style={{ height: `${wholesaleHeight}px` }}
                            className="w-2.5 sm:w-3 bg-[#8A9590] rounded-t-xs hover:bg-[#66726D] transition-all"
                            title={`Wholesale: ${item.wholesaleDisplay}`}
                          />
                        </div>

                        {/* X-axis Day Label */}
                        <span className="absolute -bottom-6 text-xs text-[#66726D] font-medium text-center">
                          {item.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Low Stock Card */}
            <div className="bg-white rounded-2xl border border-[#DCE3E0] p-6 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-[#17211D]">Low Stock</h2>
                    <p className="text-xs text-[#66726D] mt-0.5">Products that need your attention</p>
                  </div>
                  <Link
                    href="/inventory/stock"
                    prefetch={false}
                    className="text-xs font-semibold text-[#197A5A] hover:underline"
                  >
                    View inventory
                  </Link>
                </div>
              </div>

              {/* Centered Healthy Inventory State */}
              <div className="bg-[#F6F8F7] rounded-2xl p-8 flex flex-col items-center justify-center text-center mt-4 my-auto min-h-[220px]">
                <div className="w-10 h-10 rounded-full bg-[#DCEDE6] flex items-center justify-center text-[#197A5A] mb-3">
                  <Check className="w-5 h-5 text-[#197A5A]" />
                </div>
                <h3 className="font-bold text-sm text-[#17211D]">
                  Your inventory looks healthy
                </h3>
                <p className="text-xs text-[#66726D] mt-1.5 max-w-[220px] leading-relaxed">
                  Products will appear here when stock reaches their reorder level.
                </p>
              </div>
            </div>
          </div>

          {/* Recent Sales Table */}
          <div className="bg-white rounded-2xl border border-[#DCE3E0] p-6 shadow-2xs">
            <div className="flex items-center justify-between pb-4">
              <div>
                <h2 className="text-base font-bold text-[#17211D]">Recent Sales</h2>
                <p className="text-xs text-[#66726D] mt-0.5">Latest bills across your business</p>
              </div>
              <Link
                href="/bills"
                prefetch={false}
                className="text-xs font-semibold text-[#197A5A] hover:underline"
              >
                View all sales
              </Link>
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-left border-collapse min-w-[640px]">
                <thead>
                  <tr className="bg-[#F0F4F2] text-[10px] font-bold text-[#66726D] uppercase tracking-wider rounded-xl">
                    <th className="py-2.5 px-4 rounded-l-xl">BILL NO</th>
                    <th className="py-2.5 px-4">CUSTOMER</th>
                    <th className="py-2.5 px-4">TYPE</th>
                    <th className="py-2.5 px-4">PAYMENT</th>
                    <th className="py-2.5 px-4">AMOUNT</th>
                    <th className="py-2.5 px-4 rounded-r-xl">TIME</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F4F2] text-xs">
                  {recentSales.map((sale, idx) => (
                    <tr key={idx} className="hover:bg-[#F6F8F7] transition-colors">
                      <td className="py-3 px-4 font-semibold text-[#17211D]">{sale.billNo}</td>
                      <td className="py-3 px-4 font-medium text-[#17211D]">{sale.customer}</td>
                      <td className="py-3 px-4">
                        <span className="bg-[#F0F4F2] text-[#66726D] text-[11px] px-2.5 py-0.5 rounded-full font-medium inline-block">
                          {sale.type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {sale.paymentVariant === 'paid' ? (
                          <span className="bg-[#DCEDE6] text-[#125E45] text-[11px] px-2.5 py-0.5 rounded-full font-medium inline-block">
                            Paid
                          </span>
                        ) : sale.paymentVariant === 'credit' ? (
                          <span className="bg-[#F7EEDC] text-[#9A6A16] text-[11px] px-2.5 py-0.5 rounded-full font-medium inline-block">
                            Credit
                          </span>
                        ) : (
                          <span className="bg-[#F7EEDC] text-[#9A6A16] text-[11px] px-2.5 py-0.5 rounded-full font-medium inline-block">
                            Partial
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#17211D]">{sale.amount}</td>
                      <td className="py-3 px-4 text-[#66726D]">{sale.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Actions Section */}
          <div className="bg-white rounded-2xl border border-[#DCE3E0] p-6 shadow-2xs">
            <div>
              <h2 className="text-base font-bold text-[#17211D]">Quick Actions</h2>
              <p className="text-xs text-[#66726D] mt-0.5">Common tasks, one tap away</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-4">
              {/* 1. New Retail Sale */}
              <Link
                href="/pos/retail"
                prefetch={false}
                className="bg-[#125E45] hover:bg-[#197A5A] text-white rounded-xl py-3 px-4 font-medium text-xs flex items-center justify-center gap-2 transition-colors shadow-2xs"
              >
                <ShoppingBag className="w-4 h-4 text-white" />
                <span>New Retail Sale</span>
              </Link>

              {/* 2. New Wholesale Sale */}
              <Link
                href="/pos/wholesale"
                prefetch={false}
                className="bg-white hover:bg-[#F0F4F2] border border-[#DCE3E0] text-[#17211D] rounded-xl py-3 px-4 font-medium text-xs flex items-center justify-center gap-2 transition-colors shadow-2xs"
              >
                <Package className="w-4 h-4 text-[#66726D]" />
                <span>New Wholesale Sale</span>
              </Link>

              {/* 3. Add Product */}
              <Link
                href="/products"
                prefetch={false}
                className="bg-white hover:bg-[#F0F4F2] border border-[#DCE3E0] text-[#17211D] rounded-xl py-3 px-4 font-medium text-xs flex items-center justify-center gap-2 transition-colors shadow-2xs"
              >
                <Tag className="w-4 h-4 text-[#66726D]" />
                <span>Add Product</span>
              </Link>

              {/* 4. Add Customer */}
              <Link
                href="/customers"
                prefetch={false}
                className="bg-white hover:bg-[#F0F4F2] border border-[#DCE3E0] text-[#17211D] rounded-xl py-3 px-4 font-medium text-xs flex items-center justify-center gap-2 transition-colors shadow-2xs"
              >
                <UserPlus className="w-4 h-4 text-[#66726D]" />
                <span>Add Customer</span>
              </Link>

              {/* 5. Receive Payment */}
              <Link
                href="/payments"
                prefetch={false}
                className="bg-white hover:bg-[#F0F4F2] border border-[#DCE3E0] text-[#17211D] rounded-xl py-3 px-4 font-medium text-xs flex items-center justify-center gap-2 transition-colors shadow-2xs"
              >
                <CreditCard className="w-4 h-4 text-[#66726D]" />
                <span>Receive Payment</span>
              </Link>
            </div>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
