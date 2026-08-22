import { Link } from "@tanstack/react-router";
import { Menu, Phone, Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/nkcleanco";

const NAV = [
  { label: "Services", to: "/services" },
  { label: "How it works", to: "/how-it-works" },
  { label: "Areas", to: "/service-areas" },
];

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
        <Sparkles className="size-4 text-primary-foreground" strokeWidth={2.4} />
      </span>
      {!compact && (
        <span className="font-display text-lg font-bold tracking-tight text-ink">
          Clean<span className="text-primary">Connect</span>
        </span>
      )}
    </span>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);

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
            className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-foreground transition-smooth hover:text-primary sm:flex"
          >
            <Phone className="size-4 text-primary" />
            {BRAND.phone}
          </a>
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
          </nav>
        </div>
      )}
    </header>
  );
}
