'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Input } from '@/components/ui';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const res = await api.post('/auth/forgot-password', { email });
    setIsLoading(false);
    if (res.success) {
      setSent(true);
    } else {
      toast.error(res.message || 'Something went wrong');
    }
  };

  if (sent) {
    return (
      <div className="text-center">
        <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
        <h2 className="text-xl font-semibold text-foreground">Check your email</h2>
        <p className="mt-2 text-sm text-foreground-muted">
          If an account exists with <strong>{email}</strong>, we&apos;ve sent a password reset link.
        </p>
        <Link href="/login">
          <Button variant="outline" className="mt-6">
            Back to Sign In
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <Link
        href="/login"
        className="mb-4 flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Sign In
      </Link>
      <h2 className="text-xl font-semibold text-foreground mb-2">Forgot password?</h2>
      <p className="text-sm text-foreground-muted mb-6">
        Enter your email and we&apos;ll send you a reset link.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail className="h-4 w-4" />}
          required
        />
        <Button type="submit" isLoading={isLoading} className="w-full">
          Send Reset Link
        </Button>
      </form>
    </>
  );
}
