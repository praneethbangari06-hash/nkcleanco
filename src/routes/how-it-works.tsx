import { createFileRoute } from "@tanstack/react-router";

import { CtaBand } from "@/components/landing/CtaBand";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Testimonials } from "@/components/landing/Testimonials";
import { PageHeading, PageShell } from "@/components/site/PageShell";

const title = "How NK CleanCo Works — Book, Assign, Clean, Rate";
const description =
  "See how an NK CleanCo booking works: pick a service and slot, we assign a verified cleaner, confirm by phone in 30 minutes, and clean on time.;

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: HowItWorksPage,
});

function HowItWorksPage() {
  return (
    <PageShell>
      <PageHeading
        eyebrow="Process"
        title="From booking to spotless, in four steps"
        subtitle="No app to install, no advance payment. One short confirmation call and our team handles the rest."
      />
      <HowItWorks />
      <Testimonials />
      <CtaBand />
    </PageShell>
  );
}
