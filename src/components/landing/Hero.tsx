import { Link } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, CalendarClock, MapPin, Star, Users } from "lucide-react";

import heroImage from "@/assets/hero-cleaning.jpg";
import { Button } from "@/components/ui/button";
import { SERVICE_AREAS } from "@/lib/nkcleanco";

const TRUST = [
  { icon: BadgeCheck, label: "Verified Cleaners" },
  { icon: Users, label: "10+ Trained Staff" },
  { icon: CalendarClock, label: "Same Day Service" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-hero">
      <div
        aria-hidden
        className="animate-float pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary-glow/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-mint/15 blur-3xl"
      />

      <div className="section-shell relative grid items-center gap-12 py-14 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-24">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/80 px-3.5 py-1.5 text-xs font-semibold text-primary shadow-soft">
            <span className="relative flex h-2 w-2">
              <span className="animate-ripple absolute inline-flex h-2 w-2 rounded-full bg-mint" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-mint" />
            </span>
            Now serving west Hyderabad
          </span>

          <h1 className="mt-5 text-[2.1rem] font-extrabold leading-[1.08] sm:text-5xl lg:text-[3.4rem]">
            Professional home cleaning at your doorstep
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Trained, background-verified cleaners with eco-friendly products. Book in under 60
            seconds and we&apos;ll confirm your slot with a call within 30 minutes.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild variant="hero" size="xl" className="w-full sm:w-auto">
              <Link to="/book">
                Book now
                <ArrowRight className="size-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="xl" className="w-full sm:w-auto">
              <Link to="/services">View services &amp; prices</Link>
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap gap-2.5">
            {SERVICE_AREAS.map((area) => (
              <span
                key={area}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-sm font-semibold text-foreground shadow-soft transition-smooth hover:-translate-y-0.5 hover:border-primary hover:text-primary"
              >
                <MapPin className="size-3.5 text-primary" />
                {area}
              </span>
            ))}
          </div>

          <dl className="mt-9 grid max-w-lg grid-cols-3 gap-3">
            {TRUST.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="rounded-2xl border border-border bg-card/70 p-3.5 text-center shadow-soft"
              >
                <Icon className="mx-auto size-5 text-primary" />
                <dt className="mt-2 text-xs font-semibold leading-snug text-foreground">{label}</dt>
              </div>
            ))}
          </dl>
        </div>

        <div className="animate-fade-up relative [animation-delay:120ms]">
          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-lifted">
            <img
              src={heroImage}
              alt="NK CleanCo professional cleaning a bright living room in Hyderabad"
              width={1408}
              height={1200}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="absolute -bottom-5 left-4 flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-lifted sm:left-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-mint-soft">
              <Star className="size-5 fill-mint text-mint" />
            </div>
            <div>
              <p className="font-display text-base font-bold leading-none text-ink">4.8 / 5</p>
              <p className="mt-1 text-xs text-muted-foreground">620+ homes cleaned</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
