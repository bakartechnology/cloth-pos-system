import { Staff, PermissionKey, StaffRole } from '@/types';
import { storageService } from './storageService';

export const authService = {
  getCurrentStaff(): Staff {
    const activeId = storageService.getActiveStaffId();
    const staffList = storageService.getStaff();
    const found = staffList.find(s => s.id === activeId) || staffList[0];
    const sessionCounter = storageService.getItem<string | null>('anf_active_counter_session', null);
    if (sessionCounter && found) {
      return { ...found, counter: sessionCounter };
    }
    return found;
  },

  setCurrentStaff(staffId: string): Staff | null {
    const staffList = storageService.getStaff();
    const found = staffList.find(s => s.id === staffId);
    if (!found) return null;
    storageService.setActiveStaffId(staffId);
    // When switching staff, adopt their default counter
    storageService.setItem('anf_active_counter_session', found.counter);
    return found;
  },

  updateCounter(newCounter: string): Staff | null {
    const current = this.getCurrentStaff();
    if (!current) return null;
    const cleanCounter = newCounter.trim();
    storageService.setItem('anf_active_counter_session', cleanCounter);
    const staffList = storageService.getStaff();
    const updatedList = staffList.map(s => (s.id === current.id ? { ...s, counter: cleanCounter } : s));
    storageService.setStaff(updatedList);
    return { ...current, counter: cleanCounter };
  },

  switchRole(role: StaffRole): Staff | null {
    const staffList = storageService.getStaff();
    const found = staffList.find(s => s.role === role);
    if (found) {
      storageService.setActiveStaffId(found.id);
      storageService.setItem('anf_active_counter_session', found.counter);
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

  login(username: string, password?: string, selectedCounter?: string): { success: boolean; staff?: Staff; error?: string } {
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
    if (selectedCounter && selectedCounter.trim()) {
      storageService.setItem('anf_active_counter_session', selectedCounter.trim());
      found.counter = selectedCounter.trim();
      const updatedList = staffList.map(s => (s.id === found.id ? { ...s, counter: selectedCounter.trim() } : s));
      storageService.setStaff(updatedList);
    } else {
      storageService.setItem('anf_active_counter_session', found.counter);
    }
    return { success: true, staff: found };
  },

  logout(): void {
    storageService.removeItem('anf_active_counter_session');
  },
};
