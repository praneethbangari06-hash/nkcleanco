import { CalendarCheck, ClipboardCheck, Sparkles, Star } from "lucide-react";

const STEPS = [
  {
    icon: CalendarCheck,
    title: "Book in 60 seconds",
    copy: "Pick a service, your area and a time slot that suits you.",
  },
  {
    icon: ClipboardCheck,
    title: "We assign a cleaner",
    copy: "A verified professional is allotted and we confirm by phone within 30 minutes.",
  },
  {
    icon: Sparkles,
    title: "Cleaning done",
    copy: "Our team arrives on time with equipment and eco-friendly supplies.",
  },
  {
    icon: Star,
    title: "Rate us",
    copy: "Share feedback so we keep improving. Not happy? We re-clean free.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-background py-16 sm:py-24">
      <div className="section-shell">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">How it works</p>
          <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">
            Four simple steps to a spotless home
          </h2>
        </div>

        <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, copy }, index) => (
            <li
              key={title}
              className="group relative rounded-3xl border border-border bg-card p-6 shadow-card transition-smooth hover:-translate-y-1 hover:border-primary/40 hover:shadow-lifted"
            >
              <span className="font-display absolute right-5 top-4 text-4xl font-extrabold text-primary-soft transition-smooth group-hover:text-accent">
                {index + 1}
              </span>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
                <Icon className="size-5 text-primary-foreground" />
              </span>
              <h3 className="mt-5 text-lg font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
