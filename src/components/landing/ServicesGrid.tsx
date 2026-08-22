import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Bath,
  Building2,
  Clock,
  CookingPot,
  Home,
  Sofa,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { SERVICES, inr, type ServiceId } from "@/lib/nkcleanco";

const ICONS: Record<ServiceId, LucideIcon> = {
  home: Home,
  deep: Sparkles,
  bathroom: Bath,
  kitchen: CookingPot,
  sofa: Sofa,
  office: Building2,
};

export function ServicesGrid({ heading = true }: { heading?: boolean }) {
  return (
    <section className="bg-surface py-16 sm:py-24">
      <div className="section-shell">
        {heading && (
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Services</p>
              <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">
                Transparent pricing, no surprises
              </h2>
              <p className="mt-3 text-base text-muted-foreground">
                Final quote is confirmed on the call based on home size and condition.
              </p>
            </div>
          </div>
        )}

        <div className={`grid gap-5 ${heading ? "mt-12" : ""} sm:grid-cols-2 lg:grid-cols-3`}>
          {SERVICES.map((service) => {
            const Icon = ICONS[service.id];
            return (
              <Link
                key={service.id}
                to="/book"
                search={{ service: service.id }}
                className="group flex flex-col rounded-3xl border border-border bg-card p-6 shadow-card transition-smooth hover:-translate-y-1 hover:border-primary/40 hover:shadow-lifted"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary transition-smooth group-hover:bg-gradient-primary group-hover:text-primary-foreground">
                    <Icon className="size-5" />
                  </span>
                  <ArrowUpRight className="size-5 text-muted-foreground opacity-0 transition-smooth group-hover:translate-x-0.5 group-hover:opacity-100" />
                </div>

                <h3 className="mt-5 text-lg font-bold">{service.name}</h3>
                <p className="mt-1 text-sm font-semibold text-primary">{service.blurb}</p>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {service.detail}
                </p>

                <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                  <span className="font-display text-base font-bold text-ink">
                    from {inr(service.from)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Clock className="size-3.5" />
                    {service.duration}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
