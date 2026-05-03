export function formatCurrency(amount: number, currency = 'MYR'): string {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-MY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-MY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

export function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len).trimEnd() + '...';
}

export function formatDeliveryMode(mode: string): string {
  const map: Record<string, string> = {
    online: 'Online',
    physical: 'Physical',
    hybrid: 'Hybrid',
  };
  return map[mode] || mode;
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    published: 'bg-green-100 text-green-800',
    approved: 'bg-green-100 text-green-800',
    selected: 'bg-green-100 text-green-800',
    verified: 'bg-green-100 text-green-800',
    open: 'bg-blue-100 text-blue-800',
    sent: 'bg-blue-100 text-blue-800',
    submitted: 'bg-blue-100 text-blue-800',
    pending_verification: 'bg-yellow-100 text-yellow-800',
    pending_review: 'bg-yellow-100 text-yellow-800',
    pending_subscription: 'bg-yellow-100 text-yellow-800',
    pending: 'bg-yellow-100 text-yellow-800',
    reviewing: 'bg-yellow-100 text-yellow-800',
    shortlisted: 'bg-purple-100 text-purple-800',
    draft: 'bg-gray-100 text-gray-800',
    read: 'bg-gray-100 text-gray-800',
    closed: 'bg-gray-100 text-gray-800',
    expired: 'bg-gray-100 text-gray-800',
    archived: 'bg-gray-100 text-gray-800',
    dismissed: 'bg-gray-100 text-gray-500',
    rejected: 'bg-red-100 text-red-800',
    suspended: 'bg-red-100 text-red-800',
    deactivated: 'bg-red-100 text-red-800',
    cancelled: 'bg-red-100 text-red-800',
    withdrawn: 'bg-red-100 text-red-800',
    replied: 'bg-teal-100 text-teal-800',
    awarded: 'bg-emerald-100 text-emerald-800',
    trusted: 'bg-blue-100 text-blue-800',
    premium: 'bg-amber-100 text-amber-800',
    unverified: 'bg-gray-100 text-gray-600',
  };
  return map[status] || 'bg-gray-100 text-gray-800';
}
