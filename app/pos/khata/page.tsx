'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { KhataStatementPrint } from '@/components/print/KhataStatementPrint';
import { WholesaleInvoicePrint } from '@/components/print/WholesaleInvoicePrint';
import {
  BookOpen,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  User,
  History,
  Printer,
  ArrowRight,
  Receipt,
} from 'lucide-react';
import { customersService } from '@/services/customersService';
import { productsService } from '@/services/productsService';
import { salesService } from '@/services/salesService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Customer, Product, KhataTransaction, CartItem, Bill } from '@/types';

export default function KhataPOSPage() {
  const { currentStaff } = useAuth();
  const { toast } = useToast();

  const [khataCustomers, setKhataCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('cst-001');
  const [customerSearch, setCustomerSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');

  // Active Khata Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState('');
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [selectedBillForPrint, setSelectedBillForPrint] = useState<Bill | null>(null);

  const selectedCustomer = khataCustomers.find(c => c.id === selectedCustomerId) || khataCustomers[0];
  const transactions = selectedCustomer
    ? customersService.getKhataTransactions(selectedCustomer.id)
    : [];

  useEffect(() => {
    const clients = customersService.getAll().filter(c => c.type === 'Khata' || c.creditLimit > 0);
    setKhataCustomers(clients);
    setProducts(productsService.getAll());
  }, []);

  const filteredCustomers = khataCustomers.filter(c => {
    const q = customerSearch.toLowerCase();
    return (
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.businessName && c.businessName.toLowerCase().includes(q))
    );
  });

  const filteredProducts = products.filter(p => {
    const q = productSearch.toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  });

  // Cart actions
  const addToKhataCart = (prod: Product) => {
    if (prod.stock <= 0) {
      toast({ title: 'Out of Stock', description: `${prod.name} has zero inventory.`, type: 'error' });
      return;
    }

    const discountPerUnit = prod.wholesaleDiscount || 0;
    const netUnitPrice = Math.max(0, prod.wholesalePrice - discountPerUnit);

    setCart(prev => {
      const idx = prev.findIndex(i => i.product.id === prod.id);
      if (idx !== -1) {
        const item = prev[idx];
        const newQty = item.quantity + 1;
        const updated = [...prev];
        const itemDiscount = item.discountPerUnit || 0;
        const itemNet = Math.max(0, item.price - itemDiscount);
        updated[idx] = {
          ...item,
          quantity: newQty,
          lineTotal: itemNet * newQty,
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            product: prod,
            quantity: 1,
            price: prod.wholesalePrice, // Khata commercial clients receive wholesale pricing
            discountPerUnit,
            discountPercent: 0,
            lineTotal: netUnitPrice,
          },
        ];
      }
    });

    toast({
      title: 'Added to Khata Bill',
      description:
        discountPerUnit > 0
          ? `${prod.name} added at Rs. ${prod.wholesalePrice.toLocaleString()} (-Rs. ${discountPerUnit.toLocaleString()} disc => Rs. ${netUnitPrice.toLocaleString()})`
          : `${prod.name} added at wholesale rate Rs. ${prod.wholesalePrice.toLocaleString()}`,
      type: 'success',
    });
  };

  const removeFromCart = (prodId: string) => {
    setCart(prev => prev.filter(i => i.product.id !== prodId));
  };

  const updateQuantity = (prodId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(i => {
          if (i.product.id === prodId) {
            const newQty = i.quantity + delta;
            if (newQty <= 0) return null;
            const itemDiscount = i.discountPerUnit || 0;
            const itemNet = Math.max(0, i.price - itemDiscount);
            return {
              ...i,
              quantity: newQty,
              lineTotal: itemNet * newQty,
            };
          }
          return i;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const cartTotal = cart.reduce((sum, i) => sum + i.lineTotal, 0);
  const discountTotal = Math.max(0, subtotal - cartTotal);

  // Remaining credit limit check
  const availableCredit = selectedCustomer
    ? Math.max(0, selectedCustomer.creditLimit - selectedCustomer.currentBalance)
    : 0;

  const isExceedingCredit = cartTotal > availableCredit;

  const handleChargeToKhata = () => {
    if (!selectedCustomer || cart.length === 0 || !currentStaff) return;

    if (isExceedingCredit) {
      const proceed = confirm(
        `This bill of Rs. ${cartTotal.toLocaleString()} exceeds the client's available credit limit of Rs. ${availableCredit.toLocaleString()}. Do you wish to override with manager authorization?`
      );
      if (!proceed) return;
    }

    // Complete sale on Khata credit
    const bill = salesService.completeSale({
      saleType: 'Khata',
      cartItems: cart,
      paymentMethod: 'Credit/Khata',
      amountReceived: 0,
      discountTotal,
      taxTotal: 0,
      staffId: currentStaff.id,
      staffName: currentStaff.name,
      customer: selectedCustomer,
      notes: notes || 'Booked to client Khata ledger',
    });

    toast({
      title: 'Charged to Customer Khata',
      description: `Rs. ${cartTotal.toLocaleString()} debited to ${selectedCustomer.name}'s account.`,
      type: 'success',
    });

    setCart([]);
    setNotes('');
    // Refresh customer list & products
    const clients = customersService.getAll().filter(c => c.type === 'Khata' || c.creditLimit > 0);
    setKhataCustomers(clients);
    setProducts(productsService.getAll());
    // Prompt to view and print customer bill
    setSelectedBillForPrint(bill);
  };

  return (
    <ProtectedRoute permission="pos_khata">
      <AppShell>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Khata Credit Sales & Customer Ledger
                </h1>
                <p className="text-xs text-slate-500">
                  Book direct fabric credit orders and audit real-time debit/credit balances.
                </p>
              </div>
            </div>

            {selectedCustomer && (
              <Button
                variant="outline"
                size="md"
                onClick={() => setIsStatementModalOpen(true)}
                className="gap-2"
              >
                <Printer className="w-4 h-4" /> View / Print Statement
              </Button>
            )}
          </div>

          {/* Top Customer Selector & Credit Summary Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Customer Picker */}
            <Card className="p-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Select Khata Account Holder
              </label>
              <div className="relative mb-3">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter client or business name..."
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1 max-h-48 overflow-y-auto">
                {filteredCustomers.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCustomerId(c.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all text-xs ${
                      selectedCustomerId === c.id
                        ? 'bg-amber-50 border border-amber-300 text-amber-950 font-semibold shadow-2xs'
                        : 'hover:bg-slate-50 border border-transparent text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold">{c.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {c.businessName} • {c.city}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-rose-600 text-xs">
                        Rs. {c.currentBalance.toLocaleString()}
                      </div>
                      <div className="text-[9px] text-slate-400">Due</div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            {/* Account Details & Credit Limit Meter */}
            {selectedCustomer && (
              <Card className="p-4 lg:col-span-2 flex flex-col justify-between">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Account Title</span>
                    <div className="font-bold text-slate-900 text-sm mt-0.5">{selectedCustomer.name}</div>
                    <div className="text-[11px] text-slate-500">{selectedCustomer.phone}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Credit Limit</span>
                    <div className="font-black text-slate-900 text-base mt-0.5">
                      Rs. {selectedCustomer.creditLimit.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-slate-500">Approved Ceiling</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Current Balance Owed</span>
                    <div className="font-black text-rose-600 text-base mt-0.5">
                      Rs. {selectedCustomer.currentBalance.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-rose-500">Outstanding Debit</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Available Credit</span>
                    <div className="font-black text-emerald-600 text-base mt-0.5">
                      Rs. {availableCredit.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-emerald-700">Remaining Cushion</div>
                  </div>
                </div>

                {/* Visual Credit Utilization Progress Bar */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Credit Utilization</span>
                    <span className="font-bold font-mono">
                      {Math.round((selectedCustomer.currentBalance / selectedCustomer.creditLimit) * 100)}% Used
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{
                        width: `${Math.min(
                          100,
                          (selectedCustomer.currentBalance / selectedCustomer.creditLimit) * 100
                        )}%`,
                      }}
                      className={`h-full rounded-full transition-all ${
                        selectedCustomer.currentBalance / selectedCustomer.creditLimit > 0.8
                          ? 'bg-rose-500'
                          : selectedCustomer.currentBalance / selectedCustomer.creditLimit > 0.5
                          ? 'bg-amber-500'
                          : 'bg-blue-600'
                      }`}
                    />
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Middle: Fast Product Selection for Khata Order & Active Bill */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Product Selector */}
            <Card className="lg:col-span-2 flex flex-col h-96">
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between w-full">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Add Fabric to Khata Sale
                  </CardTitle>
                  <div className="relative w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search fabrics..."
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 flex-1 overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {filteredProducts.slice(0, 15).map(prod => (
                    <div
                      key={prod.id}
                      onClick={() => addToKhataCart(prod)}
                      className="p-2.5 rounded-xl border border-slate-200/80 bg-white hover:border-amber-400 hover:shadow-xs transition-all cursor-pointer select-none text-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="font-semibold text-slate-900 line-clamp-1 leading-snug">
                          {prod.name}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {prod.unit} • Stock: {prod.stock}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100">
                        <div>
                          <span className="font-black text-amber-700">
                            Rs. {Math.max(0, prod.wholesalePrice - (prod.wholesaleDiscount || 0)).toLocaleString()}
                          </span>
                          {(prod.wholesaleDiscount || 0) > 0 && (
                            <span className="text-[10px] text-emerald-600 block font-medium">
                              Save Rs. {(prod.wholesaleDiscount || 0).toLocaleString()}
                            </span>
                          )}
                        </div>
                        <span className="w-5 h-5 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                          +
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Khata Current Order & Charge Button */}
            <Card className="flex flex-col h-96">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Current Khata Bill ({cart.length} items)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 flex-1 overflow-y-auto divide-y divide-slate-100">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400">
                    <Receipt className="w-8 h-8 text-slate-300 mb-1" />
                    <span className="text-xs">No items selected</span>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.product.id} className="py-2 space-y-1">
                      <div className="flex justify-between items-start text-xs">
                        <span className="font-semibold text-slate-800 line-clamp-1">{item.product.name}</span>
                        <span className="font-bold text-slate-900">Rs. {item.lineTotal.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1 border border-slate-200 rounded p-0.5">
                          <button
                            onClick={() => updateQuantity(item.product.id, -1)}
                            className="w-4 h-4 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="font-mono text-xs px-1.5">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, 1)}
                            className="w-4 h-4 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-slate-400 hover:text-rose-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>

              <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2 text-xs">
                <div className="flex justify-between text-base font-black text-slate-900">
                  <span>Bill Total:</span>
                  <span className="text-amber-700">Rs. {cartTotal.toLocaleString()}</span>
                </div>

                {isExceedingCredit && (
                  <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Exceeds remaining credit by Rs. {(cartTotal - availableCredit).toLocaleString()}
                  </div>
                )}

                <Button
                  variant="primary"
                  size="md"
                  onClick={handleChargeToKhata}
                  disabled={cart.length === 0 || !selectedCustomer}
                  className="w-full font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Charge to Khata Balance
                </Button>
              </div>
            </Card>
          </div>

          {/* Bottom: Complete Customer Transaction History */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <History className="w-4 h-4 text-slate-600" /> Complete Ledger Entries for {selectedCustomer?.name}
                  </CardTitle>
                  <CardDescription>
                    Chronological audit trail of credit sales (Debits) and recovery collections (Credits).
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-semibold">
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Reference / Invoice</th>
                      <th className="py-2.5 px-4">Description</th>
                      <th className="py-2.5 px-4 text-right">Debit (Added)</th>
                      <th className="py-2.5 px-4 text-right">Credit (Paid)</th>
                      <th className="py-2.5 px-4 text-right">Balance After</th>
                      <th className="py-2.5 px-4">Staff</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                          {new Date(tx.date).toLocaleDateString('en-PK', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold">
                          {tx.invoiceId ? (
                            <button
                              onClick={() => {
                                const b = salesService.getBillById(tx.invoiceId!);
                                if (b) {
                                  setSelectedBillForPrint(b);
                                } else {
                                  toast({
                                    title: 'Invoice Record',
                                    description: `Invoice ${tx.invoiceId} ledger entry.`,
                                    type: 'info',
                                  });
                                }
                              }}
                              className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
                              title="Click to view and print customer bill"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              {tx.invoiceId}
                            </button>
                          ) : (
                            <span className="text-slate-500">RECOVERY</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-800">{tx.description}</td>
                        <td className="py-3 px-4 text-right font-bold text-rose-600">
                          {tx.type === 'DEBIT' ? `Rs. ${tx.amount.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600">
                          {tx.type === 'CREDIT' ? `Rs. ${tx.amount.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-slate-900">
                          Rs. {tx.balanceAfter.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-slate-500">{tx.staffName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modal: Khata Statement Print */}
        <Modal
          isOpen={isStatementModalOpen}
          onClose={() => setIsStatementModalOpen(false)}
          title="Customer Khata Statement"
          maxWidth="4xl"
        >
          {selectedCustomer && (
            <KhataStatementPrint
              customer={selectedCustomer}
              transactions={transactions}
              onClose={() => setIsStatementModalOpen(false)}
            />
          )}
        </Modal>

        {/* Modal: Customer Bill Invoice Print */}
        <Modal
          isOpen={!!selectedBillForPrint}
          onClose={() => setSelectedBillForPrint(null)}
          title="Customer Invoice / Bill"
          maxWidth="4xl"
        >
          {selectedBillForPrint && (
            <WholesaleInvoicePrint
              bill={selectedBillForPrint}
              onClose={() => setSelectedBillForPrint(null)}
            />
          )}
        </Modal>
      </AppShell>
    </ProtectedRoute>
  );
}
