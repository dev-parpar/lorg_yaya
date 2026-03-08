"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, Search, LogOut, Package } from "lucide-react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/auth/supabase-client";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";

export function Navbar() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Sign out failed");
      return;
    }
    router.push(ROUTES.LOGIN);
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Brand */}
          <Link href={ROUTES.LOCATIONS} className="flex items-center gap-2 font-semibold text-lg">
            <Package className="h-5 w-5 text-primary" />
            <span>Lorg Yaya</span>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            <Link
              href={ROUTES.LOCATIONS}
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "flex items-center gap-2")}
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Locations</span>
            </Link>
            <Link
              href={ROUTES.SEARCH}
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "flex items-center gap-2")}
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Search</span>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}
