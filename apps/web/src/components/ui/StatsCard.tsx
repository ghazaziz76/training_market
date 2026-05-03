'use client';

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  icon?: ReactNode;
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  className?: string;
}

export function StatsCard({ icon, label, value, change, changeType = 'neutral', className }: StatsCardProps) {
  return (
    <div className={cn('rounded-lg border border-border bg-background-paper p-6', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground-muted">{label}</span>
        {icon && <div className="text-foreground-subtle">{icon}</div>}
      </div>
      <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
      {change && (
        <p
          className={cn(
            'mt-1 text-sm font-medium',
            changeType === 'positive' && 'text-green-600',
            changeType === 'negative' && 'text-red-600',
            changeType === 'neutral' && 'text-foreground-muted',
          )}
        >
          {change}
        </p>
      )}
    </div>
  );
}
