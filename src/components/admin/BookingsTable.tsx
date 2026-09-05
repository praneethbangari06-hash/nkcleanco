import { CalendarX2, Loader2, Phone, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { STATUS_META, useBookings, useUpdateBookingStatus, type BookingStatus } from "@/lib/admin";
import { SERVICE_AREAS, inr, prettyDate, slotLabel } from "@/lib/nkcleanco";

const STATUSES: BookingStatus[] = ["pending", "assigned", "completed", "cancelled"];

export function StatusPill({ status }: { status: BookingStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

export function BookingsTable({ limit }: { limit?: number | undefined }) {
  const { data, isLoading, isError } = useBookings();
  const updateStatus = useUpdateBookingStatus();
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("");

  const rows = useMemo(() => {
    const all = data ?? [];
    const needle = query.trim().toLowerCase();
    const filtered = all.filter((booking) => {
      if (area && booking.area !== area) return false;
      if (date && booking.booking_date !== date) return false;
      if (status && booking.status !== status) return false;
      if (!needle) return true;
      return (
        booking.customer_name.toLowerCase().includes(needle) ||
        booking.phone.includes(needle) ||
        booking.reference.toLowerCase().includes(needle) ||
        booking.service_type.toLowerCase().includes(needle)
      );
    });
    return limit ? filtered.slice(0, limit) : filtered;
  }, [data, query, area, date, status, limit]);

  const selectClass =
    "h-11 rounded-lg border border-input bg-card px-3 text-sm font-medium text-foreground shadow-soft transition-smooth focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40";

  return (
    <div className="rounded-3xl border border-border bg-card shadow-card">
      {!limit && (
        <div className="grid gap-3 border-b border-border p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, phone, ref"
              className="h-11 pl-9"
              aria-label="Search bookings"
            />
          </div>
          <select
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className={selectClass}
            aria-label="Filter by area"
          >
            <option value="">All areas</option>
            {SERVICE_AREAS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={selectClass}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {STATUSES.map((item) => (
              <option key={item} value={item}>
                {STATUS_META[item].label}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={selectClass}
            aria-label="Filter by date"
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 p-14 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading bookings…
        </div>
      ) : isError ? (
        <p className="p-14 text-center text-sm font-semibold text-destructive">
          Couldn&apos;t load bookings. Refresh to try again.
        </p>
      ) : rows.length === 0 ? (
        <div className="p-14 text-center">
          <CalendarX2 className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold text-foreground">No bookings found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            New bookings from the website appear here instantly.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-bold">Customer</th>
                  <th className="px-4 py-3 font-bold">Phone</th>
                  <th className="px-4 py-3 font-bold">Area</th>
                  <th className="px-4 py-3 font-bold">Service</th>
                  <th className="px-4 py-3 font-bold">Date / time</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Update</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((booking) => (
                  <tr
                    key={booking.id}
                    className="border-b border-border/70 transition-smooth last:border-0 hover:bg-surface"
                  >
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-ink">{booking.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{booking.reference}</p>
                      <BookingPhotoBadge booking={booking} />
                    </td>
                    <td className="px-4 py-3.5">
                      <a
                        href={`tel:+91${booking.phone}`}
                        className="font-medium text-primary transition-smooth hover:underline"
                      >
                        +91 {booking.phone}
                      </a>
                    </td>
                    <td className="px-4 py-3.5">{booking.area}</td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium">{booking.service_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {inr(booking.price_min)} – {inr(booking.price_max)}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium">{prettyDate(booking.booking_date)}</p>
                      <p className="text-xs text-muted-foreground">{slotLabel(booking.time_slot)}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusPill status={booking.status} />
                    </td>
                    <td className="px-4 py-3.5">
                      <select
                        value={booking.status}
                        disabled={updateStatus.isPending}
                        onChange={(e) =>
                          updateStatus.mutate({
                            id: booking.id,
                            status: e.target.value as BookingStatus,
                          })
                        }
                        aria-label={`Update status for ${booking.customer_name}`}
                        className="h-9 rounded-lg border border-input bg-card px-2 text-xs font-semibold transition-smooth focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
                      >
                        {STATUSES.map((item) => (
                          <option key={item} value={item}>
                            {STATUS_META[item].label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="divide-y divide-border lg:hidden">
            {rows.map((booking) => (
              <li key={booking.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-ink">{booking.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{booking.reference}</p>
                    <BookingPhotoBadge booking={booking} />
                  </div>
                  <StatusPill status={booking.status} />
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Service</dt>
                    <dd className="font-semibold text-foreground">{booking.service_type}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Area</dt>
                    <dd className="font-semibold text-foreground">{booking.area}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Date</dt>
                    <dd className="font-semibold text-foreground">
                      {prettyDate(booking.booking_date)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Slot</dt>
                    <dd className="font-semibold text-foreground">{slotLabel(booking.time_slot)}</dd>
                  </div>
                </dl>

                <div className="mt-4 flex items-center gap-2">
                  <a
                    href={`tel:+91${booking.phone}`}
                    className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-primary-soft text-xs font-bold text-primary transition-smooth active:scale-95"
                  >
                    <Phone className="size-3.5" />
                    +91 {booking.phone}
                  </a>
                  <select
                    value={booking.status}
                    disabled={updateStatus.isPending}
                    onChange={(e) =>
                      updateStatus.mutate({
                        id: booking.id,
                        status: e.target.value as BookingStatus,
                      })
                    }
                    aria-label={`Update status for ${booking.customer_name}`}
                    className="h-10 flex-1 rounded-full border border-input bg-card px-3 text-xs font-bold text-foreground transition-smooth focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
                  >
                    {STATUSES.map((item) => (
                      <option key={item} value={item}>
                        {STATUS_META[item].label}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
