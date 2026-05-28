"use client";

import { Link, usePathname } from "@/i18n/navigation";

type Item = { href: string; label: string };

export default function AdminSidebar({ items, brand }: { items: Item[]; brand: string }) {
  const pathname = usePathname();
  return (
    <aside className="w-60 shrink-0 border-r border-border bg-card flex flex-col">
      <div className="px-5 py-4 border-b border-border font-semibold">{brand}</div>
      <nav className="flex-1 px-2 py-4 space-y-1 text-sm">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 rounded-md transition-colors ${
                active
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-foreground/80 hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
