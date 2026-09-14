'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CartItem } from '@/types';
import { useToast } from './ToastContext';

interface CartContextType {
  // Retail
  retailCart: CartItem[];
  addToRetailCart: (product: Product, quantity?: number) => void;
  removeFromRetailCart: (productId: string) => void;
  updateRetailQuantity: (productId: string, quantity: number) => void;
  updateRetailDiscount: (productId: string, discountPercent: number) => void;
  clearRetailCart: () => void;
  retailSubtotal: number;
  retailDiscountTotal: number;
  retailGrandTotal: number;

  // Wholesale
  wholesaleCart: CartItem[];
  addToWholesaleCart: (product: Product, quantity?: number) => void;
  removeFromWholesaleCart: (productId: string) => void;
  updateWholesaleQuantity: (productId: string, quantity: number) => void;
  updateWholesaleDiscount: (productId: string, discountPercent: number) => void;
  clearWholesaleCart: () => void;
  wholesaleSubtotal: number;
  wholesaleDiscountTotal: number;
  wholesaleGrandTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [retailCart, setRetailCart] = useState<CartItem[]>([]);
  const [wholesaleCart, setWholesaleCart] = useState<CartItem[]>([]);

  // Calculate line item total
  const computeLineTotal = (price: number, qty: number, discountPercent: number) => {
    const raw = price * qty;
    const discount = (raw * discountPercent) / 100;
    return Math.max(0, Math.round(raw - discount));
  };

  // ---------------- Retail Cart Operations ----------------
  const addToRetailCart = (product: Product, quantity = 1) => {
    if (product.stock <= 0) {
      toast({
        title: 'Out of Stock',
        description: `${product.name} is currently out of stock!`,
        type: 'error',
      });
      return;
    }

    const existingIndex = retailCart.findIndex(item => item.product.id === product.id);

    if (existingIndex !== -1) {
      const existing = retailCart[existingIndex];
      const newQty = existing.quantity + quantity;

      if (newQty > product.stock) {
        toast({
          title: 'Stock Limit Reached',
          description: `Only ${product.stock} ${product.unit}(s) available in stock.`,
          type: 'warning',
        });
        return;
      }

      setRetailCart(prev => {
        const updated = [...prev];
        const idx = updated.findIndex(item => item.product.id === product.id);
        if (idx !== -1) {
          updated[idx] = {
            ...updated[idx],
            quantity: newQty,
            lineTotal: computeLineTotal(updated[idx].price, newQty, updated[idx].discountPercent),
          };
        }
        return updated;
      });

      toast({
        title: 'Quantity Updated',
        description: `${product.name} quantity increased to ${newQty}`,
        type: 'info',
      });
    } else {
      const item: CartItem = {
        product,
        quantity,
        price: product.retailPrice,
        discountPercent: 0,
        lineTotal: computeLineTotal(product.retailPrice, quantity, 0),
      };
      setRetailCart(prev => [...prev, item]);

      toast({
        title: 'Added to Cart',
        description: `${product.name} added to retail cart.`,
        type: 'success',
      });
    }
  };

  const removeFromRetailCart = (productId: string) => {
    setRetailCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateRetailQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromRetailCart(productId);
      return;
    }

    const item = retailCart.find(i => i.product.id === productId);
    if (item && quantity > item.product.stock) {
      toast({
        title: 'Stock Warning',
        description: `Requested ${quantity}, but only ${item.product.stock} available.`,
        type: 'warning',
      });
      return;
    }

    setRetailCart(prev =>
      prev.map(item => {
        if (item.product.id === productId) {
          return {
            ...item,
            quantity,
            lineTotal: computeLineTotal(item.price, quantity, item.discountPercent),
          };
        }
        return item;
      })
    );
  };

  const updateRetailDiscount = (productId: string, discountPercent: number) => {
    const validDiscount = Math.min(100, Math.max(0, discountPercent));
    setRetailCart(prev =>
      prev.map(item => {
        if (item.product.id === productId) {
          return {
            ...item,
            discountPercent: validDiscount,
            lineTotal: computeLineTotal(item.price, item.quantity, validDiscount),
          };
        }
        return item;
      })
    );
  };

  const clearRetailCart = () => {
    setRetailCart([]);
  };

  // ---------------- Wholesale Cart Operations ----------------
  const addToWholesaleCart = (product: Product, quantity = 1) => {
    if (product.stock <= 0) {
      toast({
        title: 'Out of Stock',
        description: `${product.name} is currently out of stock!`,
        type: 'error',
      });
      return;
    }

    const existingIndex = wholesaleCart.findIndex(item => item.product.id === product.id);

    if (existingIndex !== -1) {
      const existing = wholesaleCart[existingIndex];
      const newQty = existing.quantity + quantity;

      if (newQty > product.stock) {
        toast({
          title: 'Stock Limit Reached',
          description: `Only ${product.stock} ${product.unit}(s) available in stock.`,
          type: 'warning',
        });
        return;
      }

      setWholesaleCart(prev => {
        const updated = [...prev];
        const idx = updated.findIndex(item => item.product.id === product.id);
        if (idx !== -1) {
          updated[idx] = {
            ...updated[idx],
            quantity: newQty,
            lineTotal: computeLineTotal(updated[idx].price, newQty, updated[idx].discountPercent),
          };
        }
        return updated;
      });

      toast({
        title: 'Quantity Updated',
        description: `${product.name} wholesale quantity increased to ${newQty}`,
        type: 'info',
      });
    } else {
      const item: CartItem = {
        product,
        quantity,
        price: product.wholesalePrice,
        discountPercent: 0,
        lineTotal: computeLineTotal(product.wholesalePrice, quantity, 0),
      };
      setWholesaleCart(prev => [...prev, item]);

      toast({
        title: 'Added to Wholesale Bill',
        description: `${product.name} added at wholesale rate Rs. ${product.wholesalePrice.toLocaleString()}`,
        type: 'success',
      });
    }
  };

  const removeFromWholesaleCart = (productId: string) => {
    setWholesaleCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateWholesaleQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromWholesaleCart(productId);
      return;
    }

    const item = wholesaleCart.find(i => i.product.id === productId);
    if (item && quantity > item.product.stock) {
      toast({
        title: 'Stock Warning',
        description: `Requested ${quantity}, but only ${item.product.stock} available.`,
        type: 'warning',
      });
      return;
    }

    setWholesaleCart(prev =>
      prev.map(item => {
        if (item.product.id === productId) {
          return {
            ...item,
            quantity,
            lineTotal: computeLineTotal(item.price, quantity, item.discountPercent),
          };
        }
        return item;
      })
    );
  };

  const updateWholesaleDiscount = (productId: string, discountPercent: number) => {
    const validDiscount = Math.min(100, Math.max(0, discountPercent));
    setWholesaleCart(prev =>
      prev.map(item => {
        if (item.product.id === productId) {
          return {
            ...item,
            discountPercent: validDiscount,
            lineTotal: computeLineTotal(item.price, item.quantity, validDiscount),
          };
        }
        return item;
      })
    );
  };

  const clearWholesaleCart = () => {
    setWholesaleCart([]);
  };

  // Computations
  const retailSubtotal = retailCart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const retailGrandTotal = retailCart.reduce((sum, i) => sum + i.lineTotal, 0);
  const retailDiscountTotal = retailSubtotal - retailGrandTotal;

  const wholesaleSubtotal = wholesaleCart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const wholesaleGrandTotal = wholesaleCart.reduce((sum, i) => sum + i.lineTotal, 0);
  const wholesaleDiscountTotal = wholesaleSubtotal - wholesaleGrandTotal;

  return (
    <CartContext.Provider
      value={{
        retailCart,
        addToRetailCart,
        removeFromRetailCart,
        updateRetailQuantity,
        updateRetailDiscount,
        clearRetailCart,
        retailSubtotal,
        retailDiscountTotal,
        retailGrandTotal,

        wholesaleCart,
        addToWholesaleCart,
        removeFromWholesaleCart,
        updateWholesaleQuantity,
        updateWholesaleDiscount,
        clearWholesaleCart,
        wholesaleSubtotal,
        wholesaleDiscountTotal,
        wholesaleGrandTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
