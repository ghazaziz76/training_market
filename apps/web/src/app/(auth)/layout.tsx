export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-user-primary-50 via-background to-user-accent-light p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center flex flex-col items-center">
          <img src="/logo.png" alt="Training Market" className="h-24 w-auto" />
          <p className="mt-1 text-sm text-foreground-muted">
            Malaysia&apos;s intelligent training marketplace
          </p>
        </div>
        <div className="rounded-xl border border-border bg-background-paper p-8 shadow-lg">
          {children}
        </div>
      </div>
    </div>
  );
}
