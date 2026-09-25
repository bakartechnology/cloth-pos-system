import { Staff, PermissionKey, StaffRole } from '@/types';
import { storageService } from './storageService';

export const authService = {
  getCurrentStaff(): Staff {
    const activeId = storageService.getActiveStaffId();
    const staffList = storageService.getStaff();
    const found = staffList.find(s => s.id === activeId);
    if (found) return found;
    // Fallback to first staff or Admin
    return staffList[0];
  },

  setCurrentStaff(staffId: string): Staff | null {
    const staffList = storageService.getStaff();
    const found = staffList.find(s => s.id === staffId);
    if (!found) return null;
    storageService.setActiveStaffId(staffId);
    return found;
  },

  switchRole(role: StaffRole): Staff | null {
    const staffList = storageService.getStaff();
    const found = staffList.find(s => s.role === role);
    if (found) {
      storageService.setActiveStaffId(found.id);
      return found;
    }
    return null;
  },

  hasPermission(permission: PermissionKey, staff?: Staff): boolean {
    const current = staff || this.getCurrentStaff();
    if (!current) return false;
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

    storageService.setActiveStaffId(found.id);
    return { success: true, staff: found };
  },

  logout(): void {
    // For demo convenience, retain default admin or clear
  },
};
