'use client';

import React from 'react';
import { Customer, KhataTransaction } from '@/types';
import { Printer, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';

interface KhataStatementPrintProps {
  customer: Customer;
  transactions: KhataTransaction[];
  dateRangeLabel?: string;
  onClose?: () => void;
}

export function KhataStatementPrint({
  customer,
  transactions,
  dateRangeLabel = 'Complete Historical Ledger',
  onClose,
}: KhataStatementPrintProps) {
  const handlePrint = () => {
    window.print();
  };

  const totalDebit = transactions
    .filter(t => t.type === 'DEBIT')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalCredit = transactions
    .filter(t => t.type === 'CREDIT')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto">
      {/* Action Header */}
      <div className="flex items-center justify-between w-full mb-6 no-print">
        <Button variant="outline" size="sm" onClick={onClose} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to Customer Ledger
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="md" onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" /> Print Customer Statement
          </Button>
        </div>
      </div>

      {/* Statement Container */}
      <div className="invoice-a4-container w-full bg-white p-8 sm:p-12 border border-slate-200 rounded-xl shadow-sm text-slate-900">
        {/* Top Branding */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">AL-NOOR FABRICS</h1>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Khata Ledger & Credit Accounts Statement
            </p>
            <p className="text-xs text-slate-600 mt-1">Liberty Cloth Market, Gulberg III, Lahore, Pakistan</p>
            <p className="text-xs text-slate-600">Accounts Desk: +92 (042) 3575-8991</p>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-slate-900 text-white font-bold text-xs rounded-md uppercase tracking-wider mb-2">
              Khata Statement
            </span>
            <div className="text-xs text-slate-500">Period: {dateRangeLabel}</div>
            <div className="text-xs text-slate-500">
              Printed: {new Date().toLocaleDateString('en-PK', { dateStyle: 'long' })}
            </div>
          </div>
        </div>

        {/* Customer Account Summary Box */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 mb-6 text-xs">
          <div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase">Account Title</div>
            <div className="font-bold text-slate-900 text-sm mt-0.5">{customer.name}</div>
            {customer.businessName && <div className="text-slate-600">{customer.businessName}</div>}
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase">Contact & City</div>
            <div className="font-medium text-slate-900 mt-0.5">{customer.phone}</div>
            <div className="text-slate-600">{customer.city}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase">Approved Credit Limit</div>
            <div className="font-bold text-slate-900 text-sm mt-0.5">
              Rs. {customer.creditLimit.toLocaleString()}
            </div>
            <div className="text-emerald-700">Active Account</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase">Current Balance Owed</div>
            <div className="font-black text-rose-600 text-sm mt-0.5">
              Rs. {customer.currentBalance.toLocaleString()}
            </div>
            <div className="text-slate-500 text-[10px]">Net Debit Due</div>
          </div>
        </div>

        {/* Ledger Transaction History */}
        <table className="w-full text-left text-xs mb-6 border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-300 text-slate-700">
              <th className="py-2.5 font-bold uppercase tracking-wider">Date</th>
              <th className="py-2.5 font-bold uppercase tracking-wider">Invoice / Ref</th>
              <th className="py-2.5 font-bold uppercase tracking-wider">Particulars / Description</th>
              <th className="py-2.5 font-bold uppercase tracking-wider text-right text-rose-700">Debit (Purchases)</th>
              <th className="py-2.5 font-bold uppercase tracking-wider text-right text-emerald-700">Credit (Payments)</th>
              <th className="py-2.5 font-bold uppercase tracking-wider text-right text-slate-900">Running Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No transactions recorded in this statement period.
                </td>
              </tr>
            ) : (
              transactions.map((tx, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="py-2.5 text-slate-600 whitespace-nowrap">
                    {new Date(tx.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="py-2.5 font-mono text-[11px] text-blue-700 font-semibold">
                    {tx.invoiceId || 'PAYMENT'}
                  </td>
                  <td className="py-2.5 text-slate-700 max-w-xs">{tx.description}</td>
                  <td className="py-2.5 text-right font-medium text-rose-700">
                    {tx.type === 'DEBIT' ? `Rs. ${tx.amount.toLocaleString()}` : '—'}
                  </td>
                  <td className="py-2.5 text-right font-medium text-emerald-700">
                    {tx.type === 'CREDIT' ? `Rs. ${tx.amount.toLocaleString()}` : '—'}
                  </td>
                  <td className="py-2.5 text-right font-bold text-slate-900">
                    Rs. {tx.balanceAfter.toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Statement Totals */}
        <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200">
          <div className="text-xs text-slate-500 space-y-2">
            <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Notice to Account Holder:</h4>
            <p className="text-[11px] leading-relaxed">
              Please inspect all entries carefully. Any discrepancies in billing, returns, or payment receipts must be brought to our notice within 10 days of statement issuance.
            </p>
            <div className="pt-8 flex gap-8">
              <div className="border-t border-slate-300 pt-1 text-center w-36 text-[10px] text-slate-500">
                Verified By Accountant
              </div>
              <div className="border-t border-slate-300 pt-1 text-center w-36 text-[10px] text-slate-500">
                Customer Signature
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Total Period Debits (Purchases):</span>
              <span className="font-bold text-rose-700">Rs. {totalDebit.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Total Period Credits (Payments Received):</span>
              <span className="font-bold text-emerald-700">Rs. {totalCredit.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
              <span>Closing Ledger Balance:</span>
              <span className="text-blue-600">Rs. {customer.currentBalance.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
