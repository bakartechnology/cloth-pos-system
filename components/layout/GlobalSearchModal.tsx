'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ShoppingBag, Users, FileText, UserCheck, ArrowRight, X, Sparkles } from 'lucide-react';
import { productsService } from '@/services/productsService';
import { customersService } from '@/services/customersService';
import { salesService } from '@/services/salesService';
import { staffService } from '@/services/staffService';
import { Product, Customer, Bill, Staff } from '@/types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      return;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setProducts([]);
      setCustomers([]);
      setBills([]);
      setStaff([]);
      return;
    }

    const q = query.toLowerCase();

    // Search Products
    const allProducts = productsService.getAll();
    setProducts(
      allProducts
        .filter(
          p =>
            p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            p.barcode.includes(q)
        )
        .slice(0, 4)
    );

    // Search Customers
    const allCustomers = customersService.getAll();
    setCustomers(
      allCustomers
        .filter(
          c =>
            c.name.toLowerCase().includes(q) ||
            c.phone.includes(q) ||
            (c.businessName && c.businessName.toLowerCase().includes(q))
        )
        .slice(0, 3)
    );

    // Search Bills
    const allBills = salesService.getAllBills();
    setBills(
      allBills
        .filter(
          b =>
            b.invoiceNumber.toLowerCase().includes(q) ||
            (b.customerName && b.customerName.toLowerCase().includes(q))
        )
        .slice(0, 3)
    );

    // Search Staff
    const allStaff = staffService.getAll();
    setStaff(
      allStaff
        .filter(s => s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q))
        .slice(0, 3)
    );
  }, [query]);

  const handleNavigate = (path: string) => {
    router.push(path);
    onClose();
  };

  if (!isOpen) return null;

  const totalResults = products.length + customers.length + bills.length + staff.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 pt-16 sm:pt-24 no-print">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Palette Container */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 gap-3">
          <Search className="w-5 h-5 text-blue-600 shrink-0" />
          <input
            type="text"
            placeholder="Search fabrics, SKU, customers, invoices, staff... (Esc to close)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
            className="w-full text-sm bg-transparent border-none text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
          />
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Results / Shortcuts Body */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {!query.trim() ? (
            <div className="p-4">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                Quick Navigation Shortcuts
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => handleNavigate('/pos/retail')}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-colors text-left"
                >
                  <span className="font-semibold text-slate-800">Retail POS</span>
                  <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">F4</span>
                </button>
                <button
                  onClick={() => handleNavigate('/pos/wholesale')}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-colors text-left"
                >
                  <span className="font-semibold text-slate-800">Wholesale POS</span>
                  <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">F5</span>
                </button>
                <button
                  onClick={() => handleNavigate('/pos/khata')}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-colors text-left"
                >
                  <span className="font-semibold text-slate-800">Khata Credit Sale</span>
                  <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">F6</span>
                </button>
                <button
                  onClick={() => handleNavigate('/products')}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-colors text-left"
                >
                  <span className="font-semibold text-slate-800">Products Catalog</span>
                  <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">F2</span>
                </button>
              </div>
            </div>
          ) : totalResults === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No matching products, customers, bills, or staff records found for &quot;{query}&quot;.
            </div>
          ) : (
            <>
              {/* Products */}
              {products.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1 flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-blue-500" /> Products & Fabrics
                  </div>
                  <div className="space-y-1">
                    {products.map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleNavigate(`/products?search=${encodeURIComponent(p.sku)}`)}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-left transition-colors group"
                      >
                        <div>
                          <div className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {p.name}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            SKU: {p.sku} • {p.unit} • Stock: {p.stock}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-bold text-slate-900">Rs. {p.retailPrice.toLocaleString()}</div>
                          <div className="text-[10px] text-blue-600 flex items-center gap-0.5 justify-end">
                            View <ArrowRight className="w-3 h-3" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Customers */}
              {customers.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-cyan-500" /> Customers & Khata Accounts
                  </div>
                  <div className="space-y-1">
                    {customers.map(c => (
                      <button
                        key={c.id}
                        onClick={() => handleNavigate(`/customers/khata?id=${c.id}`)}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-left transition-colors group"
                      >
                        <div>
                          <div className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {c.name} {c.businessName && `(${c.businessName})`}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {c.city} • {c.phone} • {c.type}
                          </div>
                        </div>
                        {c.currentBalance > 0 && (
                          <div className="text-right shrink-0">
                            <div className="text-xs font-bold text-rose-600">
                              Rs. {c.currentBalance.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-slate-400">Balance Owed</div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Bills */}
              {bills.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-500" /> Invoices & Bills
                  </div>
                  <div className="space-y-1">
                    {bills.map(b => (
                      <button
                        key={b.id}
                        onClick={() => handleNavigate(`/bills?search=${encodeURIComponent(b.invoiceNumber)}`)}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-left transition-colors group"
                      >
                        <div>
                          <div className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                            #{b.invoiceNumber}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {b.saleType} • {b.customerName || 'Cash Customer'} • {b.paymentMethod}
                          </div>
                        </div>
                        <div className="text-xs font-bold text-slate-900">
                          Rs. {b.grandTotal.toLocaleString()}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Staff */}
              {staff.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-500" /> Staff Members
                  </div>
                  <div className="space-y-1">
                    {staff.map(s => (
                      <button
                        key={s.id}
                        onClick={() => handleNavigate('/staff')}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-left transition-colors group"
                      >
                        <div>
                          <div className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {s.name}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {s.role} • {s.counter}
                          </div>
                        </div>
                        <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          {s.status}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border rounded shadow-2xs font-mono text-[10px]">Ctrl</kbd> +{' '}
              <kbd className="px-1.5 py-0.5 bg-white border rounded shadow-2xs font-mono text-[10px]">K</kbd> to toggle
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border rounded shadow-2xs font-mono text-[10px]">ESC</kbd> to close
            </span>
          </div>
          <span className="flex items-center gap-1 text-blue-600 font-medium">
            <Sparkles className="w-3 h-3" /> Live Mock Data Search
          </span>
        </div>
      </div>
    </div>
  );
}
