'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CartItem } from '@/types';
import { productsService } from '@/services/productsService';
import { useToast } from './ToastContext';

interface CartContextType {
  // Retail
  retailCart: CartItem[];
  addToRetailCart: (product: Product, quantity?: number) => void;
  removeFromRetailCart: (productId: string) => void;
  updateRetailQuantity: (productId: string, quantity: number) => void;
  updateRetailDiscount: (productId: string, discountPercent: number) => void;
  clearRetailCart: () => void;
  restoreRetailCart: (items: CartItem[]) => void;
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

  // Sync
  syncWithLatestProducts: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [retailCart, setRetailCart] = useState<CartItem[]>([]);
  const [wholesaleCart, setWholesaleCart] = useState<CartItem[]>([]);

  // Calculate line item total with unit price, per-unit rupee discount, and manual percent discount
  const computeLineTotal = (
    price: number,
    discountPerUnit: number,
    qty: number,
    discountPercent = 0
  ) => {
    const netUnitPrice = Math.max(0, price - discountPerUnit);
    const baseTotal = netUnitPrice * qty;
    const manualDiscount = (baseTotal * discountPercent) / 100;
    return Math.max(0, Math.round(baseTotal - manualDiscount));
  };

  // ---------------- Retail Cart Operations ----------------
  const addToRetailCart = (product: Product, quantity = 1) => {
    // Always fetch latest product record to avoid stale price or discount
    const freshProduct = productsService.getById(product.id) || product;

    if (freshProduct.stock <= 0) {
      toast({
        title: 'Out of Stock',
        description: `${freshProduct.name} is currently out of stock!`,
        type: 'error',
      });
      return;
    }

    const unitDiscount = freshProduct.retailDiscount || 0;
    const existingIndex = retailCart.findIndex(item => item.product.id === freshProduct.id);

    if (existingIndex !== -1) {
      const existing = retailCart[existingIndex];
      const newQty = existing.quantity + quantity;

      if (newQty > freshProduct.stock) {
        toast({
          title: 'Stock Limit Reached',
          description: `Only ${freshProduct.stock} ${freshProduct.unit}(s) available in stock.`,
          type: 'warning',
        });
        return;
      }

      setRetailCart(prev => {
        const updated = [...prev];
        const idx = updated.findIndex(item => item.product.id === freshProduct.id);
        if (idx !== -1) {
          updated[idx] = {
            ...updated[idx],
            product: freshProduct,
            price: freshProduct.retailPrice,
            discountPerUnit: unitDiscount,
            quantity: newQty,
            lineTotal: computeLineTotal(
              freshProduct.retailPrice,
              unitDiscount,
              newQty,
              updated[idx].discountPercent
            ),
          };
        }
        return updated;
      });

      toast({
        title: 'Quantity Updated',
        description: `${freshProduct.name} quantity increased to ${newQty}`,
        type: 'info',
      });
    } else {
      const item: CartItem = {
        product: freshProduct,
        quantity,
        price: freshProduct.retailPrice,
        discountPerUnit: unitDiscount,
        discountPercent: 0,
        lineTotal: computeLineTotal(freshProduct.retailPrice, unitDiscount, quantity, 0),
      };
      setRetailCart(prev => [...prev, item]);

      const finalPrice = Math.max(0, freshProduct.retailPrice - unitDiscount);
      toast({
        title: 'Added to Retail Cart',
        description: `${freshProduct.name} — Retail: Rs. ${freshProduct.retailPrice.toLocaleString()}${
          unitDiscount > 0 ? ` (Disc: -Rs. ${unitDiscount.toLocaleString()} => Final: Rs. ${finalPrice.toLocaleString()})` : ''
        }`,
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
    const fresh = productsService.getById(productId) || item?.product;
    const currentStock = fresh?.stock ?? item?.product.stock ?? 9999;

    if (item && quantity > currentStock) {
      toast({
        title: 'Stock Warning',
        description: `Requested ${quantity}, but only ${currentStock} available.`,
        type: 'warning',
      });
      return;
    }

    setRetailCart(prev =>
      prev.map(item => {
        if (item.product.id === productId) {
          const freshProd = productsService.getById(productId) || item.product;
          const freshPrice = freshProd.retailPrice;
          const freshDiscount = freshProd.retailDiscount || 0;
          return {
            ...item,
            product: freshProd,
            price: freshPrice,
            discountPerUnit: freshDiscount,
            quantity,
            lineTotal: computeLineTotal(
              freshPrice,
              freshDiscount,
              quantity,
              item.discountPercent
            ),
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
            lineTotal: computeLineTotal(
              item.price,
              item.discountPerUnit || 0,
              item.quantity,
              validDiscount
            ),
          };
        }
        return item;
      })
    );
  };

  const clearRetailCart = () => {
    setRetailCart([]);
  };

  const restoreRetailCart = (items: CartItem[]) => {
    const refreshed = items.map(item => {
      const fresh = productsService.getById(item.product.id);
      if (!fresh) return item;
      const unitDiscount = fresh.retailDiscount || 0;
      return {
        ...item,
        product: fresh,
        price: fresh.retailPrice,
        discountPerUnit: unitDiscount,
        lineTotal: computeLineTotal(
          fresh.retailPrice,
          unitDiscount,
          item.quantity,
          item.discountPercent
        ),
      };
    });
    setRetailCart(refreshed);
  };

  // ---------------- Wholesale Cart Operations ----------------
  const addToWholesaleCart = (product: Product, quantity = 1) => {
    const freshProduct = productsService.getById(product.id) || product;

    if (freshProduct.stock <= 0) {
      toast({
        title: 'Out of Stock',
        description: `${freshProduct.name} is currently out of stock!`,
        type: 'error',
      });
      return;
    }

    const unitDiscount = freshProduct.wholesaleDiscount || 0;
    const existingIndex = wholesaleCart.findIndex(item => item.product.id === freshProduct.id);

    if (existingIndex !== -1) {
      const existing = wholesaleCart[existingIndex];
      const newQty = existing.quantity + quantity;

      if (newQty > freshProduct.stock) {
        toast({
          title: 'Stock Limit Reach',
          description: `Only ${freshProduct.stock} ${freshProduct.unit}(s) available in stock.`,
          type: 'warning',
        });
        return;
      }

      setWholesaleCart(prev => {
        const updated = [...prev];
        const idx = updated.findIndex(item => item.product.id === freshProduct.id);
        if (idx !== -1) {
          updated[idx] = {
            ...updated[idx],
            product: freshProduct,
            price: freshProduct.wholesalePrice,
            discountPerUnit: unitDiscount,
            quantity: newQty,
            lineTotal: computeLineTotal(
              freshProduct.wholesalePrice,
              unitDiscount,
              newQty,
              updated[idx].discountPercent
            ),
          };
        }
        return updated;
      });

      toast({
        title: 'Quantity Updated',
        description: `${freshProduct.name} wholesale quantity increased to ${newQty}`,
        type: 'info',
      });
    } else {
      const item: CartItem = {
        product: freshProduct,
        quantity,
        price: freshProduct.wholesalePrice,
        discountPerUnit: unitDiscount,
        discountPercent: 0,
        lineTotal: computeLineTotal(freshProduct.wholesalePrice, unitDiscount, quantity, 0),
      };
      setWholesaleCart(prev => [...prev, item]);

      const finalPrice = Math.max(0, freshProduct.wholesalePrice - unitDiscount);
      toast({
        title: 'Added to Wholesale Bill',
        description: `${freshProduct.name} — Wholesale: Rs. ${freshProduct.wholesalePrice.toLocaleString()}${
          unitDiscount > 0 ? ` (Disc: -Rs. ${unitDiscount.toLocaleString()} => Final: Rs. ${finalPrice.toLocaleString()})` : ''
        }`,
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
    const fresh = productsService.getById(productId) || item?.product;
    const currentStock = fresh?.stock ?? item?.product.stock ?? 9999;

    if (item && quantity > currentStock) {
      toast({
        title: 'Stock Warning',
        description: `Requested ${quantity}, but only ${currentStock} available.`,
        type: 'warning',
      });
      return;
    }

    setWholesaleCart(prev =>
      prev.map(item => {
        if (item.product.id === productId) {
          const freshProd = productsService.getById(productId) || item.product;
          const freshPrice = freshProd.wholesalePrice;
          const freshDiscount = freshProd.wholesaleDiscount || 0;
          return {
            ...item,
            product: freshProd,
            price: freshPrice,
            discountPerUnit: freshDiscount,
            quantity,
            lineTotal: computeLineTotal(
              freshPrice,
              freshDiscount,
              quantity,
              item.discountPercent
            ),
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
            lineTotal: computeLineTotal(
              item.price,
              item.discountPerUnit || 0,
              item.quantity,
              validDiscount
            ),
          };
        }
        return item;
      })
    );
  };

  const clearWholesaleCart = () => {
    setWholesaleCart([]);
  };

  // Sync active cart items with latest prices and discounts from productsService
  const syncWithLatestProducts = () => {
    setRetailCart(prev =>
      prev.map(item => {
        const fresh = productsService.getById(item.product.id);
        if (!fresh) return item;
        const freshDiscount = fresh.retailDiscount || 0;
        return {
          ...item,
          product: fresh,
          price: fresh.retailPrice,
          discountPerUnit: freshDiscount,
          lineTotal: computeLineTotal(
            fresh.retailPrice,
            freshDiscount,
            item.quantity,
            item.discountPercent
          ),
        };
      })
    );

    setWholesaleCart(prev =>
      prev.map(item => {
        const fresh = productsService.getById(item.product.id);
        if (!fresh) return item;
        const freshDiscount = fresh.wholesaleDiscount || 0;
        return {
          ...item,
          product: fresh,
          price: fresh.wholesalePrice,
          discountPerUnit: freshDiscount,
          lineTotal: computeLineTotal(
            fresh.wholesalePrice,
            freshDiscount,
            item.quantity,
            item.discountPercent
          ),
        };
      })
    );
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
        restoreRetailCart,
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

        syncWithLatestProducts,
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
