import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Clock, MapPin } from "lucide-react";

import { CtaBand } from "@/components/landing/CtaBand";
import { PageHeading, PageShell } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";
import { SERVICE_AREAS } from "@/lib/cleanconnect";

const title = "Service Areas — Narsingi, Kokapet & Kanapur | CleanConnect";
const description =
  "CleanConnect serves Narsingi, Kokapet and Kanapur in west Hyderabad with same-day home cleaning slots. Expanding to Manikonda and Gandipet soon.";

const AREA_DETAIL: Record<string, { blurb: string; landmarks: string }> = {
  Narsingi: {
    blurb: "Our busiest area — cleaners are usually 15 minutes away.",
    landmarks: "Aparna Sarovar, My Home Avatar, Alkapoor, ORR Exit 19",
  },
  Kokapet: {
    blurb: "High-rise specialists with lift-friendly equipment.",
    landmarks: "Neopolis, Sri Aditya Athena, Rajapushpa, Vasavi Signature",
  },
  Kanapur: {
    blurb: "Independent homes and villas, morning slots recommended.",
    landmarks: "Kanapur main road, nearby gated villa communities",
  },
};

export const Route = createFileRoute("/service-areas")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: AreasPage,
});

function AreasPage() {
  return (
    <PageShell>
      <PageHeading
        eyebrow="Coverage"
        title="Where we clean in Hyderabad"
        subtitle="We stay deliberately local so our teams arrive on time and the same trusted faces return to your home."
      />

      <section className="bg-background py-16 sm:py-24">
        <div className="section-shell grid gap-5 md:grid-cols-3">
          {SERVICE_AREAS.map((area) => {
            const detail = AREA_DETAIL[area]!;
            return (
              <article
                key={area}
                className="flex flex-col rounded-3xl border border-border bg-card p-6 shadow-card transition-smooth hover:-translate-y-1 hover:shadow-lifted"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
                  <MapPin className="size-5 text-primary-foreground" />
                </span>
                <h2 className="mt-5 text-xl font-bold">{area}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{detail.blurb}</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Covered nearby
                </p>
                <p className="mt-1 flex-1 text-sm text-foreground">{detail.landmarks}</p>
                <p className="mt-5 inline-flex items-center gap-1.5 border-t border-border pt-4 text-xs font-semibold text-mint">
                  <Clock className="size-3.5" />
                  Same-day slots available
                </p>
              </article>
            );
          })}
        </div>

        <div className="section-shell mt-10">
          <div className="rounded-3xl border border-border bg-surface p-6 text-center sm:p-10">
            <h2 className="text-xl font-bold sm:text-2xl">Not in one of these areas?</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              We currently serve Narsingi, Kokapet and Kanapur — expanding soon! Start a booking and
              tell us where you are, and we&apos;ll reach out the moment we open up your locality.
            </p>
            <Button asChild variant="hero" size="lg" className="mt-6">
              <Link to="/book">
                Start a booking
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <CtaBand />
    </PageShell>
  );
}
