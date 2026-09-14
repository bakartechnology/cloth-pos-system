/**
 * Cash Drawer Hardware Service
 * 
 * Hardware abstraction layer for cash drawer kick commands.
 * In production, this service can dispatch ESC/POS kick codes (e.g. 27, 112, 0, 25, 250)
 * via WebUSB, Web Serial, Electron IPC, or a local POS hardware bridge.
 * In this frontend environment, it simulates the drawer cycle with realistic timing.
 */

export interface CashDrawerResult {
  success: boolean;
  message: string;
  timestamp: string;
}

class CashDrawerService {
  private isAvailable: boolean = true;
  private isOpen: boolean = false;
  private listeners: ((isOpen: boolean) => void)[] = [];

  /**
   * Check if cash drawer hardware or bridge is available
   */
  isCashDrawerAvailable(): boolean {
    return this.isAvailable;
  }

  /**
   * Set availability (for testing failure states)
   */
  setAvailability(available: boolean): void {
    this.isAvailable = available;
  }

  /**
   * Check if drawer is currently physically open
   */
  isDrawerOpen(): boolean {
    return this.isOpen;
  }

  /**
   * Subscribe to drawer state changes
   */
  subscribe(listener: (isOpen: boolean) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l(this.isOpen));
  }

  /**
   * Send the electrical kick signal to open the cash drawer
   */
  async openCashDrawer(): Promise<CashDrawerResult> {
    if (!this.isAvailable) {
      return {
        success: false,
        message: 'Cash drawer unavailable or disconnected. Please verify connection.',
        timestamp: new Date().toISOString(),
      };
    }

    // Realistic electronic kick latency (150ms)
    await new Promise(resolve => setTimeout(resolve, 150));

    this.isOpen = true;
    this.notifyListeners();

    // Play subtle kick beep or audio simulation if supported
    this.playDrawerChime();

    return {
      success: true,
      message: 'Cash drawer opened successfully.',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Confirm that cashier put the cash in and closed the drawer
   */
  closeDrawer(): void {
    this.isOpen = false;
    this.notifyListeners();
  }

  /**
   * Test drawer hardware (pulse kick)
   */
  async testCashDrawer(): Promise<CashDrawerResult> {
    const result = await this.openCashDrawer();
    if (result.success) {
      setTimeout(() => {
        this.closeDrawer();
      }, 2000);
    }
    return result;
  }

  private playDrawerChime(): void {
    try {
      if (typeof window !== 'undefined' && 'AudioContext' in window) {
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      }
    } catch {
      // Audio context may be restricted by browser policy
    }
  }
}

export const cashDrawerService = new CashDrawerService();
