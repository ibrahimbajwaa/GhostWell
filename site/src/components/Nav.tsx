"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Map" },
  { href: "/insights", label: "Insights" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/lookup", label: "Landowners" },
  { href: "/methodology", label: "Methodology" },
];

export default function Nav() {
  const path = usePathname();
  const active = (href: string) =>
    href === "/" ? path === "/" : path.startsWith(href) || (href === "/watchlist" && path.startsWith("/companies"));
  return (
    <header className="sticky top-0 z-[1100] border-b border-line bg-bg/90 backdrop-blur">
      <nav className="mx-auto flex h-14 items-center gap-6 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-50" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
          </span>
          <span className="text-[17px] font-semibold tracking-tight">Ghostwell</span>
        </Link>
        <div className="-mx-1 flex min-w-0 gap-1 overflow-x-auto text-sm">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`shrink-0 rounded-md px-2.5 py-1.5 transition ${
                active(l.href) ? "bg-white/10 text-ink" : "text-ink-2 hover:text-ink"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
