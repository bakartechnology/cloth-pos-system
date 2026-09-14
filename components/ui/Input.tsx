import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, leftIcon, rightElement, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full rounded-lg border bg-white text-slate-900 placeholder:text-slate-400 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500 ${
              leftIcon ? 'pl-9' : 'pl-3.5'
            } ${rightElement ? 'pr-12' : 'pr-3.5'} py-2 h-10 ${
              error ? 'border-rose-400 focus:ring-rose-400' : 'border-slate-200 hover:border-slate-300'
            } ${className}`}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-2 flex items-center">
              {rightElement}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-rose-600 mt-1 font-medium">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
