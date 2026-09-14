/**
 * Card Terminal Hardware Service
 * 
 * Hardware abstraction for physical POS payment terminals (Verifone, Ingenico, Pax).
 * Provides an interface ready for local network POS protocols, serial connection, or payment bridges.
 * In this frontend prototype, it simulates connection handshakes, customer card insertion,
 * authorization delays, and status callbacks.
 */

export type CardPaymentState = 'idle' | 'waiting_card' | 'processing' | 'authorized' | 'failed' | 'cancelled';

export interface CardPaymentResponse {
  success: boolean;
  state: CardPaymentState;
  transactionId?: string;
  authCode?: string;
  cardBrand?: string;
  lastFourDigits?: string;
  amount?: number;
  errorMessage?: string;
}

class CardTerminalService {
  private isAvailable: boolean = true;
  private currentState: CardPaymentState = 'idle';
  private shouldSimulateFailure: boolean = false;
  private abortController: AbortController | null = null;

  isTerminalAvailable(): boolean {
    return this.isAvailable;
  }

  setAvailability(available: boolean): void {
    this.isAvailable = available;
  }

  setSimulateFailure(fail: boolean): void {
    this.shouldSimulateFailure = fail;
  }

  getCardPaymentStatus(): CardPaymentState {
    return this.currentState;
  }

  /**
   * Initiates payment flow on the physical/simulated terminal
   */
  async startCardPayment(
    amount: number,
    onProgress?: (state: CardPaymentState, message: string) => void
  ): Promise<CardPaymentResponse> {
    if (!this.isAvailable) {
      this.currentState = 'failed';
      return {
        success: false,
        state: 'failed',
        errorMessage: 'Card terminal unavailable or disconnected. Please check USB/LAN cable.',
      };
    }

    this.abortController = new AbortController();
    const { signal } = this.abortController;

    try {
      // Step 1: Prompt customer to insert / tap card
      this.currentState = 'waiting_card';
      onProgress?.('waiting_card', 'Waiting for customer to tap or insert card...');
      await this.sleep(1200, signal);

      // Step 2: Processing PIN / Bank Authorization
      this.currentState = 'processing';
      onProgress?.('processing', 'Processing payment with bank authorization host...');
      await this.sleep(1800, signal);

      if (this.shouldSimulateFailure) {
        this.currentState = 'failed';
        onProgress?.('failed', 'Card Declined / Communication Timeout.');
        return {
          success: false,
          state: 'failed',
          errorMessage: 'Transaction declined: Insufficient funds or invalid PIN.',
        };
      }

      // Step 3: Success & Authorization
      this.currentState = 'authorized';
      const brands = ['Visa', 'MasterCard', 'UnionPay', 'PayPak'];
      const randomBrand = brands[Math.floor(Math.random() * brands.length)];
      const lastFour = Math.floor(1000 + Math.random() * 9000).toString();
      const authCode = Math.floor(100000 + Math.random() * 900000).toString();
      const transactionId = `TXN-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

      onProgress?.('authorized', `Payment Approved! Auth Code: ${authCode}`);

      return {
        success: true,
        state: 'authorized',
        transactionId,
        authCode,
        cardBrand: randomBrand,
        lastFourDigits: lastFour,
        amount,
      };
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') {
        this.currentState = 'cancelled';
        onProgress?.('cancelled', 'Payment cancelled by cashier.');
        return {
          success: false,
          state: 'cancelled',
          errorMessage: 'Payment session cancelled.',
        };
      }
      this.currentState = 'failed';
      return {
        success: false,
        state: 'failed',
        errorMessage: 'Unexpected terminal error occurred.',
      };
    } finally {
      this.abortController = null;
    }
  }

  /**
   * Cancel ongoing terminal payment
   */
  cancelCardPayment(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.currentState = 'idle';
  }

  reset(): void {
    this.currentState = 'idle';
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  private sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve(), ms);
      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new DOMException('Aborted', 'AbortError'));
        });
      }
    });
  }
}

export const cardTerminalService = new CardTerminalService();
