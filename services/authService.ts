import { Staff, PermissionKey, StaffRole } from '@/types';
import { storageService } from './storageService';

const ADMIN_SESSION_KEY = 'anf_session_admin_active';

export const authService = {
  getCurrentStaff(): Staff | null {
    const activeId = storageService.getActiveStaffId();
    if (!activeId) return null;
    const staffList = storageService.getStaff();
    return staffList.find(s => s.id === activeId) || null;
  },

  isAdminSession(): boolean {
    const current = this.getCurrentStaff();
    if (current && current.role === 'Admin') return true;
    return storageService.getItem<boolean>(ADMIN_SESSION_KEY, false);
  },

  setCurrentStaff(staffId: string): Staff | null {
    const staffList = storageService.getStaff();
    const found = staffList.find(s => s.id === staffId);
    if (!found) return null;
    storageService.setActiveStaffId(staffId);
    if (found.role === 'Admin') {
      storageService.setItem(ADMIN_SESSION_KEY, true);
    } else {
      storageService.removeItem(ADMIN_SESSION_KEY);
    }
    return found;
  },

  switchRole(role: StaffRole): Staff | null {
    // Only permit role switching if an Administrator session is active
    if (!this.isAdminSession()) {
      console.warn('Unauthorized role switch attempt blocked: Only Admins can switch roles.');
      return null;
    }

    const staffList = storageService.getStaff();
    const found = staffList.find(s => s.role === role);
    if (found) {
      // Retain admin session state so admin can switch back to Admin role
      storageService.setItem(ADMIN_SESSION_KEY, true);
      storageService.setActiveStaffId(found.id);
      return found;
    }
    return null;
  },

  hasPermission(permission: PermissionKey, staff?: Staff): boolean {
    const current = staff || this.getCurrentStaff();
    if (!current) return false;
    // Strictly restrict dashboard_view to Admin only
    if (permission === 'dashboard_view') {
      return current.role === 'Admin';
    }
    // Admin has universal access
    if (current.role === 'Admin') return true;
    return current.permissions.includes(permission);
  },

  login(username: string, password?: string): { success: boolean; staff?: Staff; error?: string } {
    const cleanUser = username.trim().toLowerCase();
    const staffList = storageService.getStaff();
    const found = staffList.find(s => s.username.toLowerCase() === cleanUser);

    if (!found) {
      return { success: false, error: 'Staff account not found. Please check your username.' };
    }

    if (found.status !== 'Active') {
      return { success: false, error: 'This staff account has been deactivated.' };
    }

    if (found.password && found.password !== (password || '')) {
      return { success: false, error: 'Incorrect password. Please verify your counter security credentials.' };
    }

    // Set or clear admin session flag based on the logging in staff's role
    if (found.role === 'Admin') {
      storageService.setItem(ADMIN_SESSION_KEY, true);
    } else {
      storageService.removeItem(ADMIN_SESSION_KEY);
    }

    storageService.setActiveStaffId(found.id);
    return { success: true, staff: found };
  },

  logout(): void {
    storageService.removeItem(ADMIN_SESSION_KEY);
    storageService.clearActiveStaff();
  },
};

