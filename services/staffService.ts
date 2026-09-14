import { Staff, StaffAttendance, PermissionKey } from '@/types';
import { storageService } from './storageService';

export const staffService = {
  getAll(): Staff[] {
    return storageService.getStaff();
  },

  getById(id: string): Staff | undefined {
    return storageService.getStaff().find(s => s.id === id);
  },

  getByUsername(username: string): Staff | undefined {
    return storageService.getStaff().find(s => s.username.toLowerCase() === username.toLowerCase());
  },

  add(staffData: Omit<Staff, 'id' | 'joinedDate'>): Staff {
    const staff = storageService.getStaff();
    const newStaff: Staff = {
      ...staffData,
      id: `stf-${Date.now().toString().slice(-6)}`,
      joinedDate: new Date().toISOString().split('T')[0],
    };

    storageService.setStaff([newStaff, ...staff]);
    return newStaff;
  },

  update(id: string, updates: Partial<Staff>): Staff | null {
    const staff = storageService.getStaff();
    const index = staff.findIndex(s => s.id === id);
    if (index === -1) return null;

    staff[index] = { ...staff[index], ...updates };
    storageService.setStaff([...staff]);
    return staff[index];
  },

  updatePermissions(staffId: string, permissions: PermissionKey[]): boolean {
    const staff = storageService.getStaff();
    const index = staff.findIndex(s => s.id === staffId);
    if (index === -1) return false;

    staff[index].permissions = permissions;
    storageService.setStaff([...staff]);
    return true;
  },

  // Attendance
  getAttendance(dateFilter?: string): StaffAttendance[] {
    const attendance = storageService.getAttendance();
    if (!dateFilter) return attendance;
    return attendance.filter(a => a.date === dateFilter);
  },

  markAttendance(record: Omit<StaffAttendance, 'id'>): StaffAttendance {
    const attendance = storageService.getAttendance();
    const existingIndex = attendance.findIndex(
      a => a.staffId === record.staffId && a.date === record.date
    );

    if (existingIndex !== -1) {
      attendance[existingIndex] = { ...attendance[existingIndex], ...record };
      storageService.setAttendance([...attendance]);
      return attendance[existingIndex];
    } else {
      const newAtt: StaffAttendance = {
        ...record,
        id: `att-${Date.now().toString().slice(-6)}`,
      };
      storageService.setAttendance([newAtt, ...attendance]);
      return newAtt;
    }
  },
};
