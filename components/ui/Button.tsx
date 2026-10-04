'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'destructive' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', isLoading = false, children, disabled, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

    const variants = {
      primary:
        'bg-[#125E45] text-white hover:bg-[#197A5A] shadow-xs focus:ring-[#197A5A]',
      secondary:
        'border border-[#DCE3E0] bg-white text-[#17211D] hover:bg-[#F0F4F2] hover:border-[#C7D2CD] focus:ring-[#197A5A]',
      accent:
        'bg-[#DCEDE6] text-[#125E45] hover:bg-[#cbe3d9] focus:ring-[#197A5A]',
      outline:
        'border border-[#DCE3E0] bg-white text-[#17211D] hover:bg-[#F0F4F2] hover:border-[#C7D2CD] focus:ring-[#197A5A]',
      ghost:
        'text-[#66726D] hover:text-[#17211D] hover:bg-[#F0F4F2] focus:ring-[#197A5A]',
      destructive:
        'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 shadow-xs',
      success:
        'bg-[#197A5A] text-white hover:bg-[#125E45] focus:ring-[#197A5A] shadow-xs',
    };

    const sizes = {
      sm: 'text-xs px-2.5 py-1.5 h-8 gap-1.5',
      md: 'text-sm px-4 py-2 h-10 gap-2',
      lg: 'text-base px-5 py-2.5 h-12 gap-2.5',
      icon: 'h-9 w-9 p-0',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
