import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '../lib/utils';

interface Option {
  label: string;
  value: string;
}

interface Props {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchableSelect({ options, value, onChange, placeholder = '-- Chọn --', className }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);
  
  const filteredOptions = options.filter(o => 
    (o.label ? String(o.label).toLowerCase() : '').includes((searchTerm || '').toLowerCase()) || 
    (o.value ? String(o.value).toLowerCase() : '').includes((searchTerm || '').toLowerCase())
  );

  return (
    <div className={cn("relative w-full", className)} ref={wrapperRef}>
      <div 
        className="w-full border border-slate-300 rounded-lg px-3 py-[7px] text-sm bg-white cursor-pointer flex justify-between items-center h-[38px]"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setSearchTerm('');
        }}
      >
        <span className={cn("truncate", selectedOption ? 'text-slate-900' : 'text-slate-500')}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform flex-shrink-0", isOpen && "rotate-180")} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              autoFocus
              className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-sm p-0 m-0"
              placeholder="Tìm kiếm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-500 text-center">Không tìm thấy kết quả</div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  className={cn(
                    "px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition-colors",
                    value === opt.value ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700"
                  )}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                >
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
