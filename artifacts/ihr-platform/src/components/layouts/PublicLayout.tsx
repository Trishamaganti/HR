import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

export function PublicLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [location] = useLocation();

  const isDark = location === "/" || location === "/features";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className={`sticky top-0 z-50 w-full border-b backdrop-blur supports-[backdrop-filter]:bg-background/60 ${isDark ? 'border-border/40' : 'border-border'}`}>
        <div className="container mx-auto px-4 md:px-6 flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow">
              <Zap className="w-4 h-4 fill-white text-white" />
            </div>
            iHR
          </Link>
          
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/features" className="transition-colors hover:text-primary">Features</Link>
            <Link href="/pricing" className="transition-colors hover:text-primary">Pricing</Link>
            <Link href="/jobs" className="transition-colors hover:text-primary">Job Board</Link>
          </nav>

          <div className="flex items-center gap-4">
            {user ? (
              <Link href={
                user.role === 'super_admin' ? '/admin' :
                ['hr', 'manager', 'admin'].includes(user.role) ? '/hr/dashboard' :
                user.role === 'employee' ? '/employee/dashboard' :
                '/candidate/dashboard'
              }>
                <Button variant="outline" className="font-semibold">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/login" className="hidden sm:inline-block">
                  <Button variant="ghost">Log In</Button>
                </Link>
                <Link href="/signup">
                  <Button>Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t py-12 bg-muted/40">
        <div className="container mx-auto px-4 md:px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 font-bold text-lg mb-4 text-primary">
              <div className="w-6 h-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center shadow">
                <Zap className="w-3 h-3 fill-white text-white" />
              </div>
              iHR
            </div>
            <p className="text-sm text-muted-foreground">
              The precise, powerful HR platform for ambitious companies.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/features">Features</Link></li>
              <li><Link href="/pricing">Pricing</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/jobs">Job Board</Link></li>
              <li><Link href="#">Documentation</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="#">About</Link></li>
              <li><Link href="#">Contact</Link></li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 md:px-6 mt-12 pt-8 border-t text-sm text-muted-foreground flex flex-col md:flex-row items-center justify-between">
          <p>© {new Date().getFullYear()} iHR Platform. All rights reserved.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <Link href="#">Terms</Link>
            <Link href="#">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
