import Link from 'next/link';

export function UserFooter() {
  return (
    <footer className="border-t border-border bg-background-paper">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-semibold text-foreground mb-3">Training Market</h3>
            <p className="text-sm text-foreground-muted">Malaysia's intelligent training marketplace connecting employers with the best training providers.</p>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-3 text-sm">For Employers</h4>
            <div className="space-y-2 text-sm text-foreground-muted">
              <Link href="/search" className="block hover:text-foreground">Browse Programs</Link>
              <Link href="/categories" className="block hover:text-foreground">Categories</Link>
              <Link href="/employer/broadcasts/new" className="block hover:text-foreground">Post Training Need</Link>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-3 text-sm">For Providers</h4>
            <div className="space-y-2 text-sm text-foreground-muted">
              <Link href="/register" className="block hover:text-foreground">List Your Programs</Link>
              <Link href="/provider/broadcasts" className="block hover:text-foreground">View Broadcast Requests</Link>
              <Link href="/faq" className="block hover:text-foreground">Provider Guide</Link>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-3 text-sm">Resources</h4>
            <div className="space-y-2 text-sm text-foreground-muted">
              <Link href="/faq" className="block hover:text-foreground">FAQ / Help Center</Link>
              <Link href="/testimonials" className="block hover:text-foreground">Success Stories</Link>
              <a href="#" className="block hover:text-foreground">Contact Us</a>
            </div>
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-border">
          <p className="text-sm text-foreground-muted">
            &copy; {new Date().getFullYear()} Training Market. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-foreground-muted">
            <a href="#" className="hover:text-foreground">About</a>
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
