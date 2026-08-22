import { Link } from "@tanstack/react-router";
import { ArrowRight, PhoneCall } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/cleanconnect";

export function CtaBand() {
  return (
    <section className="bg-background pb-16 sm:pb-24">
      <div className="section-shell">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-primary px-6 py-12 shadow-glow sm:px-12 sm:py-16">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary-foreground/10 blur-2xl"
          />
          <div className="relative mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold text-primary-foreground sm:text-4xl">
              Free your weekend. We&apos;ll handle the cleaning.
            </h2>
            <p className="mt-4 text-base text-primary-foreground/85">
              Same-day slots available in Narsingi, Kokapet and Kanapur.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="xl" variant="secondary" className="w-full sm:w-auto">
                <Link to="/book">
                  Book a cleaning
                  <ArrowRight className="size-5" />
                </Link>
              </Button>
              <Button
                asChild
                size="xl"
                variant="ghost"
                className="w-full text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground sm:w-auto"
              >
                <a href={`tel:${BRAND.phone.replace(/\s/g, "")}`}>
                  <PhoneCall className="size-5" />
                  {BRAND.phone}
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
