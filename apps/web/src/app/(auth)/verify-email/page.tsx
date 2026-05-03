'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button, Spinner } from '@/components/ui';
import { api } from '@/lib/api';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided');
      return;
    }

    api.post('/auth/verify-email', { token }).then((res) => {
      if (res.success) {
        setStatus('success');
        setMessage('Your email has been verified successfully!');
      } else {
        setStatus('error');
        setMessage(res.message || 'Verification failed');
      }
    });
  }, [token]);

  return (
    <div className="text-center">
      {status === 'loading' && (
        <>
          <Loader2 className="mx-auto h-12 w-12 text-user-primary animate-spin mb-4" />
          <h2 className="text-xl font-semibold text-foreground">Verifying your email...</h2>
        </>
      )}
      {status === 'success' && (
        <>
          <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
          <h2 className="text-xl font-semibold text-foreground">Email Verified!</h2>
          <p className="mt-2 text-sm text-foreground-muted">{message}</p>
          <Link href="/login">
            <Button className="mt-6">Sign In</Button>
          </Link>
        </>
      )}
      {status === 'error' && (
        <>
          <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-foreground">Verification Failed</h2>
          <p className="mt-2 text-sm text-foreground-muted">{message}</p>
          <Link href="/login">
            <Button variant="outline" className="mt-6">
              Back to Sign In
            </Button>
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Spinner size="lg" /></div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
