'use client';

import { useEffect, useState } from 'react';
import { CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import { VendorHeader } from '@/components/layout/VendorHeader';
import { Card, Badge, Button, Spinner } from '@/components/ui';
import { formatDate, formatCurrency } from '@/lib/format';
import { api } from '@/lib/api';

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/subscriptions/my').then((res) => {
      setSubscription(res.data || null);
      setLoading(false);
    });
  }, []);

  if (loading) return <><VendorHeader title="Subscription" /><div className="flex min-h-[60vh] items-center justify-center"><Spinner size="lg" /></div></>;

  return (
    <>
      <VendorHeader title="Subscription" />
      <div className="p-6 max-w-3xl">
        {subscription ? (
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-full bg-vendor-primary-light p-3">
                <CreditCard className="h-6 w-6 text-vendor-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{subscription.plan_name || 'Annual Plan'}</h2>
                <Badge color={subscription.payment_status === 'active' ? 'green' : 'yellow'}>{subscription.payment_status}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm mb-6">
              <div><span className="text-foreground-muted">Start Date:</span><br /><strong>{formatDate(subscription.start_date)}</strong></div>
              <div><span className="text-foreground-muted">End Date:</span><br /><strong>{formatDate(subscription.end_date)}</strong></div>
              <div><span className="text-foreground-muted">Amount:</span><br /><strong>{formatCurrency(subscription.amount)}</strong></div>
              <div><span className="text-foreground-muted">Billing Cycle:</span><br /><strong className="capitalize">{subscription.billing_cycle}</strong></div>
            </div>
            {subscription.payment_status === 'active' ? (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle className="h-4 w-4" /> Your subscription is active
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-600 text-sm">
                <AlertCircle className="h-4 w-4" /> Your subscription needs attention
                <Button size="sm" portal="vendor" className="ml-auto">Renew Now</Button>
              </div>
            )}
          </Card>
        ) : (
          <Card>
            <div className="text-center py-8">
              <CreditCard className="mx-auto h-12 w-12 text-foreground-subtle mb-4" />
              <h2 className="text-lg font-semibold text-foreground">No Active Subscription</h2>
              <p className="text-sm text-foreground-muted mt-1 mb-4">Subscribe to publish programs and receive enquiries</p>
              <Button portal="vendor">Subscribe Now</Button>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
