'use client';

import React from 'react';
import { StaffKhataRecord } from '@/types';
import { Printer, ArrowLeft, Download } from 'lucide-react';
import { Button } from '../ui/Button';

interface StaffKhataPrintProps {
  record: StaffKhataRecord;
  onClose?: () => void;
}

export function StaffKhataPrint({ record, onClose }: StaffKhataPrintProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col items-center w-full max-w-3xl mx-auto">
      {/* Top Action Bar (hidden during print) */}
      <div className="flex items-center justify-between w-full mb-4 no-print bg-slate-100 p-3 rounded-xl border border-slate-200">
        <Button variant="outline" size="sm" onClick={onClose} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to Staff Khata
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={handlePrint} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Printer className="w-4 h-4" /> Print / Save as PDF
          </Button>
        </div>
      </div>

      {/* Official Voucher Printable Container */}
      <div
        id="printable-staff-khata"
        className="printable-area w-full bg-white p-8 sm:p-10 border border-slate-300 rounded-xl shadow-sm text-slate-900 print:p-0 print:border-none print:shadow-none font-sans"
      >
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-800 pb-5 mb-5">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">AL-NOOR FABRICS</h1>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Outstation Staff Field Recovery Voucher
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Liberty Cloth Market, Gulberg III, Lahore, Pakistan | Phone: +92 (042) 3575-8991
            </p>
          </div>
          <div className="text-right">
            <div className="text-lg font-mono font-black text-blue-700">{record.recordNumber}</div>
            <div className="text-xs text-slate-500 font-mono mt-0.5">
              Date:{' '}
              {new Date(record.date).toLocaleDateString('en-PK', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </div>
            <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
              Official Record
            </span>
          </div>
        </div>

        {/* Staff & Outstation Route Info */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 mb-6 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Staff Member Assigned:
            </span>
            <div className="text-sm font-black text-slate-900 mt-0.5">{record.staffName}</div>
            {record.staffId && (
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">Staff ID: {record.staffId}</div>
            )}
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Cities Visited on Outstation Trip:
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {record.cities.map((city, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 text-xs font-semibold bg-white border border-slate-300 rounded text-slate-800"
                >
                  📍 {city}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Breakdown Section */}
        <div className="space-y-4 text-xs mb-6">
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-2.5 font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b border-slate-200">
              Payment & Recovery Breakdown
            </div>

            {/* Cash Row */}
            <div className="flex justify-between items-center p-3.5 border-b border-slate-100">
              <div>
                <span className="font-bold text-slate-900">Cash Payment Collected / Delivered</span>
                <p className="text-[11px] text-slate-500">Currency notes handed over to head office cash counter</p>
              </div>
              <div className="text-right font-mono font-black text-base text-slate-900">
                Rs. {record.cashAmount.toLocaleString()}
              </div>
            </div>

            {/* Cheques Table */}
            <div className="p-3.5">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-slate-900">
                  Cheques Collected ({record.chequeCount || record.cheques.length})
                </span>
                <span className="font-mono text-[11px] text-slate-500">
                  Total Cheque Value: Rs. {record.totalChequeAmount.toLocaleString()}
                </span>
              </div>

              {record.cheques.length === 0 ? (
                <div className="text-[11px] text-slate-400 italic py-2">No cheque payments recorded for this trip.</div>
              ) : (
                <table className="w-full text-left border-collapse border border-slate-200 text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Cheque Number</th>
                      <th className="py-2 px-3">Issuing Bank</th>
                      <th className="py-2 px-3">Passing / Clearing Date</th>
                      <th className="py-2 px-3 text-right">Amount (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    {record.cheques.map((chq, i) => (
                      <tr key={chq.id || i}>
                        <td className="py-2 px-3 text-slate-500">{i + 1}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800">{chq.chequeNumber || '—'}</td>
                        <td className="py-2 px-3 text-slate-600 font-sans">{chq.bankName || '—'}</td>
                        <td className="py-2 px-3 text-slate-600">{chq.passingDate || '—'}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          Rs. {chq.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Grand Totals Summary Box */}
          <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Cash Subtotal:</span>
              <span className="font-mono font-bold">Rs. {record.cashAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-300">
              <span>Total Cheques ({record.chequeCount} entries):</span>
              <span className="font-mono font-bold">Rs. {record.totalChequeAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-base font-black pt-2 border-t border-slate-700 text-emerald-400">
              <span>Grand Total Reconciled:</span>
              <span className="font-mono text-lg text-emerald-300">Rs. {record.grandTotal.toLocaleString()}</span>
            </div>
          </div>

          {record.notes && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Staff Remarks / Notes:</span>
              <p className="text-slate-600 mt-0.5">{record.notes}</p>
            </div>
          )}
        </div>

        {/* Verification Signatures */}
        <div className="grid grid-cols-3 gap-6 pt-10 mt-10 border-t border-slate-200 text-center text-xs">
          <div>
            <div className="border-b border-slate-400 h-10 mb-2"></div>
            <span className="font-bold text-slate-800">{record.staffName}</span>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Field Staff Signature</div>
          </div>
          <div>
            <div className="border-b border-slate-400 h-10 mb-2"></div>
            <span className="font-bold text-slate-800">Accounts Department</span>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Cash & Cheque Verifier</div>
          </div>
          <div>
            <div className="border-b border-slate-400 h-10 mb-2"></div>
            <span className="font-bold text-slate-800">Authorized Signatory</span>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">General Manager / Admin</div>
          </div>
        </div>

        <div className="text-center text-[10px] text-slate-400 mt-8">
          System generated Staff Khata audit voucher. Al-Noor Fabrics Enterprise POS System.
        </div>
      </div>
    </div>
  );
}
