import { createFileRoute } from "@tanstack/react-router";

import { CtaBand } from "@/components/landing/CtaBand";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ServicesGrid } from "@/components/landing/ServicesGrid";
import { Testimonials } from "@/components/landing/Testimonials";
import { WhyUs } from "@/components/landing/WhyUs";
import { PageShell } from "@/components/site/PageShell";

const title = "NK CleanCo — Professional Home Cleaning in Narsingi, Kokapet, Kanapur";
const description =
  "Book trusted, verified home cleaning services in Narsingi, Kokapet, and Kanapur with NK CleanCo. Fast booking, professional cleaners, on-time service.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <PageShell>
      <Hero />
      <HowItWorks />
      <ServicesGrid />
      <WhyUs />
      <Testimonials />
      <CtaBand />
    </PageShell>
  );
}
