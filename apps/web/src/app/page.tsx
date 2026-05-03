export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <img src="/logo.png" alt="Training Market" className="h-40 w-auto" />
      <p className="text-foreground-muted text-lg -mt-4">
        Malaysia&apos;s intelligent training marketplace
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 w-full max-w-4xl">
        {/* User Portal */}
        <a
          href="/login"
          className="rounded-lg border border-border p-6 hover:border-user-primary hover:shadow-lg transition-all group"
        >
          <div className="h-2 w-full bg-user-primary rounded-full mb-4" />
          <h2 className="text-xl font-semibold text-foreground group-hover:text-user-primary">
            Employer / Individual
          </h2>
          <p className="text-foreground-muted mt-2 text-sm">
            Find and compare training programs, get AI recommendations
          </p>
          <div className="mt-4 rounded bg-user-primary-light px-3 py-2 text-xs font-mono text-user-primary-dark">
            <p className="font-semibold text-foreground mb-1 font-sans text-xs">Demo Login:</p>
            <p>EMP1@demo.com / EMP123</p>
          </div>
        </a>

        {/* Vendor Portal */}
        <a
          href="/login"
          className="rounded-lg border border-border p-6 hover:border-vendor-primary hover:shadow-lg transition-all group"
        >
          <div className="h-2 w-full bg-vendor-primary rounded-full mb-4" />
          <h2 className="text-xl font-semibold text-foreground group-hover:text-vendor-primary">
            Training Provider
          </h2>
          <p className="text-foreground-muted mt-2 text-sm">
            Publish programs, manage enquiries, respond to requests
          </p>
          <div className="mt-4 rounded bg-vendor-primary-light px-3 py-2 text-xs font-mono text-vendor-primary-dark">
            <p className="font-semibold text-foreground mb-1 font-sans text-xs">Demo Login:</p>
            <p>TP1@demo.com / TP123</p>
          </div>
        </a>

        {/* Admin Portal */}
        <a
          href="/login"
          className="rounded-lg border border-border p-6 hover:border-admin-accent hover:shadow-lg transition-all group"
        >
          <div className="h-2 w-full bg-admin-primary rounded-full mb-4" />
          <h2 className="text-xl font-semibold text-foreground group-hover:text-admin-accent">
            Admin Portal
          </h2>
          <p className="text-foreground-muted mt-2 text-sm">
            Platform management, moderation, analytics
          </p>
          <div className="mt-4 rounded bg-background-subtle px-3 py-2 text-xs font-mono text-foreground">
            <p className="font-semibold text-foreground mb-1 font-sans text-xs">Demo Login:</p>
            <p>admin@trainingmarket.my / admin123</p>
          </div>
        </a>
      </div>
    </main>
  );
}
