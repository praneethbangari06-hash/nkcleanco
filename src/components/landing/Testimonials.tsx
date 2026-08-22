import { Quote, Star } from "lucide-react";

const REVIEWS = [
  {
    name: "Sneha Reddy",
    area: "Kokapet",
    service: "Home Deep Cleaning",
    quote:
      "Two cleaners turned up right at 9 AM with their own machines. My 3BHK looked brand new by evening — the kitchen chimney area especially.",
  },
  {
    name: "Arun Kumar",
    area: "Narsingi",
    service: "Bathroom Cleaning",
    quote:
      "Hard water stains I'd given up on are gone. Booked at night, got a confirmation call in 20 minutes, service the next morning.",
  },
  {
    name: "Priya Menon",
    area: "Kanapur",
    service: "Sofa & Carpet Cleaning",
    quote:
      "Polite, careful with the furniture, and no strong chemical smell afterwards — important with a toddler at home. Booking again monthly.",
  },
];

export function Testimonials() {
  return (
    <section className="bg-surface py-16 sm:py-24">
      <div className="section-shell">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Reviews</p>
          <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">Loved by neighbours nearby</h2>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {REVIEWS.map((review) => (
            <figure
              key={review.name}
              className="flex flex-col rounded-3xl border border-border bg-card p-6 shadow-card transition-smooth hover:-translate-y-1 hover:shadow-lifted"
            >
              <Quote className="size-7 text-primary-soft" />
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-foreground">
                {review.quote}
              </blockquote>
              <div className="mt-5 flex items-center gap-0.5" aria-label="Rated 5 out of 5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-4 fill-warning text-warning" />
                ))}
              </div>
              <figcaption className="mt-4 border-t border-border pt-4">
                <p className="text-sm font-bold text-ink">{review.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {review.area} · {review.service}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
