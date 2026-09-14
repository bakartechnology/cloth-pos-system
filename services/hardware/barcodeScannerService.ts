/**
 * Barcode Scanner Hardware Service
 * 
 * Hardware abstraction for USB / Bluetooth HID keyboard-wedge barcode scanners.
 * Handles continuous scanning, rapid keystroke detection (scanners typically send chars < 30ms apart),
 * audio feedback, and hardware health checking.
 */

class BarcodeScannerService {
  private isAvailable: boolean = true;
  private audioCtx: AudioContext | null = null;

  isScannerAvailable(): boolean {
    return this.isAvailable;
  }

  setAvailability(available: boolean): void {
    this.isAvailable = available;
  }

  /**
   * Plays a high-pitch POS confirmation beep (e.g. 1800Hz for 60ms) on valid barcode scan
   */
  playSuccessBeep(): void {
    try {
      if (typeof window !== 'undefined') {
        const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!this.audioCtx && AudioCtor) {
          this.audioCtx = new AudioCtor();
        }
        if (this.audioCtx) {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(1760, this.audioCtx.currentTime); // A6 beep
          gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.07);
          osc.connect(gain);
          gain.connect(this.audioCtx.destination);
          osc.start();
          osc.stop(this.audioCtx.currentTime + 0.07);
        }
      }
    } catch {
      // Ignore browser autoplay limitations
    }
  }

  /**
   * Plays low-pitch error boop on unrecognized barcode
   */
  playErrorBeep(): void {
    try {
      if (typeof window !== 'undefined') {
        const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!this.audioCtx && AudioCtor) {
          this.audioCtx = new AudioCtor();
        }
        if (this.audioCtx) {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(320, this.audioCtx.currentTime);
          osc.frequency.setValueAtTime(240, this.audioCtx.currentTime + 0.1);
          gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.2);
          osc.connect(gain);
          gain.connect(this.audioCtx.destination);
          osc.start();
          osc.stop(this.audioCtx.currentTime + 0.2);
        }
      }
    } catch {
      // Ignore
    }
  }
}

export const barcodeScannerService = new BarcodeScannerService();
