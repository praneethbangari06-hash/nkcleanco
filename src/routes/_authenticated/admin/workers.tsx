import { createFileRoute } from "@tanstack/react-router";
import { HardHat } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/workers")({
  head: () => ({ meta: [{ title: "Workers — CleanConnect Admin" }] }),
  component: WorkersPage,
});

function WorkersPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-extrabold sm:text-3xl">Workers</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Staff roster, attendance and job assignment.
      </p>

      <div className="mt-8 rounded-3xl border border-dashed border-primary/30 bg-card p-10 text-center shadow-card">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <HardHat className="size-6" />
        </span>
        <h2 className="mt-5 text-xl font-bold">Coming soon</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          You&apos;ll be able to add cleaners, track their availability and assign them to bookings
          directly from this page.
        </p>
      </div>
    </div>
  );
}
