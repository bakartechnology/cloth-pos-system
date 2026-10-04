import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive' | 'cyan';
  size?: 'sm' | 'md';
}

export function Badge({
  variant = 'default',
  size = 'md',
  className = '',
  children,
  ...props
}: BadgeProps) {
  const variants = {
    default: 'bg-[#DCEDE6] text-[#125E45] border-[#C7D2CD]/60',
    secondary: 'bg-[#F0F4F2] text-[#66726D] border-[#DCE3E0]',
    outline: 'bg-transparent text-[#66726D] border-[#DCE3E0]',
    success: 'bg-[#DCEDE6] text-[#125E45] border-[#C7D2CD]/60',
    warning: 'bg-[#F7EEDC] text-[#9A6A16] border-[#F7EEDC]',
    destructive: 'bg-rose-50 text-rose-700 border-rose-200/60',
    cyan: 'bg-[#E9F3EF] text-[#197A5A] border-[#DCE3E0]',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-medium',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border leading-none ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
