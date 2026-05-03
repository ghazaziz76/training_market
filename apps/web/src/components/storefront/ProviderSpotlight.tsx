'use client';

import { Avatar, Badge } from '@/components/ui';

interface ProviderSpotlightProps {
  provider: {
    provider_id: string;
    provider_name: string;
    logo_url?: string | null;
    quality_tier?: string;
    business_description?: string | null;
    _count?: { programs: number };
  };
}

const tierColor: Record<string, 'green' | 'blue' | 'amber' | 'gray'> = {
  verified: 'green',
  trusted: 'blue',
  premium: 'amber',
  unverified: 'gray',
};

export function ProviderSpotlight({ provider }: ProviderSpotlightProps) {
  return (
    <div className="rounded-lg border border-border bg-background-paper p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <Avatar name={provider.provider_name} src={provider.logo_url} size="md" />
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground truncate">{provider.provider_name}</h3>
          {provider.quality_tier && provider.quality_tier !== 'unverified' && (
            <Badge color={tierColor[provider.quality_tier] || 'gray'} size="sm">
              {provider.quality_tier}
            </Badge>
          )}
        </div>
      </div>
      {provider.business_description && (
        <p className="text-sm text-foreground-muted line-clamp-2 mb-3">
          {provider.business_description}
        </p>
      )}
      {provider._count && (
        <p className="text-xs text-foreground-subtle">
          {provider._count.programs} program{provider._count.programs !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
