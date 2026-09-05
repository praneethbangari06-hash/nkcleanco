import { Link } from "@tanstack/react-router";
import { ChevronDown, Menu, Phone, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/nkcleanco";

const NAV = [
  { label: "Services", to: "/services" },
  { label: "How it works", to: "/how-it-works" },
  { label: "Areas", to: "/service-areas" },
];

const LOGINS = [
  { label: "Staff login", to: "/worker/login" },
  { label: "Admin login", to: "/admin/login" },
];


export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
        <Sparkles className="size-4 text-primary-foreground" strokeWidth={2.4} />
      </span>
      {!compact && (
        <span className="font-display text-lg font-bold tracking-tight text-ink">
          NK <span className="text-primary">CleanCo</span>
        </span>
      )}
    </span>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const loginRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!loginOpen) return;
    const onDown = (event: MouseEvent) => {
      if (!loginRef.current?.contains(event.target as Node)) setLoginOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [loginOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="section-shell flex h-16 items-center justify-between gap-4">
        <Link to="/" className="transition-smooth hover:opacity-80" aria-label={BRAND.name}>
          <BrandMark />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-smooth hover:bg-primary-soft hover:text-primary"
              activeProps={{ className: "bg-primary-soft text-primary" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={`tel:${BRAND.phone.replace(/\s/g, "")}`}
            className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-foreground transition-smooth hover:text-primary lg:flex"
          >
            <Phone className="size-4 text-primary" />
            {BRAND.phone}
          </a>

          <div ref={loginRef} className="relative hidden md:block">
            <button
              type="button"
              onClick={() => setLoginOpen((v) => !v)}
              aria-expanded={loginOpen}
              aria-haspopup="menu"
              className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-smooth hover:text-primary"
            >
              Login
              <ChevronDown className={`size-3.5 transition-smooth ${loginOpen ? "rotate-180" : ""}`} />
            </button>
            {loginOpen && (
              <div
                role="menu"
                className="animate-fade-in absolute right-0 top-full z-50 mt-2 w-40 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lifted"
              >
                {LOGINS.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    role="menuitem"
                    onClick={() => setLoginOpen(false)}
                    className="block px-3.5 py-2 text-xs font-semibold text-muted-foreground transition-smooth hover:bg-primary-soft hover:text-primary"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Button asChild variant="hero" size="sm" className="h-10 px-5">
            <Link to="/book">Book now</Link>
          </Button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
            className="flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-smooth hover:bg-primary-soft md:hidden"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </div>

      {open && (
        <div className="animate-fade-in border-t border-border bg-card md:hidden">
          <nav className="section-shell flex flex-col py-2">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-sm font-medium text-foreground transition-smooth hover:bg-primary-soft hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
            <a
              href={`tel:${BRAND.phone.replace(/\s/g, "")}`}
              className="rounded-xl px-3 py-3 text-sm font-medium text-foreground"
            >
              Call {BRAND.phone}
            </a>
            <span className="mt-1 border-t border-border px-3 pt-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Team access
            </span>
            {LOGINS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2.5 text-xs font-semibold text-muted-foreground transition-smooth hover:bg-primary-soft hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );

    </header>
  );
}
