'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Input } from '@/components/ui';
import { useAuthStore } from '@/stores/auth';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await login(email, password);
    if (result.success) {
      const user = useAuthStore.getState().user;
      toast.success('Welcome back!');
      switch (user?.role) {
        case 'employer':
          router.push('/employer');
          break;
        case 'individual':
          router.push('/individual');
          break;
        case 'provider':
          router.push('/provider/dashboard');
          break;
        case 'admin':
          router.push('/admin');
          break;
        default:
          router.push('/');
      }
    } else {
      toast.error(result.message || 'Login failed');
    }
  };

  return (
    <>
      <h2 className="text-xl font-semibold text-foreground mb-6">Sign in to your account</h2>
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
        <Input
          label="Password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leftIcon={<Lock className="h-4 w-4" />}
          required
        />
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm text-user-primary hover:text-user-primary-dark"
          >
            Forgot password?
          </Link>
        </div>
        <Button type="submit" isLoading={isLoading} className="w-full">
          Sign In
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-foreground-muted">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-medium text-user-primary hover:text-user-primary-dark">
          Register
        </Link>
      </p>
    </>
  );
}
