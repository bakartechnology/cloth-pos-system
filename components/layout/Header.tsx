'use client';

import React, { useState, useEffect } from 'react';
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  Store,
  LogOut,
  AlertTriangle,
  Sparkles,
  Shield,
  UserCheck,
  Check,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { StaffRole } from '@/types';
import { inventoryService } from '@/services/inventoryService';
import { paymentsService } from '@/services/paymentsService';
import { useToast } from '@/context/ToastContext';
import Link from 'next/link';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  onOpenSearch: () => void;
}

export function Header({ onOpenMobileMenu, onOpenSearch }: HeaderProps) {
  const { currentStaff, switchRole, hasPermission } = useAuth();
  const { toast } = useToast();
  const [selectedBranch, setSelectedBranch] = useState('Main Branch');
  const [isBranchMenuOpen, setIsBranchMenuOpen] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [dueCheques, setDueCheques] = useState<ReturnType<typeof paymentsService.getDueCheques>>([]);

  const branches = [
    'Main Branch',
    'Liberty Market Branch',
    'Anarkali Wholesale Depot',
  ];

  const canViewChequeNotifs =
    currentStaff?.role === 'Admin' ||
    hasPermission('cheque_notifications') ||
    hasPermission('payment_collection');

  // Check low stock count & due cheques
  useEffect(() => {
    const low = inventoryService.getLowStockProducts(10);
    setLowStockCount(low.length);

    if (canViewChequeNotifs) {
      const due = paymentsService.getDueCheques();
      setDueCheques(due);
    }
  }, [canViewChequeNotifs]);

  const roles: StaffRole[] = [
    'Admin',
    'Retail Cashier',
    'Wholesale Cashier',
    'Khata Staff',
    'Stock Manager',
    'Payment Collection Staff',
  ];

  const handleRoleChange = (role: StaffRole) => {
    switchRole(role);
    setIsRoleMenuOpen(false);
    toast({
      title: `Switched Role to ${role}`,
      description: `Screen permissions updated for ${role}.`,
      type: 'info',
    });
  };

  return (
    <header className="sticky top-0 z-20 h-16 bg-white border-b border-[#DCE3E0] px-4 sm:px-6 flex items-center justify-between gap-4 no-print shadow-2xs">
      {/* Left: Mobile trigger & Search Input */}
      <div className="flex items-center gap-3 flex-1 max-w-lg">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl text-[#66726D] hover:text-[#17211D] hover:bg-[#F0F4F2] transition-colors cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Bar Button */}
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#F0F4F2] hover:bg-[#E9F3EF]/70 border border-[#DCE3E0] text-[#66726D] text-xs transition-all duration-150 group cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Search className="w-4 h-4 text-[#8A9590] group-hover:text-[#197A5A] transition-colors shrink-0" />
            <span className="text-[#8A9590] truncate">Search sales, customers, products</span>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 font-mono text-[10px] bg-white border border-[#DCE3E0] rounded shadow-2xs text-[#66726D]">
              ⌘ K
            </kbd>
          </div>
        </button>
      </div>

      {/* Right: Branch Selector, Notifications & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Branch Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsBranchMenuOpen(!isBranchMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#DCE3E0] bg-white hover:bg-[#F0F4F2] transition-colors text-xs font-semibold text-[#17211D] shadow-2xs cursor-pointer"
          >
            <Store className="w-3.5 h-3.5 text-[#197A5A]" />
            <span className="hidden sm:inline">{selectedBranch}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#8A9590]" />
          </button>

          {isBranchMenuOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-[#DCE3E0] p-1.5 z-40 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1.5 text-[10px] font-bold text-[#8A9590] uppercase tracking-wider">
                Select Store Outlet
              </div>
              <div className="space-y-0.5 mt-1">
                {branches.map(branch => (
                  <button
                    key={branch}
                    onClick={() => {
                      setSelectedBranch(branch);
                      setIsBranchMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left ${
                      selectedBranch === branch
                        ? 'bg-[#DCEDE6] text-[#125E45] font-semibold'
                        : 'text-[#17211D] hover:bg-[#F0F4F2]'
                    }`}
                  >
                    <span>{branch}</span>
                    {selectedBranch === branch && (
                      <Check className="w-3.5 h-3.5 text-[#125E45]" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 rounded-xl border border-[#DCE3E0] bg-white hover:bg-[#F0F4F2] transition-colors text-[#66726D] hover:text-[#17211D] shadow-2xs cursor-pointer"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {(lowStockCount > 0 || dueCheques.length > 0) && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#9A6A16] rounded-full ring-2 ring-white" />
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-[#DCE3E0] p-4 z-40 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-[#DCE3E0]">
                <div className="font-bold text-xs text-[#17211D] uppercase tracking-wider">
                  Store Notifications
                </div>
                <span className="text-[10px] font-semibold bg-[#DCEDE6] text-[#125E45] px-2 py-0.5 rounded-full">
                  Live
                </span>
              </div>
              <div className="py-2 space-y-2.5 max-h-72 overflow-y-auto">
                {dueCheques.length > 0 && canViewChequeNotifs && (
                  <div className="space-y-2">
                    {dueCheques.map(item => (
                      <div
                        key={`${item.collectionId}-${item.cheque.id}`}
                        className="p-2.5 rounded-xl bg-[#F7EEDC] border border-[#F7EEDC] text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#9A6A16] flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#9A6A16] animate-pulse" />
                            Cheque Due Today
                          </span>
                          <span className="font-mono text-[10px] font-bold text-[#9A6A16] bg-white/70 px-1.5 py-0.5 rounded">
                            Rs. {item.cheque.chequeAmount.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#17211D] leading-relaxed">
                          Cheque due today. Customer: <span className="font-semibold">{item.customerName}</span>.
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {lowStockCount > 0 && (
                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#F7EEDC]/60 border border-[#F7EEDC] text-xs">
                    <AlertTriangle className="w-4 h-4 text-[#9A6A16] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-[#17211D]">Low Stock Alert</div>
                      <div className="text-[11px] text-[#66726D] mt-0.5">
                        {lowStockCount} items are running below minimum stock threshold.
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#E9F3EF] border border-[#DCEDE6] text-xs">
                  <Sparkles className="w-4 h-4 text-[#197A5A] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-[#17211D]">Ledgerly POS System</div>
                    <div className="text-[11px] text-[#66726D] mt-0.5">
                      All systems operating normally. High availability enabled.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Avatar & Role Menu */}
        <div className="relative">
          <button
            onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
            className="flex items-center gap-2.5 pl-1.5 pr-2 py-1 rounded-xl hover:bg-[#F0F4F2] transition-colors text-left cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-[#DCEDE6] text-[#125E45] font-bold text-xs flex items-center justify-center shrink-0">
              AR
            </div>
            <div className="hidden sm:block leading-tight">
              <div className="text-xs font-bold text-[#17211D] truncate max-w-[130px]">
                {currentStaff?.name || 'Abdul Rehman'}
              </div>
              <div className="text-[10px] text-[#66726D] truncate">
                {currentStaff?.role === 'Admin' ? 'Owner' : currentStaff?.role || 'Owner'}
              </div>
            </div>
          </button>

          {isRoleMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-[#DCE3E0] p-2 z-40 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-[#DCE3E0]">
                <div className="text-[11px] font-bold text-[#8A9590] uppercase tracking-wider">
                  Active User
                </div>
                <div className="text-xs font-bold text-[#17211D] mt-0.5">
                  {currentStaff?.name || 'Abdul Rehman'}
                </div>
                <div className="text-[11px] text-[#66726D]">
                  Role: {currentStaff?.role || 'Admin'}
                </div>
              </div>

              <div className="py-1 space-y-0.5">
                <div className="px-3 py-1 text-[10px] font-bold text-[#8A9590] uppercase tracking-wider">
                  Switch Role
                </div>
                {roles.map(role => {
                  const isSelected = currentStaff?.role === role;
                  return (
                    <button
                      key={role}
                      onClick={() => handleRoleChange(role)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left ${
                        isSelected
                          ? 'bg-[#DCEDE6] text-[#125E45] font-semibold'
                          : 'text-[#17211D] hover:bg-[#F0F4F2]'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {role === 'Admin' ? (
                          <Shield className="w-3.5 h-3.5 text-[#197A5A]" />
                        ) : (
                          <UserCheck className="w-3.5 h-3.5 text-[#8A9590]" />
                        )}
                        {role}
                      </span>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-[#125E45] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-[#DCE3E0]">
                <Link
                  href="/login"
                  prefetch={false}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-[#66726D] hover:text-[#17211D] rounded-xl hover:bg-[#F0F4F2] transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Go to Login Screen</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
