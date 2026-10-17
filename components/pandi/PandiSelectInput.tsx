'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Truck, Check, Plus, UserCheck, X } from 'lucide-react';
import { Pandi } from '@/types';
import { pandisService } from '@/services/pandisService';

interface PandiSelectInputProps {
  value: string;
  onChange: (pandiName: string, pandiObj?: Pandi | null) => void;
  placeholder?: string;
  label?: string;
}

export function PandiSelectInput({
  value,
  onChange,
  placeholder = 'Type or select Pandi name...',
  label = 'Pandi Name',
}: PandiSelectInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pandis, setPandis] = useState<Pandi[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickPhone, setQuickPhone] = useState('');
  const [quickTransport, setQuickTransport] = useState<Pandi['transportMode']>('Rehri / Handcart');

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPandis(pandisService.getAll());
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsQuickAddOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = React.useMemo(() => {
    const q = (value || '').toLowerCase().trim();
    if (!q) return pandis;
    return pandis.filter(p => p.name.toLowerCase().includes(q));
  }, [pandis, value]);

  const handleSelectPandi = (pandi: Pandi) => {
    onChange(pandi.name, pandi);
    setIsOpen(false);
    setIsQuickAddOpen(false);
  };

  const handleClear = () => {
    onChange('', null);
    inputRef.current?.focus();
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;

    const newPandi = pandisService.add({
      name: value.trim(),
      phone: quickPhone.trim() || '—',
      transportMode: quickTransport,
      marketZone: 'Main Cloth Market',
      status: 'Active',
      totalTrips: 1,
    });

    setPandis(pandisService.getAll());
    handleSelectPandi(newPandi);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex(prev => (prev < filtered.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && filtered[highlightedIndex]) {
        e.preventDefault();
        handleSelectPandi(filtered[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setIsQuickAddOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="space-y-1 relative">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-[#17211D]">
          {label}
        </label>
        {value && (
          <span className="text-[10px] text-[#197A5A] font-semibold bg-[#DCEDE6] px-2 py-0.5 rounded-full">
            Selected
          </span>
        )}
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#66726D]">
          <Truck className="w-4 h-4 text-[#197A5A]" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => {
            onChange(e.target.value, null);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-9 pr-8 py-2 border border-[#DCE3E0] rounded-xl text-xs bg-white text-[#17211D] placeholder:text-[#8A9590] focus:outline-none focus:ring-2 focus:ring-[#197A5A] focus:border-transparent transition-all shadow-2xs"
        />

        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[#8A9590] hover:text-[#C23D45] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* DROPDOWN OF REGISTERED PANDIS - ONLY NAMES SHOWN */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-[#C7D2CD] rounded-xl shadow-lg overflow-hidden max-h-56 flex flex-col animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 bg-[#F0F4F2] border-b border-[#DCE3E0] flex items-center justify-between text-[11px] text-[#66726D] font-medium">
            <span>Select Pandi ({filtered.length})</span>
            <span className="text-[10px] text-[#8A9590]">Press Enter or Click</span>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-[#F0F4F2]">
            {filtered.length === 0 ? (
              <div className="p-3 text-center text-xs text-[#66726D]">
                <p className="font-semibold text-[#17211D]">No Pandi found named &quot;{value}&quot;</p>
                <p className="text-[11px] mt-0.5 text-[#8A9590]">
                  You can keep this name or register new below.
                </p>
                {!isQuickAddOpen && (
                  <button
                    type="button"
                    onClick={() => setIsQuickAddOpen(true)}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-[#125E45] hover:bg-[#197A5A] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Quick Register &quot;{value}&quot;</span>
                  </button>
                )}
              </div>
            ) : (
              filtered.map((p, idx) => {
                const isSelected = value.toLowerCase().trim() === p.name.toLowerCase().trim();
                const isHighlighted = idx === highlightedIndex;

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPandi(p)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#E9F3EF] border-l-4 border-l-[#197A5A] font-bold text-[#125E45]'
                        : isHighlighted
                        ? 'bg-[#F0F4F2] text-[#17211D]'
                        : 'hover:bg-[#F0F4F2] text-[#17211D]'
                    }`}
                  >
                    {/* ONLY PANDI NAME SHOWN */}
                    <span className="text-xs truncate">{p.name}</span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-[#16835B] shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* QUICK ADD INLINE FORM */}
          {isQuickAddOpen && (
            <div className="p-3 bg-[#F0F4F2] border-t border-[#DCE3E0] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#17211D]">Register New Pandi</span>
                <button
                  type="button"
                  onClick={() => setIsQuickAddOpen(false)}
                  className="text-[#66726D] hover:text-[#C23D45] text-xs"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] font-semibold text-[#66726D] block mb-0.5">Phone Number</label>
                  <input
                    type="text"
                    placeholder="0300-1234567"
                    value={quickPhone}
                    onChange={e => setQuickPhone(e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-[#DCE3E0] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#197A5A]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-[#66726D] block mb-0.5">Transport Mode</label>
                  <select
                    value={quickTransport}
                    onChange={e => setQuickTransport(e.target.value as Pandi['transportMode'])}
                    className="w-full px-2 py-1 bg-white border border-[#DCE3E0] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#197A5A]"
                  >
                    <option value="Rehri / Handcart">Rehri / Handcart</option>
                    <option value="Loader Rickshaw">Loader Rickshaw</option>
                    <option value="Motorcycle">Motorcycle</option>
                    <option value="On Foot">On Foot</option>
                    <option value="Cargo / Builty">Cargo / Builty</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleQuickAdd}
                className="w-full py-1.5 bg-[#125E45] hover:bg-[#197A5A] text-white rounded-lg text-xs font-bold transition-all shadow-2xs"
              >
                Save & Select Pandi
              </button>
            </div>
          )}

          {!isQuickAddOpen && filtered.length > 0 && (
            <div className="p-2 bg-[#F0F4F2] border-t border-[#DCE3E0] flex items-center justify-between text-[11px]">
              <span className="text-[#66726D]">Register another Pandi?</span>
              <button
                type="button"
                onClick={() => setIsQuickAddOpen(true)}
                className="text-[#125E45] hover:text-[#197A5A] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add New
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
