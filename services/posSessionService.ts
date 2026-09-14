/**
 * POS Session Persistence Service
 * 
 * Persists active Retail POS draft states (cart, customer info, notes, selected category)
 * across browser sessions, reboots, and night shutdowns.
 * Provides detection for unfinished sale drafts with "Resume Sale" or "Discard Draft" controls.
 */

import { CartItem } from '@/types';

export interface PosSessionDraft {
  id: string;
  timestamp: string;
  invoiceNumberDraft?: string;
  cartItems: CartItem[];
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  selectedCategory?: string;
}

const DRAFT_STORAGE_KEY = 'anf_pos_retail_draft_session_v1';

class PosSessionService {
  private isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  /**
   * Saves current active cart and draft parameters
   */
  saveDraft(draft: Omit<PosSessionDraft, 'id' | 'timestamp'>): void {
    if (!this.isBrowser()) return;
    try {
      if (draft.cartItems.length === 0 && !draft.customerName && !draft.notes) {
        // Nothing to save
        this.clearDraft();
        return;
      }

      const payload: PosSessionDraft = {
        ...draft,
        id: `draft-${Date.now()}`,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error('Failed to save POS session draft:', e);
    }
  }

  /**
   * Retrieves active draft if one exists
   */
  getDraft(): PosSessionDraft | null {
    if (!this.isBrowser()) return null;
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PosSessionDraft;
      // Only treat as draft if it has items or customer
      if (parsed && (parsed.cartItems?.length > 0 || parsed.customerName)) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Clears saved draft once completed or explicitly discarded
   */
  clearDraft(): void {
    if (!this.isBrowser()) return;
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear POS draft:', e);
    }
  }
}

export const posSessionService = new PosSessionService();
