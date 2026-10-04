'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  ShoppingBag,
  Package,
  BookOpen,
  Tag,
  Layers,
  Users,
  Banknote,
  TrendingUp,
  FileText,
  UserCheck,
  Settings,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  X,
  Barcode,
  History,
  Briefcase,
  ShieldCheck,
  Clock,
  Receipt,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PermissionKey } from '@/types';

interface SidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

interface SubNavItem {
  label: string;
  href: string;
  icon?: React.ElementType;
  permission?: PermissionKey;
}

interface NavCategory {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
  permission?: PermissionKey;
  subItems?: SubNavItem[];
}

let cachedSidebarScroll = 0;

export function Sidebar({ isMobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { hasPermission } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('anf_sidebar_collapsed') === 'true';
    }
    return false;
  });

  // Track expanded dropdown menus
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const navigation: NavCategory[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutGrid,
      permission: 'dashboard_view',
    },
    {
      id: 'retail-pos',
      label: 'Retail POS',
      href: '/pos/retail',
      icon: ShoppingBag,
      permission: 'pos_retail',
    },
    {
      id: 'wholesale-pos',
      label: 'Wholesale POS',
      href: '/pos/wholesale',
      icon: Package,
      permission: 'pos_wholesale',
    },
    {
      id: 'khata-pos',
      label: 'Khata/Credit POS',
      href: '/pos/khata',
      icon: BookOpen,
      permission: 'pos_khata',
    },
    {
      id: 'products',
      label: 'Products',
      href: '/products',
      icon: Tag,
      permission: 'stock_view',
      subItems: [
        { label: 'All Products', href: '/products', icon: Tag, permission: 'stock_view' },
        { label: 'Barcode Studio', href: '/barcodes', icon: Barcode, permission: 'barcode_view' },
      ],
    },
    {
      id: 'stock',
      label: 'Stock',
      href: '/inventory/stock',
      icon: Layers,
      permission: 'stock_view',
      subItems: [
        { label: 'Stock Overview', href: '/inventory/stock', icon: Layers, permission: 'stock_view' },
        { label: 'Stock Movements', href: '/inventory/stock-history', icon: History, permission: 'stock_view' },
      ],
    },
    {
      id: 'customers',
      label: 'Customers',
      href: '/customers',
      icon: Users,
      permission: 'customers_view',
      subItems: [
        { label: 'Customers CRM', href: '/customers', icon: Users, permission: 'customers_view' },
        { label: 'Khata Ledgers (5-Yr)', href: '/customers/khata', icon: BookOpen, permission: 'customers_view' },
      ],
    },
    {
      id: 'receivables',
      label: 'Receivables',
      href: '/payments',
      icon: Banknote,
      permission: 'payment_collection',
      subItems: [
        { label: 'Field Recovery', href: '/payments', icon: Banknote, permission: 'payment_collection' },
        { label: 'Wholesale Recovery', href: '/payments/wholesale', icon: Receipt, permission: 'wholesale_recovery' },
        { label: 'Staff Khata', href: '/staff-khata', icon: Briefcase, permission: 'staff_khata' },
      ],
    },
    {
      id: 'sales-reports',
      label: 'Sales Reports',
      href: '/reports',
      icon: TrendingUp,
      permission: 'reports_view',
      subItems: [
        { label: 'Reports Hub (5-Yr)', href: '/reports', icon: TrendingUp, permission: 'reports_view' },
        { label: 'Bill History', href: '/bills', icon: Receipt, permission: 'bills_view' },
      ],
    },
    {
      id: 'statements',
      label: 'Statements',
      href: '/statements/retail',
      icon: FileText,
      permission: 'retail_statement_view',
      subItems: [
        { label: 'Retail Statement', href: '/statements/retail', icon: FileText, permission: 'retail_statement_view' },
        { label: 'Wholesale Statement', href: '/statements/wholesale', icon: Receipt, permission: 'wholesale_statement_view' },
      ],
    },
    {
      id: 'staff',
      label: 'Staff',
      href: '/staff',
      icon: UserCheck,
      permission: 'staff_view',
      subItems: [
        { label: 'Staff Directory', href: '/staff', icon: UserCheck, permission: 'staff_view' },
        { label: 'Permissions Matrix', href: '/staff/permissions', icon: ShieldCheck, permission: 'staff_view' },
        { label: 'Attendance Clock', href: '/staff/attendance', icon: Clock, permission: 'attendance_view' },
      ],
    },
    {
      id: 'settings',
      label: 'Settings',
      href: '/settings',
      icon: Settings,
      permission: 'settings_view',
      subItems: [
        { label: 'Store Settings', href: '/settings', icon: Settings, permission: 'settings_view' },
      ],
    },
  ];

  // Auto-expand category if current route is within its subItems
  useEffect(() => {
    navigation.forEach(item => {
      if (item.subItems) {
        const matches = item.subItems.some(sub => pathname === sub.href || pathname.startsWith(sub.href + '/'));
        if (matches) {
          setExpandedCategories(prev => ({ ...prev, [item.id]: true }));
        }
      }
    });
  }, [pathname]);

  // Restore scroll
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('anf_sidebar_scroll_v2');
        if (saved) {
          cachedSidebarScroll = parseInt(saved, 10) || 0;
        }
      } catch {}
    }

    if (scrollRef.current && cachedSidebarScroll > 0) {
      scrollRef.current.scrollTop = cachedSidebarScroll;
    }
  }, [pathname]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    cachedSidebarScroll = e.currentTarget.scrollTop;
    try {
      sessionStorage.setItem('anf_sidebar_scroll_v2', String(cachedSidebarScroll));
    } catch {}
  };

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem('anf_sidebar_collapsed', String(next));
  };

  const toggleCategory = (catId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const isExactActive = (href: string) => pathname === href;

  const isCategoryActive = (item: NavCategory) => {
    if (pathname === item.href) return true;
    if (item.subItems) {
      return item.subItems.some(sub => pathname === sub.href || pathname.startsWith(sub.href + '/'));
    }
    return false;
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white text-[#17211D] border-r border-[#DCE3E0] select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-[#DCE3E0] shrink-0">
        <Link href="/dashboard" prefetch={false} className="flex items-center gap-3 overflow-hidden group">
          <div className="w-8 h-8 rounded-lg bg-[#197A5A] flex items-center justify-center text-white shadow-2xs shrink-0 group-hover:bg-[#125E45] transition-colors">
            <svg
              className="w-4 h-4 fill-current"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="3" y="3" width="8" height="8" rx="2" />
              <rect x="13" y="3" width="8" height="8" rx="2" />
              <rect x="3" y="13" width="8" height="8" rx="2" />
              <rect x="13" y="13" width="8" height="8" rx="2" />
            </svg>
          </div>
          {!isCollapsed && (
            <div className="leading-tight truncate">
              <div className="font-bold text-sm tracking-tight text-[#17211D]">
                Ledgerly
              </div>
              <div className="text-[11px] text-[#66726D]">Simple POS</div>
            </div>
          )}
        </Link>

        {/* Collapse button on desktop */}
        <button
          onClick={toggleCollapse}
          className="hidden md:flex items-center justify-center w-7 h-7 rounded-lg text-[#66726D] hover:text-[#17211D] hover:bg-[#F0F4F2] transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>

        {/* Close button on mobile drawer */}
        <button
          onClick={onMobileClose}
          className="flex md:hidden items-center justify-center w-7 h-7 rounded-lg text-[#66726D] hover:text-[#17211D] hover:bg-[#F0F4F2]"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation List */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-1 scrollbar-thin"
      >
        {navigation.map(item => {
          if (item.permission && !hasPermission(item.permission)) return null;

          const Icon = item.icon;
          const isActive = isCategoryActive(item);
          const hasChildren = item.subItems && item.subItems.length > 0;
          const isExpanded = !!expandedCategories[item.id];

          return (
            <div key={item.id} className="space-y-0.5">
              <div className="flex items-center">
                <Link
                  href={item.href}
                  prefetch={false}
                  onClick={() => {
                    if (hasChildren && !isExpanded) {
                      setExpandedCategories(prev => ({ ...prev, [item.id]: true }));
                    }
                    if (isMobileOpen && !hasChildren) onMobileClose();
                  }}
                  className={`flex-1 flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 group relative ${
                    isActive
                      ? 'bg-[#DCEDE6] text-[#125E45] font-semibold'
                      : 'text-[#66726D] hover:text-[#17211D] hover:bg-[#F0F4F2]'
                  } ${isCollapsed ? 'justify-center px-0' : ''}`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-[#125E45]' : 'text-[#66726D] group-hover:text-[#17211D]'
                    }`}
                  />
                  {!isCollapsed && (
                    <span className="truncate flex-1">{item.label}</span>
                  )}

                  {/* Active Indicator Vertical Pill on right edge */}
                  {isActive && !isCollapsed && (
                    <div className="w-1 h-4 rounded-full bg-[#125E45] shrink-0" />
                  )}
                </Link>

                {/* Dropdown toggle arrow if item has sub-items */}
                {hasChildren && !isCollapsed && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleCategory(item.id);
                    }}
                    className={`p-1.5 ml-0.5 rounded-lg text-[#8A9590] hover:text-[#17211D] hover:bg-[#F0F4F2] transition-colors`}
                    title="Toggle submenu"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>

              {/* Sub-items dropdown */}
              {hasChildren && isExpanded && !isCollapsed && (
                <div className="pl-6 pr-2 py-1 space-y-0.5 border-l-2 border-[#DCE3E0] ml-4 my-0.5 animate-in slide-in-from-top-1 duration-150">
                  {item.subItems!.map((sub, sIdx) => {
                    if (sub.permission && !hasPermission(sub.permission)) return null;
                    const isSubActive = isExactActive(sub.href);
                    const SubIcon = sub.icon;

                    return (
                      <Link
                        key={sIdx}
                        href={sub.href}
                        prefetch={false}
                        onClick={() => {
                          if (isMobileOpen) onMobileClose();
                        }}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                          isSubActive
                            ? 'bg-[#E9F3EF] text-[#125E45] font-semibold'
                            : 'text-[#66726D] hover:text-[#17211D] hover:bg-[#F0F4F2]'
                        }`}
                      >
                        {SubIcon && <SubIcon className="w-3.5 h-3.5 shrink-0 opacity-70" />}
                        <span className="truncate">{sub.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Store Status Card */}
      <div className="p-3 border-t border-[#DCE3E0] shrink-0">
        {!isCollapsed ? (
          <div className="p-3 rounded-xl bg-[#F0F4F2] border border-[#DCE3E0]">
            <div className="font-bold text-xs text-[#17211D] truncate">
              AL-NOOR FABRICS
            </div>
            <div className="text-[10px] text-[#66726D] mt-0.5 flex items-center gap-1.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#197A5A] animate-pulse shrink-0" />
              <span>All systems working · Last sync just now</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center" title="AL-NOOR FABRICS - All systems working">
            <span className="w-2.5 h-2.5 rounded-full bg-[#197A5A] animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:block shrink-0 transition-all duration-300 ease-in-out no-print ${
          isCollapsed ? 'w-18' : 'w-64'
        }`}
      >
        <div className="fixed top-0 bottom-0 z-30 h-full overflow-hidden transition-all duration-300">
          <div className={`${isCollapsed ? 'w-18' : 'w-64'} h-full transition-all duration-300`}>
            {sidebarContent}
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden no-print">
          <div
            className="fixed inset-0 bg-[#17211D]/40 backdrop-blur-xs transition-opacity"
            onClick={onMobileClose}
          />
          <div className="fixed top-0 bottom-0 left-0 w-72 max-w-[85vw] shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
