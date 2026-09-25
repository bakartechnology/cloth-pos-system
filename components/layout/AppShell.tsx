'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { GlobalSearchModal } from './GlobalSearchModal';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Global Keyboard Shortcuts (F4: Retail POS, F5: Wholesale POS, F6: Khata POS, Ctrl+K: Search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + K or Cmd + K => Global Search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
        return;
      }

      // F4 => Retail POS Register
      if (e.key === 'F4') {
        e.preventDefault();
        e.stopPropagation();
        if (hasPermission('pos_retail')) {
          router.push('/pos/retail');
        } else {
          toast({
            title: 'Access Restricted',
            description: 'Your account does not have permission to access Retail POS (F4).',
            type: 'error',
          });
        }
        return;
      }

      // F5 => Wholesale & Bulk POS (CRITICAL: prevent browser page reload)
      if (e.key === 'F5') {
        e.preventDefault();
        e.stopPropagation();
        if (hasPermission('pos_wholesale')) {
          router.push('/pos/wholesale');
        } else {
          toast({
            title: 'Access Restricted',
            description: 'Your account does not have permission to access Wholesale POS (F5).',
            type: 'error',
          });
        }
        return;
      }

      // F6 => Khata Credit POS
      if (e.key === 'F6') {
        e.preventDefault();
        e.stopPropagation();
        if (hasPermission('pos_khata')) {
          router.push('/pos/khata');
        } else {
          toast({
            title: 'Access Restricted',
            description: 'Your account does not have permission to access Khata Credit POS (F6).',
            type: 'error',
          });
        }
        return;
      }
    };

    // Use capture phase to intercept F4, F5, F6 before browser or inputs intercept them
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [router, hasPermission, toast]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
      {/* Sidebar Navigation */}
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Body Area */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        <Header
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenSearch={() => setIsSearchOpen(true)}
        />

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 max-w-[2100px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Global Command Palette (Ctrl + K) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </div>
  );
}
