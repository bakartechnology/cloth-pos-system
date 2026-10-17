'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Staff, PermissionKey, StaffRole } from '@/types';
import { authService } from '@/services/authService';
import { storageService } from '@/services/storageService';

interface AuthContextType {
  currentStaff: Staff | null;
  isLoading: boolean;
  isAdminSession: boolean;
  switchRole: (role: StaffRole) => boolean;
  setStaff: (staffId: string) => void;
  hasPermission: (permission: PermissionKey) => boolean;
  refreshStaff: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(null);
  const [isAdminSession, setIsAdminSession] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshStaff = () => {
    const staff = authService.getCurrentStaff();
    setCurrentStaff(staff);
    setIsAdminSession(authService.isAdminSession());
  };

  useEffect(() => {
    refreshStaff();
    setIsLoading(false);
  }, []);

  const handleSwitchRole = (role: StaffRole): boolean => {
    const switched = authService.switchRole(role);
    if (switched) {
      setCurrentStaff(switched);
      setIsAdminSession(authService.isAdminSession());
      return true;
    }
    return false;
  };

  const handleSetStaff = (staffId: string) => {
    const updated = authService.setCurrentStaff(staffId);
    if (updated) {
      setCurrentStaff(updated);
      setIsAdminSession(authService.isAdminSession());
    }
  };

  const handleLogout = () => {
    authService.logout();
    refreshStaff();
  };

  const hasPermission = (permission: PermissionKey): boolean => {
    if (!currentStaff) return false;
    if (currentStaff.role === 'Admin') return true;
    return currentStaff.permissions.includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{
        currentStaff,
        isLoading,
        isAdminSession,
        switchRole: handleSwitchRole,
        setStaff: handleSetStaff,
        hasPermission,
        refreshStaff,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
