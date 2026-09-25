/**
 * Five-Year Rolling Statement Retention Service
 * Ensures Retail Statement, Wholesale Statement, and Khata Ledger retain
 * exactly the active 5-year rolling window based on transaction/record date,
 * safely archiving older records to prevent blind permanent deletion.
 */

export const RETENTION_POLICY_YEARS = 5;
const ARCHIVE_STORAGE_KEY = 'anf_pos_statements_archive_v1';

export const retentionService = {
  /**
   * Get the current operational base year (defaults to current year or 2026 in production mock)
   */
  getBaseYear(): number {
    return new Date().getFullYear();
  },

  /**
   * Get list of the 5 active retention years [current, current-1, ..., current-4]
   */
  getActiveRetentionYears(baseYear?: number): number[] {
    const current = baseYear || this.getBaseYear();
    const years: number[] = [];
    for (let i = 0; i < RETENTION_POLICY_YEARS; i++) {
      years.push(current - i);
    }
    return years;
  },

  /**
   * Check if a record date falls within the 5-year rolling window
   */
  isWithinRetentionWindow(dateString: string | undefined, baseYear?: number): boolean {
    if (!dateString) return true;
    try {
      const recordYear = new Date(dateString).getFullYear();
      if (isNaN(recordYear)) return true;
      const current = baseYear || this.getBaseYear();
      const cutoffYear = current - (RETENTION_POLICY_YEARS - 1);
      return recordYear >= cutoffYear && recordYear <= current + 1;
    } catch {
      return true;
    }
  },

  /**
   * Filter active statement items according to the 5-year rolling window
   */
  filterActiveStatements<T extends { date?: string; createdAt?: string }>(
    items: T[],
    baseYear?: number
  ): T[] {
    return items.filter(item => {
      const d = item.date || item.createdAt;
      return this.isWithinRetentionWindow(d, baseYear);
    });
  },

  /**
   * Safely archive records that fall outside the 5-year rolling window.
   * Preserves data in the dedicated archive storage rather than blind deletion.
   */
  archiveExpiredRecords<T extends { id?: string; date?: string; createdAt?: string }>(
    items: T[],
    category: 'Retail' | 'Wholesale' | 'Khata',
    baseYear?: number
  ): { active: T[]; archivedCount: number } {
    const active: T[] = [];
    const toArchive: T[] = [];

    items.forEach(item => {
      const d = item.date || item.createdAt;
      if (this.isWithinRetentionWindow(d, baseYear)) {
        active.push(item);
      } else {
        toArchive.push(item);
      }
    });

    if (toArchive.length > 0 && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(ARCHIVE_STORAGE_KEY);
        const archive = raw ? JSON.parse(raw) : { Retail: [], Wholesale: [], Khata: [] };
        archive[category] = [...(archive[category] || []), ...toArchive];
        localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(archive));
      } catch (e) {
        console.warn('Unable to persist archived statements to local storage', e);
      }
    }

    return { active, archivedCount: toArchive.length };
  },

  /**
   * Retrieve archived records if needed for administrative audit
   */
  getArchivedRecords(category: 'Retail' | 'Wholesale' | 'Khata'): any[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(ARCHIVE_STORAGE_KEY);
      if (!raw) return [];
      const archive = JSON.parse(raw);
      return archive[category] || [];
    } catch {
      return [];
    }
  },
};
