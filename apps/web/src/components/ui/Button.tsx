'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './Spinner';

type Portal = 'user' | 'vendor' | 'admin';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  portal?: Portal;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const portalPrimary: Record<Portal, string> = {
  user: 'bg-user-primary hover:bg-user-primary-dark text-white',
  vendor: 'bg-vendor-primary hover:bg-vendor-primary-dark text-white',
  admin: 'bg-admin-accent hover:bg-admin-accent-dark text-white',
};

const portalOutline: Record<Portal, string> = {
  user: 'border-user-primary text-user-primary hover:bg-user-primary-light',
  vendor: 'border-vendor-primary text-vendor-primary hover:bg-vendor-primary-light',
  admin: 'border-admin-accent text-admin-accent hover:bg-admin-accent-light',
};

const portalGhost: Record<Portal, string> = {
  user: 'text-user-primary hover:bg-user-primary-light',
  vendor: 'text-vendor-primary hover:bg-vendor-primary-light',
  admin: 'text-admin-accent hover:bg-admin-accent-light',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      portal = 'user',
      isLoading = false,
      leftIcon,
      rightIcon,
      className,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const base =
      'inline-flex items-center justify-center gap-2 rounded font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

    const variants = {
      primary: portalPrimary[portal],
      secondary: 'bg-foreground-muted/10 text-foreground hover:bg-foreground-muted/20',
      outline: `border ${portalOutline[portal]}`,
      ghost: portalGhost[portal],
      danger: 'bg-red-600 hover:bg-red-700 text-white',
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizeClasses[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? <Spinner size="sm" /> : leftIcon}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  },
);

Button.displayName = 'Button';
