'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Building, Search, X, Check, Phone, MapPin, ChevronDown } from 'lucide-react';
import { Customer } from '@/types';
import { customersService } from '@/services/customersService';

interface WholesaleClientSearchProps {
  selectedClient: Customer | null;
  onSelectClient: (client: Customer | null) => void;
  disabled?: boolean;
}

export function WholesaleClientSearch({
  selectedClient,
  onSelectClient,
  disabled = false,
}: WholesaleClientSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Customer[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    const results = customersService.searchWholesaleClients(val);
    setSuggestions(results);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleOpenDropdown = () => {
    if (disabled) return;
    const allWholesale = customersService.searchWholesaleClients(query);
    setSuggestions(allWholesale);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleSelect = (client: Customer) => {
    onSelectClient(client);
    setQuery('');
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleClear = () => {
    onSelectClient(null);
    setQuery('');
    setSuggestions(customersService.searchWholesaleClients(''));
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      handleOpenDropdown();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        handleSelect(suggestions[highlightedIndex]);
      } else if (suggestions.length > 0) {
        handleSelect(suggestions[0]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative flex-1 min-w-[240px]">
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
          <Building className="w-3.5 h-3.5 text-cyan-600" />
          <span>CLIENT</span>
          <span className="text-[10px] text-slate-400 font-normal">(Wholesale Business Account)</span>
        </label>
        {selectedClient && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="text-[10px] text-slate-400 hover:text-rose-600 font-semibold"
          >
            Change Client
          </button>
        )}
      </div>

      {/* If a client is selected, show selected client pill with option to search */}
      {selectedClient ? (
        <div
          onClick={handleOpenDropdown}
          className="flex items-center justify-between p-2 rounded-xl bg-cyan-50/60 border border-cyan-300 text-xs cursor-pointer hover:bg-cyan-50 transition-colors group"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-cyan-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
              {(selectedClient.businessName || selectedClient.name).slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 truncate leading-tight">
              <div className="font-bold text-cyan-950 truncate">
                {selectedClient.businessName || selectedClient.name}
              </div>
              <div className="text-[10px] text-cyan-700 truncate">
                {selectedClient.name} {selectedClient.city ? `• ${selectedClient.city}` : ''}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-mono font-bold text-slate-600 bg-white/80 px-2 py-0.5 rounded border border-cyan-200">
              Rs. {selectedClient.currentBalance.toLocaleString()}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-cyan-600 group-hover:translate-y-0.5 transition-transform" />
          </div>
        </div>
      ) : (
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            onFocus={handleOpenDropdown}
            disabled={disabled}
            placeholder="Search wholesale client (e.g. Ahmed Traders, phone)..."
            className="w-full text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl pl-8.5 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition-all placeholder:text-slate-400 placeholder:font-normal"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSuggestions(customersService.searchWholesaleClients(''));
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Autocomplete Suggestions Popup */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden max-h-72 overflow-y-auto animate-in fade-in zoom-in-95">
          <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span>WHOLESALE CLIENTS ({suggestions.length})</span>
            <span className="text-[10px] font-normal text-slate-400">↑↓ to navigate, ENTER to select</span>
          </div>

          {suggestions.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">
              No wholesale client matched "{query}".
            </div>
          ) : (
            <div className="p-1 space-y-0.5">
              {suggestions.map((client, idx) => {
                const isSelected = idx === highlightedIndex;
                const isCurrent = selectedClient?.id === client.id;

                return (
                  <div
                    key={client.id}
                    onMouseDown={() => handleSelect(client)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-cyan-100/70 text-cyan-950 font-semibold'
                        : isCurrent
                        ? 'bg-cyan-50 text-cyan-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5 truncate">
                        <span>{client.businessName || client.name}</span>
                        {client.type === 'Khata' && (
                          <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-mono font-semibold">
                            Khata
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5 truncate">
                        <span>Contact: {client.name}</span>
                        {client.phone && <span>• {client.phone}</span>}
                        {client.city && <span>• {client.city}</span>}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[9px] text-slate-400">Current Balance:</div>
                      <div className="font-mono font-bold text-rose-600 text-xs">
                        Rs. {client.currentBalance.toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
