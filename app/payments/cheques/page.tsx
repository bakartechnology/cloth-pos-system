'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  CheckCircle2,
  Calendar,
  Building,
  Search,
  Clock,
  AlertTriangle,
  User,
  Check,
  RefreshCw,
} from 'lucide-react';
import { paymentsService } from '@/services/paymentsService';
import { storageService } from '@/services/storageService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ChequeItem } from '@/types';

interface ChequeRowItem {
  collectionId: string;
  receiptNumber: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  staffName: string;
  cheque: ChequeItem;
  isDueToday: boolean;
  isOverdue: boolean;
  originType: 'Wholesale' | 'Khata';
}

export default function PendingChequesPage() {
  const { currentStaff } = useAuth();
  const { toast } = useToast();

  const [chequeList, setChequeList] = useState<ChequeRowItem[]>([]);
  const [filterTab, setFilterTab] = useState<'All' | 'Due' | 'Upcoming' | 'Passed'>('All');
  const [originFilter, setOriginFilter] = useState<'All' | 'Wholesale' | 'Khata'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);

  const loadCheques = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const collections = storageService.getCollections();
    const rows: ChequeRowItem[] = [];

    collections.forEach(col => {
      if (col.cheques && col.cheques.length > 0) {
        col.cheques.forEach(chq => {
          const isDueToday = chq.clearingDate === todayStr && chq.status !== 'Passed';
          const isOverdue = chq.clearingDate < todayStr && chq.status !== 'Passed';
          const isWholesale =
            chq.saleType === 'Wholesale' ||
            col.collectionType === 'Wholesale' ||
            col.receiptNumber.startsWith('CHQ-');
          const originType: 'Wholesale' | 'Khata' = isWholesale ? 'Wholesale' : 'Khata';

          rows.push({
            collectionId: col.id,
            receiptNumber: col.receiptNumber,
            customerId: col.customerId,
            customerName: chq.customerName || col.customerName,
            customerPhone: chq.customerPhone || col.customerPhone,
            staffName: col.staffName,
            cheque: chq,
            isDueToday,
            isOverdue,
            originType,
          });
        });
      }
    });

    // Sort: Due Today first, then Overdue, then Upcoming by clearing date, then Passed
    rows.sort((a, b) => {
      if (a.cheque.status === 'Passed' && b.cheque.status !== 'Passed') return 1;
      if (a.cheque.status !== 'Passed' && b.cheque.status === 'Passed') return -1;
      if (a.isDueToday && !b.isDueToday) return -1;
      if (!a.isDueToday && b.isDueToday) return 1;
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return a.cheque.clearingDate.localeCompare(b.cheque.clearingDate);
    });

    setChequeList(rows);
  };

  useEffect(() => {
    loadCheques();
  }, []);

  // Filtered Cheques
  const filteredCheques = useMemo(() => {
    let result = [...chequeList];

    // Filter by Origin: All, Wholesale, Khata/Credit POS
    if (originFilter === 'Wholesale') {
      result = result.filter(c => c.originType === 'Wholesale');
    } else if (originFilter === 'Khata') {
      result = result.filter(c => c.originType === 'Khata');
    }

    // Filter by Tab
    if (filterTab === 'Due') {
      result = result.filter(c => (c.isDueToday || c.isOverdue) && c.cheque.status !== 'Passed');
    } else if (filterTab === 'Upcoming') {
      result = result.filter(c => !c.isDueToday && !c.isOverdue && c.cheque.status !== 'Passed');
    } else if (filterTab === 'Passed') {
      result = result.filter(c => c.cheque.status === 'Passed');
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        c =>
          (c.customerName && c.customerName.toLowerCase().includes(q)) ||
          (c.cheque.bankName && c.cheque.bankName.toLowerCase().includes(q)) ||
          (c.cheque.invoiceNumber && c.cheque.invoiceNumber.toLowerCase().includes(q)) ||
          (c.receiptNumber && c.receiptNumber.toLowerCase().includes(q))
      );
    }

    return result;
  }, [chequeList, filterTab, searchQuery]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const uncleared = chequeList.filter(c => c.cheque.status !== 'Passed');
    const totalUnclearedAmount = uncleared.reduce((sum, c) => sum + (c.cheque.chequeAmount || 0), 0);
    const dueCount = uncleared.filter(c => c.isDueToday || c.isOverdue).length;
    const dueAmount = uncleared
      .filter(c => c.isDueToday || c.isOverdue)
      .reduce((sum, c) => sum + (c.cheque.chequeAmount || 0), 0);
    const passedCount = chequeList.filter(c => c.cheque.status === 'Passed').length;
    const passedAmount = chequeList
      .filter(c => c.cheque.status === 'Passed')
      .reduce((sum, c) => sum + (c.cheque.chequeAmount || 0), 0);

    return {
      totalUnclearedAmount,
      unclearedCount: uncleared.length,
      dueCount,
      dueAmount,
      passedCount,
      passedAmount,
    };
  }, [chequeList]);

  // Handle Pass Cheque (OK button clicked)
  const handlePassCheque = (collectionId: string, chequeId: string) => {
    setIsProcessingId(chequeId);
    try {
      const res = paymentsService.passCheque(
        collectionId,
        chequeId,
        currentStaff?.id,
        currentStaff?.name
      );

      if (res.success) {
        loadCheques();
        toast({
          title: 'Cheque Passed & Settled (OK)',
          description: `Rs. ${res.amount?.toLocaleString()} deducted from ${res.customerName}'s account on today's statement (${new Date().toLocaleDateString()}). Notification cleared.`,
          type: 'success',
        });
      } else {
        toast({
          title: 'Action Failed',
          description: res.message,
          type: 'error',
        });
      }
    } finally {
      setIsProcessingId(null);
    }
  };

  return (
    <ProtectedRoute permission="pos_wholesale">
      <AppShell>
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#DCEDE6] text-[#125E45] rounded-xl">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-[#17211D]">
                    Cheque Clearance & Verification
                  </h1>
                  <p className="text-xs text-[#66726D]">
                    Wholesale uncleared cheques, scheduled passing dates, and account statement deductions
                  </p>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadCheques}
              className="flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Cheques</span>
            </Button>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-[#DCE3E0] bg-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#66726D]">Total Uncleared Cheques</span>
                  <Clock className="w-4 h-4 text-[#125E45]" />
                </div>
                <div className="text-2xl font-black text-[#17211D] mt-1">
                  Rs. {metrics.totalUnclearedAmount.toLocaleString()}
                </div>
                <div className="text-[11px] text-[#66726D] mt-0.5">
                  {metrics.unclearedCount} cheques pending clearance
                </div>
              </CardContent>
            </Card>

            <Card className={`border-[#DCE3E0] ${metrics.dueCount > 0 ? 'bg-amber-50/70 border-amber-300' : 'bg-white'}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-900">Due Today / Overdue</span>
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-black text-amber-900 mt-1">
                  Rs. {metrics.dueAmount.toLocaleString()}
                </div>
                <div className="text-[11px] text-amber-800 font-semibold mt-0.5">
                  {metrics.dueCount} cheques requiring verification & pass (OK)
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#DCE3E0] bg-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#66726D]">Passed & Settled Cheques</span>
                  <CheckCircle2 className="w-4 h-4 text-[#16835B]" />
                </div>
                <div className="text-2xl font-black text-[#16835B] mt-1">
                  Rs. {metrics.passedAmount.toLocaleString()}
                </div>
                <div className="text-[11px] text-[#66726D] mt-0.5">
                  {metrics.passedCount} cheques deducted from customer ledger
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Origin Category Switcher: All, Wholesale, Khata/Credit POS */}
          <div className="flex items-center gap-1.5 p-1 bg-white rounded-2xl border border-[#DCE3E0] shadow-2xs w-fit">
            <button
              type="button"
              onClick={() => setOriginFilter('All')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                originFilter === 'All'
                  ? 'bg-[#125E45] text-white shadow-2xs'
                  : 'text-[#66726D] hover:text-[#17211D]'
              }`}
            >
              All Sources ({chequeList.length})
            </button>
            <button
              type="button"
              onClick={() => setOriginFilter('Wholesale')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                originFilter === 'Wholesale'
                  ? 'bg-[#125E45] text-white shadow-2xs'
                  : 'text-[#66726D] hover:text-[#17211D]'
              }`}
            >
              Wholesale POS ({chequeList.filter(c => c.originType === 'Wholesale').length})
            </button>
            <button
              type="button"
              onClick={() => setOriginFilter('Khata')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                originFilter === 'Khata'
                  ? 'bg-[#125E45] text-white shadow-2xs'
                  : 'text-[#66726D] hover:text-[#17211D]'
              }`}
            >
              Khata / Credit POS ({chequeList.filter(c => c.originType === 'Khata').length})
            </button>
          </div>

          {/* Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-[#DCE3E0] shadow-2xs">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setFilterTab('All')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  filterTab === 'All'
                    ? 'bg-[#125E45] text-white shadow-2xs'
                    : 'text-[#66726D] hover:bg-[#F0F4F2]'
                }`}
              >
                All ({chequeList.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('Due')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  filterTab === 'Due'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-amber-800 hover:bg-amber-50'
                }`}
              >
                <span>Due Today / Overdue</span>
                {metrics.dueCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-white/25 rounded-full text-[10px]">
                    {metrics.dueCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('Upcoming')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  filterTab === 'Upcoming'
                    ? 'bg-[#125E45] text-white shadow-2xs'
                    : 'text-[#66726D] hover:bg-[#F0F4F2]'
                }`}
              >
                Upcoming
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('Passed')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  filterTab === 'Passed'
                    ? 'bg-[#16835B] text-white shadow-2xs'
                    : 'text-[#66726D] hover:bg-[#F0F4F2]'
                }`}
              >
                Passed ({metrics.passedCount})
              </button>
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-[#8A9590] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search client, bank, invoice..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-[#DCE3E0] rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#197A5A]"
              />
            </div>
          </div>

          {/* Cheques List Table */}
          <Card className="border-[#DCE3E0] bg-white overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F8FAFA] text-[#66726D] font-bold border-b border-[#DCE3E0]">
                    <th className="p-3.5">Client / Customer</th>
                    <th className="p-3.5">Invoice #</th>
                    <th className="p-3.5">Cheque Bank</th>
                    <th className="p-3.5">Passing Date</th>
                    <th className="p-3.5 text-right">Cheque Amount</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE3E0]">
                  {filteredCheques.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-[#8A9590]">
                        <CheckCircle2 className="w-8 h-8 text-[#125E45]/40 mx-auto mb-2" />
                        <div className="font-semibold text-sm text-[#17211D]">No cheques found</div>
                        <div className="text-xs text-[#8A9590] mt-0.5">
                          {filterTab === 'Due'
                            ? 'No cheques are currently due for clearance.'
                            : 'All clear or no matching cheques for this view.'}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredCheques.map(row => {
                      const isPassed = row.cheque.status === 'Passed';
                      const isDue = (row.isDueToday || row.isOverdue) && !isPassed;

                      return (
                        <tr
                          key={row.cheque.id}
                          className={`hover:bg-[#F8FAFA] transition-colors ${
                            isDue ? 'bg-amber-50/40' : ''
                          }`}
                        >
                          <td className="p-3.5">
                            <div className="font-bold text-[#17211D] flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-[#125E45]" />
                              <span>{row.customerName || 'Wholesale Client'}</span>
                            </div>
                            {row.customerPhone && (
                              <div className="text-[10px] text-[#66726D] font-mono mt-0.5">
                                {row.customerPhone}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span className="font-mono font-bold text-[#17211D]">
                              {row.cheque.invoiceNumber || row.receiptNumber || 'POS Sale'}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <div className="font-semibold text-[#17211D] flex items-center gap-1.5">
                              <Building className="w-3.5 h-3.5 text-[#66726D]" />
                              <span>{row.cheque.bankName || 'Bank Cheque'}</span>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5 font-medium text-[#17211D]">
                              <Calendar className="w-3.5 h-3.5 text-[#66726D]" />
                              <span>
                                {row.cheque.clearingDate
                                  ? new Date(row.cheque.clearingDate).toLocaleDateString('en-GB', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                    })
                                  : 'Not set'}
                              </span>
                            </div>
                            {isDue && (
                              <span className="text-[10px] text-amber-700 font-bold block mt-0.5">
                                {row.isOverdue ? 'Overdue for passing' : 'Due for passing today'}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            <span className="text-sm font-black text-[#17211D]">
                              Rs. {(row.cheque.chequeAmount || 0).toLocaleString()}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            {isPassed ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#DCEDE6] text-[#125E45]">
                                <Check className="w-3 h-3" />
                                <span>Passed</span>
                              </span>
                            ) : row.isOverdue ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Overdue</span>
                              </span>
                            ) : row.isDueToday ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                                <Clock className="w-3 h-3" />
                                <span>Due Today</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                                <Clock className="w-3 h-3" />
                                <span>Pending</span>
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            {isPassed ? (
                              <span className="text-[11px] text-[#66726D] font-medium">
                                Settled on statement
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={isProcessingId === row.cheque.id}
                                onClick={() => handlePassCheque(row.collectionId, row.cheque.id)}
                                className="px-3.5 py-1.5 bg-[#125E45] hover:bg-[#197A5A] text-white rounded-xl text-xs font-bold transition-all shadow-2xs hover:shadow cursor-pointer flex items-center gap-1.5 ml-auto active:scale-95"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Pass Cheque (OK)</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
