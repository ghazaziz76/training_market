'use client';

import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'violet' | 'gray' | 'teal' | 'amber' | 'emerald';
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

const colorMap = {
  blue: 'bg-blue-100 text-blue-800',
  green: 'bg-green-100 text-green-800',
  red: 'bg-red-100 text-red-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  violet: 'bg-violet-100 text-violet-800',
  gray: 'bg-gray-100 text-gray-700',
  teal: 'bg-teal-100 text-teal-800',
  amber: 'bg-amber-100 text-amber-800',
  emerald: 'bg-emerald-100 text-emerald-800',
};

const dotColorMap = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
  violet: 'bg-violet-500',
  gray: 'bg-gray-500',
  teal: 'bg-teal-500',
  amber: 'bg-amber-500',
  emerald: 'bg-emerald-500',
};

export function Badge({ children, color = 'gray', size = 'sm', dot = false, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        colorMap[color],
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        className,
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dotColorMap[color])} />}
      {children}
    </span>
  );
}
