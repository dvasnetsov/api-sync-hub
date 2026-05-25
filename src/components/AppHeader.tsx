import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { useAuth, signOut } from "@/lib/use-auth";
import { getMe } from "@/lib/auth.functions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, ShieldCheck } from "lucide-react";

export function AppHeader() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { user } = useAuth();
  const nav = useNavigate();
  const me = useServerFn(getMe);
  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: () => me(),
    enabled: !!user,
  });

  const link = (to: string, label: string, active: boolean) => (
    <Link
      to={to}
      className={`text-sm transition-colors ${
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );

  const initial = (meData?.displayName ?? user?.email ?? "y").slice(0, 1).toUpperCase();
  const label = meData?.displayName ?? user?.email ?? "you";

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Logo to="/projects" />
          <nav className="hidden items-center gap-6 md:flex">
            {link("/projects", "Projects", path.startsWith("/projects"))}
            {link("/docs", "Docs", path.startsWith("/docs"))}
            {meData?.isAdmin && link("/admin/users", "Users", path.startsWith("/admin"))}
          </nav>
        </div>
        <div className="flex items-center gap-2">

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm hover:bg-muted/60 transition-colors">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-foreground text-[10px] font-semibold text-background uppercase tracking-wide">
                  {initial}
                </span>
                <span className="hidden text-sm text-muted-foreground sm:inline">{label}</span>
                {meData?.isAdmin && <ShieldCheck className="h-3.5 w-3.5 text-foreground/60" />}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {meData?.isAdmin && (
                <DropdownMenuItem onClick={() => nav({ to: "/admin/users" })}>
                  <ShieldCheck className="mr-2 h-4 w-4" /> Users
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  await signOut();
                  nav({ to: "/login" });
                }}
              >
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
