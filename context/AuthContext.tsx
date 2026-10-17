'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Staff, PermissionKey, StaffRole } from '@/types';
import { authService } from '@/services/authService';
import { storageService } from '@/services/storageService';

interface AuthContextType {
  currentStaff: Staff | null;
  isLoading: boolean;
  switchRole: (role: StaffRole) => void;
  setStaff: (staffId: string) => void;
  hasPermission: (permission: PermissionKey) => boolean;
  refreshStaff: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshStaff = () => {
    const staff = authService.getCurrentStaff();
    setCurrentStaff(staff);
  };

  useEffect(() => {
    refreshStaff();
    setIsLoading(false);
  }, []);

  const handleSwitchRole = (role: StaffRole) => {
    const switched = authService.switchRole(role);
    if (switched) {
      setCurrentStaff(switched);
    }
  };

  const handleSetStaff = (staffId: string) => {
    const updated = authService.setCurrentStaff(staffId);
    if (updated) {
      setCurrentStaff(updated);
    }
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
        switchRole: handleSwitchRole,
        setStaff: handleSetStaff,
        hasPermission,
        refreshStaff,
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
