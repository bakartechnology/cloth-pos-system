/**
 * Khata Credit POS Session Persistence Service
 * 
 * Persists active Khata Credit POS draft states (customer name, selected Khata client/account,
 * cart items, product quantities, prices, discounts, payment method, cash received, notes)
 * across browser sessions, reboots, and night shutdowns.
 * 
 * Staff-specific: Staff A's draft is stored independently of Staff B's draft.
 */

import { KhataSessionDraft } from '@/types';

const DRAFT_PREFIX = 'anf_pos_khata_draft_';

class KhataSessionService {
  private isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  private getKey(staffId: string): string {
    const cleanId = staffId ? staffId.trim() : 'default';
    return `${DRAFT_PREFIX}${cleanId}_v1`;
  }

  private getDiscardKey(staffId: string): string {
    const cleanId = staffId ? staffId.trim() : 'default';
    return `${DRAFT_PREFIX}${cleanId}_discarded_v1`;
  }

  /**
   * Saves current active Khata cart and draft parameters for the logged-in staff member.
   * Only persists when there are real cart items in progress.
   */
  saveDraft(
    staffId: string,
    draft: Omit<KhataSessionDraft, 'id' | 'timestamp' | 'staffId'>
  ): void {
    if (!this.isBrowser() || !staffId) return;

    try {
      const hasItems = Array.isArray(draft.cartItems) && draft.cartItems.length > 0;

      // An empty cart is never an unfinished session draft
      if (!hasItems) {
        this.clearDraft(staffId);
        return;
      }

      const payload: KhataSessionDraft = {
        ...draft,
        id: `kht-draft-${Date.now()}`,
        staffId,
        timestamp: new Date().toISOString(),
      };

      localStorage.setItem(this.getKey(staffId), JSON.stringify(payload));
      // Remove any previous discard marker since user is actively working with new cart items
      localStorage.removeItem(this.getDiscardKey(staffId));
    } catch (err) {
      console.error('Failed to save Khata POS session draft:', err);
    }
  }

  /**
   * Retrieves active draft for a given staff member if one exists
   */
  getDraft(staffId: string): KhataSessionDraft | null {
    if (!this.isBrowser() || !staffId) return null;

    try {
      const raw = localStorage.getItem(this.getKey(staffId));
      if (!raw) return null;

      const parsed = JSON.parse(raw) as KhataSessionDraft;
      if (!parsed) return null;

      // Check discard marker
      const discardRaw = localStorage.getItem(this.getDiscardKey(staffId));
      if (discardRaw) {
        const discardedAt = parseInt(discardRaw, 10);
        const draftTime = new Date(parsed.timestamp).getTime();
        if (discardedAt >= draftTime) {
          // Draft was explicitly discarded; clean up
          this.clearDraft(staffId);
          return null;
        }
      }

      const hasItems = Array.isArray(parsed.cartItems) && parsed.cartItems.length > 0;
      if (hasItems) {
        return parsed;
      }

      this.clearDraft(staffId);
      return null;
    } catch (err) {
      console.warn('Failed to parse Khata POS draft, clearing corrupt entry:', err);
      this.clearDraft(staffId);
      return null;
    }
  }

  /**
   * Permanently discards the active draft and records the discard state
   */
  discardDraft(staffId: string): void {
    if (!this.isBrowser() || !staffId) return;

    try {
      localStorage.removeItem(this.getKey(staffId));
      localStorage.setItem(this.getDiscardKey(staffId), String(Date.now()));
    } catch (err) {
      console.error('Failed to discard Khata POS draft:', err);
    }
  }

  /**
   * Clears saved draft once completed or cleared
   */
  clearDraft(staffId: string): void {
    if (!this.isBrowser() || !staffId) return;

    try {
      localStorage.removeItem(this.getKey(staffId));
    } catch (err) {
      console.error('Failed to clear Khata POS draft:', err);
    }
  }
}

export const khataSessionService = new KhataSessionService();
