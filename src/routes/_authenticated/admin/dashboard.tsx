import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, CheckCircle2, Clock, IndianRupee } from "lucide-react";

import { BookingsTable } from "@/components/admin/BookingsTable";
import { Button } from "@/components/ui/button";
import { midpointRevenue, useBookings } from "@/lib/admin";
import { inr, todayIso } from "@/lib/cleanconnect";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — CleanConnect Admin" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data } = useBookings();
  const bookings = data ?? [];
  const today = todayIso();

  const todays = bookings.filter((b) => b.booking_date === today);
  const pending = bookings.filter((b) => b.status === "pending");
  const completed = bookings.filter((b) => b.status === "completed");
  const revenue = bookings
    .filter((b) => b.status !== "cancelled")
    .reduce((sum, b) => sum + midpointRevenue(b), 0);

  const stats = [
    {
      label: "Bookings today",
      value: String(todays.length),
      icon: CalendarDays,
      hint: `${bookings.length} total all-time`,
    },
    {
      label: "Pending",
      value: String(pending.length),
      icon: Clock,
      hint: "Awaiting cleaner assignment",
    },
    {
      label: "Completed",
      value: String(completed.length),
      icon: CheckCircle2,
      hint: "Jobs closed out",
    },
    {
      label: "Revenue estimate",
      value: inr(revenue),
      icon: IndianRupee,
      hint: "Mid-point of quoted ranges",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Dashboard</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Live view of bookings coming in from the website.
          </p>
        </div>
        <Button asChild variant="soft" size="sm">
          <Link to="/admin/bookings">
            All bookings
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, hint }) => (
          <div
            key={label}
            className="rounded-3xl border border-border bg-card p-5 shadow-card transition-smooth hover:-translate-y-1 hover:shadow-lifted"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Icon className="size-4" />
              </span>
            </div>
            <p className="font-display mt-3 text-2xl font-extrabold text-ink">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-lg font-bold">Latest bookings</h2>
      <div className="mt-4">
        <BookingsTable limit={8} />
      </div>
    </div>
  );
}
