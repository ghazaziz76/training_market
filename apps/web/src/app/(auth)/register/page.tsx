'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, User, GraduationCap, Mail, Lock, Phone, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Input } from '@/components/ui';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/utils';

const roles = [
  {
    value: 'employer',
    label: 'Employer',
    description: 'Find training for your team',
    icon: Building2,
    color: 'border-blue-500 bg-blue-50 text-blue-700',
  },
  {
    value: 'individual',
    label: 'Individual',
    description: 'Find training for yourself',
    icon: User,
    color: 'border-teal-500 bg-teal-50 text-teal-700',
  },
  {
    value: 'provider',
    label: 'Training Provider',
    description: 'Publish and manage programs',
    icon: GraduationCap,
    color: 'border-violet-500 bg-violet-50 text-violet-700',
  },
];

export default function RegisterPage() {
  const { register, isLoading } = useAuthStore();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState('');
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.full_name.trim()) errs.full_name = 'Name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email format';
    if (form.password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirm_password) errs.confirm_password = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const result = await register({
      full_name: form.full_name,
      email: form.email,
      password: form.password,
      role,
      phone: form.phone || undefined,
    });

    if (result.success) {
      setSuccess(true);
    } else {
      toast.error(result.message || 'Registration failed');
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <Mail className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Check your email</h2>
        <p className="mt-2 text-sm text-foreground-muted">
          We&apos;ve sent a verification link to <strong>{form.email}</strong>. Please verify your
          email to continue.
        </p>
        <Link href="/login">
          <Button variant="outline" className="mt-6">
            Back to Sign In
          </Button>
        </Link>
      </div>
    );
  }

  if (step === 1) {
    return (
      <>
        <h2 className="text-xl font-semibold text-foreground mb-2">Create an account</h2>
        <p className="text-sm text-foreground-muted mb-6">Choose how you want to use Training Market</p>
        <div className="space-y-3">
          {roles.map((r) => (
            <button
              key={r.value}
              onClick={() => {
                setRole(r.value);
                setStep(2);
              }}
              className={cn(
                'w-full flex items-center gap-4 rounded-lg border-2 p-4 text-left transition-all hover:shadow-md',
                role === r.value ? r.color : 'border-border hover:border-foreground-subtle',
              )}
            >
              <r.icon className="h-8 w-8 flex-shrink-0" />
              <div>
                <p className="font-semibold">{r.label}</p>
                <p className="text-sm text-foreground-muted">{r.description}</p>
              </div>
            </button>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-foreground-muted">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-user-primary hover:text-user-primary-dark">
            Sign In
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setStep(1)}
        className="mb-4 flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h2 className="text-xl font-semibold text-foreground mb-6">
        Register as {roles.find((r) => r.value === role)?.label}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Name"
          placeholder="Your full name"
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          error={errors.full_name}
          required
        />
        <Input
          label="Email"
          type="email"
          placeholder="you@company.com"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          leftIcon={<Mail className="h-4 w-4" />}
          error={errors.email}
          required
        />
        <Input
          label="Phone (optional)"
          type="tel"
          placeholder="+60 12-345 6789"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          leftIcon={<Phone className="h-4 w-4" />}
        />
        <Input
          label="Password"
          type="password"
          placeholder="Min 8 characters"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          leftIcon={<Lock className="h-4 w-4" />}
          error={errors.password}
          required
        />
        <Input
          label="Confirm Password"
          type="password"
          placeholder="Re-enter password"
          value={form.confirm_password}
          onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
          leftIcon={<Lock className="h-4 w-4" />}
          error={errors.confirm_password}
          required
        />
        <Button type="submit" isLoading={isLoading} className="w-full">
          Create Account
        </Button>
      </form>
    </>
  );
}
