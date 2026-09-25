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

  /**
   * Saves current active Khata cart and draft parameters for the logged-in staff member
   */
  saveDraft(
    staffId: string,
    draft: Omit<KhataSessionDraft, 'id' | 'timestamp' | 'staffId'>
  ): void {
    if (!this.isBrowser() || !staffId) return;

    try {
      // Check if draft has anything meaningful
      const hasItems = draft.cartItems && draft.cartItems.length > 0;
      const hasCustomer = Boolean(draft.customerName?.trim());
      const hasClient = Boolean(draft.selectedClient);
      const hasCash = draft.amountReceived > 0;
      const hasNotes = Boolean(draft.notes?.trim());

      if (!hasItems && !hasCustomer && !hasClient && !hasCash && !hasNotes) {
        // Nothing meaningful to persist -> clear any previous draft
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

      const hasItems = Array.isArray(parsed.cartItems) && parsed.cartItems.length > 0;
      const hasCustomer = Boolean(parsed.customerName?.trim());
      const hasClient = Boolean(parsed.selectedClient);

      if (hasItems || hasCustomer || hasClient) {
        return parsed;
      }

      return null;
    } catch (err) {
      console.warn('Failed to parse Khata POS draft, clearing corrupt entry:', err);
      this.clearDraft(staffId);
      return null;
    }
  }

  /**
   * Clears saved draft once completed or explicitly discarded by the staff member
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
