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
    let activeCustomer = cust;
    if (activeCustomer.type === 'Retail') {
      activeCustomer = customersService.update(activeCustomer.id, { type: 'Wholesale' }) || activeCustomer;
    }
    setInputValue(activeCustomer.name);
    onChange(activeCustomer.name, activeCustomer);
    if (onSelectCustomer) {
      onSelectCustomer(activeCustomer);
    }
    setIsOpen(false);
  };

  const createOrConfirmCustomer = (name: string) => {
    const clean = name.trim();
    if (!clean) return;

    try {
      const cust = customersService.findOrCreateCustomerByName(clean, undefined, 'Wholesale');
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
        <label className="text-xs font-semibold text-[#17211D] flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-[#197A5A]" />
          <span>Customer Name</span>
          <span className="text-[10px] text-[#8A9590] font-normal">(Collector / Shopper)</span>
        </label>
      </div>

      <div className="relative">
        <User className="w-3.5 h-3.5 text-[#8A9590] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (inputValue.trim().length > 0) {
              const matches = customersService.searchCustomers(inputValue).slice(0, 8);
              setSuggestions(matches);
            } else {
              setSuggestions(customersService.getAll().slice(0, 8));
            }
            setIsOpen(true);
          }}
          onClick={() => {
            if (!isOpen) {
              if (inputValue.trim().length > 0) {
                setSuggestions(customersService.searchCustomers(inputValue).slice(0, 8));
              } else {
                setSuggestions(customersService.getAll().slice(0, 8));
              }
              setIsOpen(true);
            }
          }}
          disabled={disabled}
          placeholder="Enter or select customer (e.g. Ahmed Raza)..."
          className="w-full text-xs font-medium text-[#17211D] bg-white border border-[#DCE3E0] rounded-xl pl-9 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-[#197A5A] transition-all placeholder:text-[#8A9590] placeholder:font-normal"
        />

        {inputValue && !disabled && (
          <button
            type="button"
            onClick={clearInput}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A9590] hover:text-[#17211D]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#DCE3E0] rounded-xl shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
          {suggestions.length > 0 ? (
            <div className="p-1 space-y-0.5">
              <div className="px-2 py-1 text-[10px] font-bold text-[#8A9590] uppercase tracking-wider">
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
                        ? 'bg-[#E9F3EF] text-[#125E45] font-bold'
                        : 'text-[#17211D] hover:bg-[#F0F4F2]'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-[#17211D]">{cust.name}</div>
                      <div className="text-[10px] text-[#8A9590]">
                        {cust.phone || 'No phone'} {cust.city ? `• ${cust.city}` : ''}
                      </div>
                    </div>
                    {cust.businessName && (
                      <span className="text-[10px] bg-[#F0F4F2] text-[#66726D] px-1.5 py-0.5 rounded font-medium border border-[#DCE3E0]">
                        {cust.businessName}
                      </span>
                    )}
                  </div>
                );
              })}

              {!exactMatchExists && inputValue.trim().length > 1 && (
                <div
                  onMouseDown={() => createOrConfirmCustomer(inputValue)}
                  className="mt-1 pt-1 border-t border-[#DCE3E0] px-2.5 py-1.5 text-xs text-[#197A5A] font-bold hover:bg-[#E9F3EF] rounded-lg cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save "{inputValue.trim()}" as new customer (Press Enter)</span>
                </div>
              )}
            </div>
          ) : (
            inputValue.trim().length > 0 && (
              <div className="p-2.5 text-center">
                <p className="text-xs text-[#66726D]">
                  No existing customer named "{inputValue.trim()}"
                </p>
                <button
                  type="button"
                  onMouseDown={() => createOrConfirmCustomer(inputValue)}
                  className="mt-1.5 inline-flex items-center gap-1 px-3 py-1 bg-[#197A5A] text-white text-xs font-bold rounded-lg hover:bg-[#125E45] transition-colors shadow-2xs"
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
