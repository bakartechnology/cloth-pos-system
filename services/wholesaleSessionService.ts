/**
 * Wholesale POS Session Persistence Service
 * 
 * Persists active Wholesale & Bulk POS draft states (customer name, selected wholesale client,
 * cart items, product quantities, prices, discounts, payment method, cash received, bank selection,
 * notes) across browser sessions, reboots, and night shutdowns.
 * 
 * Staff-specific: Staff A's draft is stored independently of Staff B's draft.
 */

import { WholesaleSessionDraft } from '@/types';

const DRAFT_PREFIX = 'anf_pos_wholesale_draft_';

class WholesaleSessionService {
  private isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  private getKey(staffId: string): string {
    const cleanId = staffId ? staffId.trim() : 'default';
    return `${DRAFT_PREFIX}${cleanId}_v1`;
  }

  /**
   * Saves current active wholesale cart and draft parameters for the logged-in staff member
   */
  saveDraft(
    staffId: string,
    draft: Omit<WholesaleSessionDraft, 'id' | 'timestamp' | 'staffId'>
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

      const payload: WholesaleSessionDraft = {
        ...draft,
        id: `whl-draft-${Date.now()}`,
        staffId,
        timestamp: new Date().toISOString(),
      };

      localStorage.setItem(this.getKey(staffId), JSON.stringify(payload));
    } catch (err) {
      console.error('Failed to save Wholesale POS session draft:', err);
    }
  }

  /**
   * Retrieves active draft for a given staff member if one exists
   */
  getDraft(staffId: string): WholesaleSessionDraft | null {
    if (!this.isBrowser() || !staffId) return null;

    try {
      const raw = localStorage.getItem(this.getKey(staffId));
      if (!raw) return null;

      const parsed = JSON.parse(raw) as WholesaleSessionDraft;
      if (!parsed) return null;

      // Validate that it has real content
      const hasItems = Array.isArray(parsed.cartItems) && parsed.cartItems.length > 0;
      const hasCustomer = Boolean(parsed.customerName?.trim());
      const hasClient = Boolean(parsed.selectedClient);

      if (hasItems || hasCustomer || hasClient) {
        return parsed;
      }

      return null;
    } catch (err) {
      console.warn('Failed to parse Wholesale POS draft, clearing corrupt entry:', err);
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
      console.error('Failed to clear Wholesale POS draft:', err);
    }
  }
}

export const wholesaleSessionService = new WholesaleSessionService();
