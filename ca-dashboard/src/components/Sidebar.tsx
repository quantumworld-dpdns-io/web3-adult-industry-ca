"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShieldCheck,
  Fingerprint,
  Webhook,
  BarChart3,
  Users,
  Shield,
  LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/credentials", label: "Credentials", icon: ShieldCheck },
  { href: "/dids", label: "DIDs", icon: Fingerprint },
  { href: "/webhooks", label: "Webhooks", icon: Webhook },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/reputation", label: "Reputation", icon: Shield },
  { href: "/admin", label: "Admin", icon: Users },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card">
      <div className="flex h-14 items-center border-b border-border px-6">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <span className="ml-3 text-lg font-semibold">CA Dashboard</span>
      </div>
      <nav className="space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
