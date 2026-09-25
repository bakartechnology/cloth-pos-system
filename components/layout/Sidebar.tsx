'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Truck,
  BookOpen,
  Package,
  Layers,
  Barcode,
  Users,
  Receipt,
  BarChart3,
  UserCog,
  CalendarCheck,
  Banknote,
  Settings,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Briefcase,
  FileText,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PermissionKey } from '@/types';

interface SidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  permission?: PermissionKey;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

// Persistent in-memory and session storage across page component unmounts
let cachedSidebarScroll = 0;

export function Sidebar({ isMobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { hasPermission, currentStaff } = useAuth();
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('anf_sidebar_collapsed') === 'true';
    }
    return false;
  });

  // Restore sidebar scroll position across navigation and remounts
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('anf_sidebar_scroll_v1');
        if (saved) {
          cachedSidebarScroll = parseInt(saved, 10) || 0;
        }
      } catch {}
    }

    if (scrollRef.current) {
      if (cachedSidebarScroll > 0) {
        scrollRef.current.scrollTop = cachedSidebarScroll;
      }

      // If active item is genuinely off-screen, bring into view gently
      const activeEl = scrollRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        const containerRect = scrollRef.current.getBoundingClientRect();
        const elRect = activeEl.getBoundingClientRect();
        const isAbove = elRect.top < containerRect.top;
        const isBelow = elRect.bottom > containerRect.bottom;
        if (isAbove || isBelow) {
          activeEl.scrollIntoView({ block: 'nearest' });
          cachedSidebarScroll = scrollRef.current.scrollTop;
        }
      }
    }
  }, [pathname]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    cachedSidebarScroll = e.currentTarget.scrollTop;
    try {
      sessionStorage.setItem('anf_sidebar_scroll_v1', String(cachedSidebarScroll));
    } catch {}
  };

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem('anf_sidebar_collapsed', String(next));
  };

  const navSections: NavSection[] = [
    {
      title: 'MAIN',
      items: [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'dashboard_view' },
      ],
    },
    {
      title: 'POS TERMINALS',
      items: [
        { label: 'Retail POS', href: '/pos/retail', icon: ShoppingCart, permission: 'pos_retail', badge: 'F4' },
        { label: 'Wholesale POS', href: '/pos/wholesale', icon: Truck, permission: 'pos_wholesale', badge: 'F5' },
        { label: 'Khata Credit POS', href: '/pos/khata', icon: BookOpen, permission: 'pos_khata', badge: 'F6' },
      ],
    },
    {
      title: 'INVENTORY & FABRICS',
      items: [
        { label: 'All Products', href: '/products', icon: Package, permission: 'stock_view' },
        { label: 'Stock Overview', href: '/inventory/stock', icon: Layers, permission: 'stock_view' },
        { label: 'Stock Movements', href: '/inventory/stock-history', icon: TrendingUp, permission: 'stock_view' },
        { label: 'Barcode Studio', href: '/barcodes', icon: Barcode, permission: 'barcode_view' },
      ],
    },
    {
      title: 'SALES & STATEMENTS',
      items: [
        { label: 'Bill History', href: '/bills', icon: Receipt, permission: 'bills_view' },
        { label: 'Customers CRM', href: '/customers', icon: Users, permission: 'customers_view' },
        { label: 'Khata Ledgers (5-Yr)', href: '/customers/khata', icon: BookOpen, permission: 'customers_view' },
        { label: 'Retail Statement', href: '/statements/retail', icon: FileText, permission: 'retail_statement_view' },
        { label: 'Wholesale Statement', href: '/statements/wholesale', icon: Receipt, permission: 'wholesale_statement_view' },
        { label: 'Field Recovery', href: '/payments', icon: Banknote, permission: 'payment_collection' },
        { label: 'Wholesale Recovery', href: '/payments/wholesale', icon: Truck, permission: 'wholesale_recovery' },
        { label: 'Staff Khata', href: '/staff-khata', icon: Briefcase, permission: 'staff_khata', badge: 'Outstation' },
      ],
    },
    {
      title: 'ANALYTICS & REPORTS',
      items: [
        { label: 'Reports Hub (5-Yr)', href: '/reports', icon: BarChart3, permission: 'reports_view' },
      ],
    },
    {
      title: 'STAFF & TEAM',
      items: [
        { label: 'Staff Directory', href: '/staff', icon: UserCog, permission: 'staff_view' },
        { label: 'Permissions Matrix', href: '/staff/permissions', icon: Settings, permission: 'staff_view' },
        { label: 'Attendance Clock', href: '/staff/attendance', icon: CalendarCheck, permission: 'attendance_view' },
      ],
    },
    {
      title: 'PREFERENCES',
      items: [
        { label: 'Store Settings', href: '/settings', icon: Settings, permission: 'settings_view' },
      ],
    },
  ];

  const allNavHrefs = navSections.flatMap(s => s.items.map(i => i.href));

  const isItemActive = (itemHref: string): boolean => {
    if (pathname === itemHref) return true;
    if (allNavHrefs.includes(pathname)) return false;

    if (itemHref !== '/dashboard' && pathname.startsWith(itemHref + '/')) {
      const otherLongerMatch = allNavHrefs.some(
        other =>
          other !== itemHref &&
          other.length > itemHref.length &&
          pathname.startsWith(other + '/')
      );
      return !otherLongerMatch;
    }

    return false;
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-slate-800/80 shrink-0">
        <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/20 shrink-0">
            N
          </div>
          {!isCollapsed && (
            <div className="leading-tight truncate">
              <div className="font-extrabold text-sm tracking-wide text-white flex items-center gap-1.5">
                AL-NOOR <span className="text-[10px] px-1.5 py-0.2 bg-blue-500/20 text-cyan-400 font-mono rounded">POS</span>
              </div>
              <div className="text-[10px] text-slate-400 tracking-wider">FABRICS & TEXTILES</div>
            </div>
          )}
        </Link>

        {/* Collapse button on desktop */}
        <button
          onClick={toggleCollapse}
          className="hidden md:flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Close button on mobile drawer */}
        <button
          onClick={onMobileClose}
          className="flex md:hidden items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links Scrollable */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin"
      >
        {navSections.map((section, sIdx) => {
          // Filter items based on user's active permissions
          const visibleItems = section.items.filter(
            item => !item.permission || hasPermission(item.permission)
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={sIdx}>
              {!isCollapsed && (
                <div className="px-3 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {section.title}
                </div>
              )}
              <div className="space-y-1">
                {visibleItems.map((item, iIdx) => {
                  const isActive = isItemActive(item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={iIdx}
                      href={item.href}
                      scroll={false}
                      data-active={isActive ? 'true' : 'false'}
                      onClick={() => {
                        if (isMobileOpen) onMobileClose();
                      }}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 group ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80'
                      } ${isCollapsed ? 'justify-center px-0' : ''}`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-transform duration-150 ${
                          isActive ? 'text-white' : 'text-slate-400 group-hover:text-cyan-400'
                        }`}
                      />
                      {!isCollapsed && (
                        <>
                          <span className="truncate flex-1">{item.label}</span>
                          {item.badge && (
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                                isActive
                                  ? 'bg-blue-700 text-blue-100'
                                  : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Role / Cashier Badge */}
      <div className="p-3 border-t border-slate-800/80 shrink-0">
        {!isCollapsed ? (
          <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 font-bold text-xs">
              {currentStaff?.name.slice(0, 2).toUpperCase() || 'AD'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-white truncate">
                {currentStaff?.name || 'Administrator'}
              </div>
              <div className="text-[10px] text-cyan-400 font-medium truncate flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                {currentStaff?.role || 'Admin'}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center" title={`${currentStaff?.name} (${currentStaff?.role})`}>
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 font-bold text-xs">
              {currentStaff?.name.slice(0, 2).toUpperCase() || 'AD'}
            </div>
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
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
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
