import { GraduationCap, IndianRupee, Leaf, ShieldCheck, Timer } from "lucide-react";

const REASONS = [
  {
    icon: GraduationCap,
    title: "Trained staff",
    copy: "Every cleaner completes a 5-day hands-on training program before their first job.",
  },
  {
    icon: Timer,
    title: "On-time guarantee",
    copy: "We arrive inside your chosen slot — or your next cleaning gets 20% off.",
  },
  {
    icon: IndianRupee,
    title: "Affordable pricing",
    copy: "Flat, published starting rates. No hidden travel or equipment charges.",
  },
  {
    icon: Leaf,
    title: "Eco-friendly products",
    copy: "Child- and pet-safe, biodegradable solutions on every surface we touch.",
  },
];

export function WhyUs() {
  return (
    <section className="bg-background py-16 sm:py-24">
      <div className="section-shell grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Why NK CleanCo</p>
          <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">
            A cleaning service you can actually rely on
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            We&apos;re a local team, not a marketplace. The same trusted faces return to your home,
            and one number reaches a real person.
          </p>
          <div className="mt-8 inline-flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-mint-soft text-mint">
              <ShieldCheck className="size-5" />
            </span>
            <p className="text-sm font-semibold text-foreground">
              Police-verified staff
              <span className="block text-xs font-medium text-muted-foreground">
                ID checked &amp; insured for in-home work
              </span>
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {REASONS.map(({ icon: Icon, title, copy }) => (
            <div
              key={title}
              className="rounded-3xl border border-border bg-card p-6 shadow-card transition-smooth hover:-translate-y-1 hover:shadow-lifted"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 text-base font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
