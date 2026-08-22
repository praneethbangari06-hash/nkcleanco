import { createFileRoute } from "@tanstack/react-router";

import { BookingWizard } from "@/components/booking/BookingWizard";
import { PageShell } from "@/components/site/PageShell";

const title = "Book a Cleaning — CleanConnect Hyderabad";
const description =
  "Book home, deep, bathroom, kitchen, sofa or office cleaning in Narsingi, Kokapet or Kanapur in under a minute. Confirmation call within 30 minutes.";

export const Route = createFileRoute("/book")({
  validateSearch: (search: Record<string, unknown>): { service?: string } =>
    typeof search["service"] === "string" ? { service: search["service"] } : {},
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: BookPage,
});

function BookPage() {
  const { service } = Route.useSearch();

  return (
    <PageShell>
      <div className="bg-gradient-hero border-b border-border">
        <div className="section-shell animate-fade-up max-w-3xl py-10 text-center sm:py-14">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Booking</p>
          <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">Book your cleaning</h1>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Takes about a minute. No payment now — pay after the job is done.
          </p>
        </div>
      </div>
      <BookingWizard initialService={service} />
    </PageShell>
  );
}
