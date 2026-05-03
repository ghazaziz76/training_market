'use client';

import { cn } from '@/lib/utils';

const API_HOST = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/api$/, '');

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function resolveUrl(src: string): string {
  if (src.startsWith('http')) return src;
  if (src.startsWith('/api/')) return `${API_HOST}${src}`;
  return src;
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={resolveUrl(src)}
        alt={name}
        className={cn('rounded-full object-cover', sizeMap[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-user-primary-light text-user-primary font-semibold',
        sizeMap[size],
        className,
      )}
    >
      {getInitials(name)}
    </div>
  );
}
