'use client';

import React, { useState, useEffect, useRef } from 'react';
import { User, Check, Plus, Search, X } from 'lucide-react';
import { Customer } from '@/types';
import { customersService } from '@/services/customersService';

interface WholesaleCustomerInputProps {
  value: string;
  onChange: (name: string, customer?: Customer) => void;
  onSelectCustomer?: (customer: Customer) => void;
  disabled?: boolean;
}

export function WholesaleCustomerInput({
  value,
  onChange,
  onSelectCustomer,
  disabled = false,
}: WholesaleCustomerInputProps) {
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState<Customer[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val);

    if (val.trim().length > 0) {
      const matches = customersService.searchCustomers(val).slice(0, 6);
      setSuggestions(matches);
      setIsOpen(true);
      setHighlightedIndex(-1);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  };

  const selectExistingCustomer = (cust: Customer) => {
    setInputValue(cust.name);
    onChange(cust.name, cust);
    if (onSelectCustomer) {
      onSelectCustomer(cust);
    }
    setIsOpen(false);
  };

  const createOrConfirmCustomer = (name: string) => {
    const clean = name.trim();
    if (!clean) return;

    try {
      const cust = customersService.findOrCreateCustomerByName(clean);
      setInputValue(cust.name);
      onChange(cust.name, cust);
      if (onSelectCustomer) {
        onSelectCustomer(cust);
      }
    } catch {
      onChange(clean);
    }
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      if (inputValue.trim().length > 0) {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        selectExistingCustomer(suggestions[highlightedIndex]);
      } else if (inputValue.trim().length > 0) {
        // If there's an exact match in suggestions, choose that, otherwise create/confirm
        const exactMatch = suggestions.find(
          s => s.name.toLowerCase() === inputValue.trim().toLowerCase()
        );
        if (exactMatch) {
          selectExistingCustomer(exactMatch);
        } else {
          createOrConfirmCustomer(inputValue);
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const clearInput = () => {
    setInputValue('');
    onChange('');
    setSuggestions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const exactMatchExists = suggestions.some(
    s => s.name.toLowerCase() === inputValue.trim().toLowerCase()
  );

  return (
    <div ref={wrapperRef} className="relative flex-1 min-w-[200px]">
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
          <User className="w-3.5 h-3.5 text-cyan-600" />
          <span>CUSTOMER NAME</span>
          <span className="text-[10px] text-slate-400 font-normal">(Collector / Shopper)</span>
        </label>
      </div>

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (inputValue.trim().length > 0) {
              const matches = customersService.searchCustomers(inputValue).slice(0, 6);
              setSuggestions(matches);
              setIsOpen(true);
            }
          }}
          disabled={disabled}
          placeholder="Enter shopper name (e.g. Muhammad Bilal)..."
          className="w-full text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition-all placeholder:text-slate-400 placeholder:font-normal"
        />

        {inputValue && !disabled && (
          <button
            type="button"
            onClick={clearInput}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
          {suggestions.length > 0 ? (
            <div className="p-1 space-y-0.5">
              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Matching Customers
              </div>
              {suggestions.map((cust, idx) => {
                const isSelected = idx === highlightedIndex;
                return (
                  <div
                    key={cust.id}
                    onMouseDown={() => selectExistingCustomer(cust)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-cyan-50 text-cyan-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{cust.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {cust.phone || 'No phone'} {cust.city ? `• ${cust.city}` : ''}
                      </div>
                    </div>
                    {cust.businessName && (
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                        {cust.businessName}
                      </span>
                    )}
                  </div>
                );
              })}

              {!exactMatchExists && inputValue.trim().length > 1 && (
                <div
                  onMouseDown={() => createOrConfirmCustomer(inputValue)}
                  className="mt-1 pt-1 border-t border-slate-100 px-2.5 py-1.5 text-xs text-cyan-700 font-bold hover:bg-cyan-50 rounded-lg cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save "{inputValue.trim()}" as new customer (Press Enter)</span>
                </div>
              )}
            </div>
          ) : (
            inputValue.trim().length > 0 && (
              <div className="p-2.5 text-center">
                <p className="text-xs text-slate-600">
                  No existing customer named "{inputValue.trim()}"
                </p>
                <button
                  type="button"
                  onMouseDown={() => createOrConfirmCustomer(inputValue)}
                  className="mt-1.5 inline-flex items-center gap-1 px-3 py-1 bg-cyan-600 text-white text-xs font-bold rounded-lg hover:bg-cyan-700 transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Save New Customer
                </button>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
