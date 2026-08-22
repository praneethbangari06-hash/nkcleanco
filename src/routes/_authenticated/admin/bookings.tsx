import { createFileRoute } from "@tanstack/react-router";

import { BookingsTable } from "@/components/admin/BookingsTable";

export const Route = createFileRoute("/_authenticated/admin/bookings")({
  head: () => ({ meta: [{ title: "Bookings — NK CleanCo Admin" }] }),
  component: BookingsPage,
});

function BookingsPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-extrabold sm:text-3xl">Bookings</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Search, filter by area or date, and move each job through its status.
      </p>
      <div className="mt-7">
        <BookingsTable />
      </div>
    </div>
  );
}
