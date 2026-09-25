'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Building, Search, X, ChevronDown, Plus } from 'lucide-react';
import { Customer } from '@/types';
import { customersService } from '@/services/customersService';

interface WholesaleClientSearchProps {
  selectedClient: Customer | null;
  onSelectClient: (client: Customer | null) => void;
  disabled?: boolean;
  filterKhataOnly?: boolean;
  themeColor?: 'cyan' | 'amber';
  titleLabel?: string;
  subtitleLabel?: string;
  placeholder?: string;
}

export function WholesaleClientSearch({
  selectedClient,
  onSelectClient,
  disabled = false,
  filterKhataOnly = false,
  themeColor = 'cyan',
  titleLabel,
  subtitleLabel,
  placeholder,
}: WholesaleClientSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Customer[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const searchClients = (searchVal: string): Customer[] => {
    if (filterKhataOnly) {
      return customersService.getAll().filter(c => {
        const isKhataEligible = c.type === 'Khata' || c.creditLimit > 0;
        if (!isKhataEligible) return false;
        if (!searchVal.trim()) return true;
        const q = searchVal.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          (c.businessName && c.businessName.toLowerCase().includes(q)) ||
          c.phone.includes(q)
        );
      });
    }
    return customersService.searchWholesaleClients(searchVal);
  };

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
    const results = searchClients(val);
    setSuggestions(results);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleOpenDropdown = () => {
    if (disabled) return;
    const all = searchClients(query);
    setSuggestions(all);
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
    setSuggestions(searchClients(''));
    inputRef.current?.focus();
  };

  const handleCreateOrConfirm = (name: string) => {
    const clean = name.trim();
    if (!clean) return;

    if (filterKhataOnly) {
      const newAccount = customersService.findOrCreateKhataAccount(clean);
      handleSelect(newAccount);
    } else {
      const existing = customersService.searchCustomers(clean).find(
        c =>
          c.name.toLowerCase() === clean.toLowerCase() ||
          (c.businessName && c.businessName.toLowerCase() === clean.toLowerCase())
      );
      if (existing) {
        handleSelect(existing);
      } else {
        const newClient = customersService.add({
          name: clean,
          businessName: clean,
          phone: '',
          address: 'Wholesale Market',
          city: 'Lahore',
          type: 'Wholesale',
          creditLimit: 0,
        });
        handleSelect(newClient);
      }
    }
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
      } else if (query.trim().length > 0) {
        const exact = suggestions.find(
          s =>
            s.name.toLowerCase() === query.trim().toLowerCase() ||
            (s.businessName && s.businessName.toLowerCase() === query.trim().toLowerCase())
        );
        if (exact) {
          handleSelect(exact);
        } else {
          handleCreateOrConfirm(query);
        }
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
          <Building className={`w-3.5 h-3.5 ${themeColor === 'amber' ? 'text-amber-600' : 'text-cyan-600'}`} />
          <span>{titleLabel || 'CLIENT'}</span>
          <span className="text-[10px] text-slate-400 font-normal">{subtitleLabel || '(Wholesale Business Account)'}</span>
        </label>
        {selectedClient && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="text-[10px] text-slate-400 hover:text-rose-600 font-semibold"
          >
            Change {themeColor === 'amber' ? 'Account' : 'Client'}
          </button>
        )}
      </div>

      {/* If a client is selected, show selected client pill with option to search */}
      {selectedClient ? (
        <div
          onClick={handleOpenDropdown}
          className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-colors group ${
            themeColor === 'amber'
              ? 'bg-amber-50/60 border-amber-300 hover:bg-amber-50'
              : 'bg-cyan-50/60 border-cyan-300 hover:bg-cyan-50'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`w-7 h-7 rounded-lg text-white flex items-center justify-center font-bold text-xs shrink-0 ${
                themeColor === 'amber' ? 'bg-amber-600' : 'bg-cyan-600'
              }`}
            >
              {(selectedClient.businessName || selectedClient.name).slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 truncate leading-tight">
              <div className={`font-bold truncate ${themeColor === 'amber' ? 'text-amber-950' : 'text-cyan-950'}`}>
                {selectedClient.businessName || selectedClient.name}
              </div>
              <div className={`text-[10px] truncate ${themeColor === 'amber' ? 'text-amber-700' : 'text-cyan-700'}`}>
                {selectedClient.name} {selectedClient.city ? `• ${selectedClient.city}` : ''}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[10px] font-mono font-bold text-slate-600 bg-white/80 px-2 py-0.5 rounded border ${
              themeColor === 'amber' ? 'border-amber-200' : 'border-cyan-200'
            }`}>
              Rs. {selectedClient.currentBalance.toLocaleString()}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform ${
              themeColor === 'amber' ? 'text-amber-600' : 'text-cyan-600'
            }`} />
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
            placeholder={placeholder || (filterKhataOnly ? 'Search Khata account by name, business, or phone...' : 'Search wholesale client (e.g. Ahmed Traders, phone)...')}
            className={`w-full text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl pl-8.5 pr-8 py-2 focus:outline-none focus:ring-2 focus:bg-white transition-all placeholder:text-slate-400 placeholder:font-normal ${
              themeColor === 'amber' ? 'focus:ring-amber-500' : 'focus:ring-cyan-500'
            }`}
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
            <div className="p-3 text-center">
              <p className="text-xs text-slate-500 mb-2">
                No existing {filterKhataOnly ? 'Khata account' : 'client'} matched "{query.trim()}".
              </p>
              {query.trim().length > 0 && (
                <button
                  type="button"
                  onMouseDown={() => handleCreateOrConfirm(query)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-bold rounded-xl shadow-xs transition-colors ${
                    themeColor === 'amber' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-cyan-600 hover:bg-cyan-700'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create & Select "{query.trim()}" (Enter)</span>
                </button>
              )}
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
                        ? themeColor === 'amber'
                          ? 'bg-amber-100/70 text-amber-950 font-semibold'
                          : 'bg-cyan-100/70 text-cyan-950 font-semibold'
                        : isCurrent
                        ? themeColor === 'amber'
                          ? 'bg-amber-50 text-amber-900 font-bold'
                          : 'bg-cyan-50 text-cyan-900 font-bold'
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

              {query.trim().length > 1 &&
                !suggestions.some(
                  s =>
                    s.name.toLowerCase() === query.trim().toLowerCase() ||
                    (s.businessName && s.businessName.toLowerCase() === query.trim().toLowerCase())
                ) && (
                  <div
                    onMouseDown={() => handleCreateOrConfirm(query)}
                    className={`mt-1 pt-1 border-t border-slate-100 px-2.5 py-1.5 text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors ${
                      themeColor === 'amber'
                        ? 'text-amber-800 hover:bg-amber-50'
                        : 'text-cyan-800 hover:bg-cyan-50'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create & Select "{query.trim()}" as new {filterKhataOnly ? 'Khata Account' : 'Client'} (Press Enter)</span>
                  </div>
                )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
