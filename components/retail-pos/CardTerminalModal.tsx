'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cardTerminalService, CardPaymentResponse } from '@/services/hardware/cardTerminalService';
import { CreditCard, CheckCircle2, AlertCircle, RefreshCw, XCircle, ShieldCheck } from 'lucide-react';

interface CardTerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
  grandTotal: number;
  onPaymentSuccess: (authData: CardPaymentResponse) => void;
}

export function CardTerminalModal({
  isOpen,
  onClose,
  grandTotal,
  onPaymentSuccess,
}: CardTerminalModalProps) {
  const [terminalState, setTerminalState] = useState<'idle' | 'waiting_card' | 'processing' | 'authorized' | 'failed' | 'cancelled'>('idle');
  const [statusMessage, setStatusMessage] = useState('Initiating card terminal handshake...');
  const [authResponse, setAuthResponse] = useState<CardPaymentResponse | null>(null);

  const startPayment = async () => {
    setTerminalState('waiting_card');
    setStatusMessage('Waiting for customer to tap or insert card...');
    setAuthResponse(null);

    const res = await cardTerminalService.startCardPayment(grandTotal, (state, msg) => {
      setTerminalState(state);
      setStatusMessage(msg);
    });

    setAuthResponse(res);
    setTerminalState(res.state);

    if (res.success) {
      // Auto enable complete sale
    }
  };

  useEffect(() => {
    if (isOpen) {
      startPayment();
    } else {
      cardTerminalService.cancelCardPayment();
    }
  }, [isOpen, grandTotal]);

  const handleConfirmAndComplete = () => {
    if (authResponse && authResponse.success) {
      onPaymentSuccess(authResponse);
    }
  };

  const handleCancel = () => {
    cardTerminalService.cancelCardPayment();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Card Payment Terminal"
      maxWidth="md"
    >
      <div className="space-y-4 select-none">
        {/* Terminal Visual Indicator */}
        <div
          className={`p-5 rounded-2xl border text-center transition-all ${
            terminalState === 'authorized'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : terminalState === 'failed'
              ? 'bg-rose-50 border-rose-300 text-rose-950'
              : 'bg-blue-50 border-blue-200 text-blue-950'
          }`}
        >
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-xs mb-3 ${
              terminalState === 'authorized'
                ? 'bg-emerald-600 text-white'
                : terminalState === 'failed'
                ? 'bg-rose-600 text-white'
                : 'bg-blue-600 text-white'
            }`}
          >
            {terminalState === 'authorized' ? (
              <CheckCircle2 className="w-8 h-8" />
            ) : terminalState === 'failed' ? (
              <XCircle className="w-8 h-8" />
            ) : (
              <CreditCard className="w-8 h-8 animate-pulse" />
            )}
          </div>

          <h3 className="text-sm font-bold capitalize">
            {terminalState === 'waiting_card' && 'Present Customer Card'}
            {terminalState === 'processing' && 'Authorizing Transaction...'}
            {terminalState === 'authorized' && 'Payment Authorized'}
            {terminalState === 'failed' && 'Payment Declined / Failed'}
            {terminalState === 'cancelled' && 'Transaction Cancelled'}
          </h3>

          <p className="text-xs opacity-80 mt-1 max-w-xs mx-auto">
            {statusMessage}
          </p>
        </div>

        {/* Amount & Transaction Details */}
        <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-300">
            <span>Payable Amount:</span>
            <span className="text-base font-black font-mono text-white">
              Rs. {grandTotal.toLocaleString()}
            </span>
          </div>

          {authResponse?.transactionId && (
            <div className="border-t border-slate-700 pt-2 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Transaction ID:</span>
                <span className="font-mono text-emerald-400 font-bold">{authResponse.transactionId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Card Scheme:</span>
                <span className="font-semibold">{authResponse.cardBrand} (**** {authResponse.lastFourDigits})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Bank Auth Code:</span>
                <span className="font-mono text-cyan-300 font-bold">{authResponse.authCode}</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <Button variant="outline" size="sm" type="button" onClick={handleCancel}>
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            {terminalState === 'failed' && (
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={startPayment}
                className="gap-1.5 font-bold"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Terminal
              </Button>
            )}

            <Button
              variant="primary"
              size="md"
              type="button"
              onClick={handleConfirmAndComplete}
              disabled={terminalState !== 'authorized'}
              className="gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-700 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              Complete Sale & Print
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
