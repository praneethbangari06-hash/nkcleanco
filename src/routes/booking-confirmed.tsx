import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarDays,
  Copy,
  Loader2,
  MapPin,
  Phone,
  PhoneCall,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

import { BookingChat } from "@/components/chat/BookingChat";
import { PageShell } from "@/components/site/PageShell";
import { fetchCustomerMessages, sendCustomerMessage } from "@/lib/chat.functions";
import { bookingTracking } from "@/lib/booking.functions";
import { Button } from "@/components/ui/button";
import {
  AREA_COORDS,
  BRAND,
  CONFIRMATION_KEY,
  haversineKm,
  inr,
  prettyDate,
  slotLabel,
  type ConfirmedBooking,
} from "@/lib/nkcleanco";

const title = "Booking Confirmed — NK CleanCo";
const description =
  "Your NK CleanCo cleaning is booked. Our team will call you within 30 minutes to confirm the slot and assign a verified cleaner.";

export const Route = createFileRoute("/booking-confirmed")({
  ssr: false,
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: ConfirmedPage,
});

function ConfirmedPage() {
  const [booking, setBooking] = useState<ConfirmedBooking | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CONFIRMATION_KEY);
      if (raw) setBooking(JSON.parse(raw) as ConfirmedBooking);
    } catch {
      setBooking(null);
    }
    setLoaded(true);
  }, []);

  const copyRef = async () => {
    if (!booking) return;
    try {
      await navigator.clipboard.writeText(booking.reference);
      toast.success("Booking reference copied");
    } catch {
      toast.error("Couldn't copy — please note it down");
    }
  };

  return (
    <PageShell>
      <section className="bg-gradient-hero">
        <div className="section-shell max-w-2xl py-16 text-center sm:py-24">
          <div className="animate-pop relative mx-auto flex h-24 w-24 items-center justify-center">
            <span className="animate-ripple absolute inset-0 rounded-full bg-mint/40" />
            <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-mint shadow-glow">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-10 w-10"
                aria-hidden
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path
                  d="M5 13l4.5 4.5L19 8"
                  stroke="var(--color-mint-foreground)"
                  strokeWidth={2.6}
                  strokeDasharray="60"
                  className="animate-draw"
                />
              </svg>
            </span>
          </div>

          <h1 className="animate-fade-up mt-8 text-3xl font-extrabold sm:text-4xl">
            Booking confirmed!
          </h1>
          <p className="animate-fade-up mx-auto mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
            Our team will contact you within 30 minutes to confirm your slot and assign a verified
            cleaner.
          </p>

          {loaded && booking && (
            <button
              type="button"
              onClick={copyRef}
              className="animate-fade-up mt-7 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-card px-5 py-3 shadow-card transition-smooth hover:-translate-y-0.5 hover:shadow-lifted"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Reference
              </span>
              <span className="font-display text-base font-extrabold tracking-wide text-primary">
                {booking.reference}
              </span>
              <Copy className="size-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </section>

      <section className="bg-background pb-20 pt-12">
        <div className="section-shell max-w-2xl">
          {loaded && booking ? (
            <>
            <TrackingCard reference={booking.reference} phone={booking.phone} />
            <div className="mt-5 rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
              <h2 className="text-lg font-bold">Booking summary</h2>
              <dl className="mt-5 divide-y divide-border overflow-hidden rounded-2xl border border-border">
                <Row icon={Sparkles} label="Service" value={booking.service_type} />
                <Row
                  icon={MapPin}
                  label="Address"
                  value={booking.address}
                  sub={`${booking.area}, Hyderabad`}
                />
                <Row
                  icon={CalendarDays}
                  label="Date & time"
                  value={prettyDate(booking.booking_date)}
                  sub={slotLabel(booking.time_slot)}
                />
                <Row
                  icon={Phone}
                  label="Contact"
                  value={booking.customer_name}
                  sub={`+91 ${booking.phone}`}
                />
              </dl>

              <div className="mt-5 flex items-center justify-between rounded-2xl bg-primary-soft px-5 py-4">
                <span className="text-sm font-semibold text-primary">Estimated price</span>
                <span className="font-display text-lg font-extrabold text-primary">
                  {inr(booking.price_min)} – {inr(booking.price_max)}
                </span>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild variant="hero" size="lg" className="flex-1">
                  <Link to="/book" search={{}}>
                    Book another service
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="flex-1">
                  <a href={`tel:${BRAND.phone.replace(/\s/g, "")}`}>
                    <PhoneCall className="size-4" />
                    Call us
                  </a>
                </Button>
              </div>
            </div>
            </>
          ) : (
            <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-card">
              <p className="text-sm text-muted-foreground">
                We don&apos;t have the details of this booking on this device anymore. If you just
                booked, our team will still call you shortly.
              </p>
              <Button asChild variant="hero" size="lg" className="mt-6">
                <Link to="/book" search={{}}>
                  Book a service
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex gap-3 bg-card px-4 py-3.5 text-left">
      <dt className="w-24 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 flex-1">
        <span className="flex items-start gap-1.5 text-sm font-semibold text-foreground">
          <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
          <span className="break-words">{value}</span>
        </span>
        {sub && <span className="mt-0.5 block text-xs font-medium text-muted-foreground">{sub}</span>}
      </dd>
    </div>
  );
}

interface TrackingState {
  status: string;
  area: string;
  customer_lat: number | null;
  customer_lng: number | null;
  booking_id: string;
  worker_name: string | null;
  worker_lat: number | null;
  worker_lng: number | null;
  location_updated_at: string | null;
  exhausted: boolean;
}

const LiveTrackingMap = lazy(() => import("@/components/tracking/LiveTrackingMap"));

const STALE_MS = 2 * 60 * 1000;

function statusLabel(status: string) {
  if (status === "arrived") return "Arrived at your address";
  if (status === "in_progress") return "Cleaning in progress";
  if (status === "completed") return "Service completed";
  return "On the way";
}

function TrackingCard({ reference, phone }: { reference: string; phone: string }) {
  const [state, setState] = useState<TrackingState | null>(null);
  const [roadKm, setRoadKm] = useState<number | null>(null);


  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const result = await bookingTracking({ data: { reference, phone } });
        if (!cancelled && result) setState(result as TrackingState);
      } catch {
        /* keep the last known state */
      }
    };
    void poll();
    const timer = setInterval(poll, 15_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [reference, phone]);

  if (!state) return null;

  const assigned = state.status !== "pending";
  const completed = state.status === "completed";
  const message = assigned
    ? state.worker_name
      ? `Cleaner assigned! ${state.worker_name} is on the way`
      : "Cleaner assigned! Your cleaner is on the way"
    : state.exhausted
      ? "All our cleaners are currently busy, we'll notify you shortly"
      : "Finding a cleaner near you…";

  // Exact geocoded address when we have it; area centre only as a fallback.
  const customer =
    state.customer_lat != null && state.customer_lng != null
      ? { lat: state.customer_lat, lng: state.customer_lng }
      : (AREA_COORDS[state.area] ?? null);
  const updatedAt = state.location_updated_at ? Date.parse(state.location_updated_at) : NaN;
  const fresh =
    state.worker_lat != null &&
    state.worker_lng != null &&
    !Number.isNaN(updatedAt) &&
    Date.now() - updatedAt < STALE_MS;
  const workerPoint = fresh ? { lat: state.worker_lat!, lng: state.worker_lng! } : null;
  const straight = workerPoint && customer ? haversineKm(customer, workerPoint) : null;
  const distance = roadKm ?? straight;


  if (completed) {
    return (
      <div className="rounded-3xl border border-mint/40 bg-mint/10 p-5 shadow-card">
        <div className="flex items-center gap-3">
          <UserCheck className="size-6 shrink-0 text-primary" />
          <p className="text-sm font-semibold text-foreground">Service completed</p>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {state.worker_name ? `${state.worker_name} has` : "Your cleaner has"} finished the job.
          Thank you for choosing NK CleanCo!
        </p>
      </div>
    );
  }

  return (
    <>
    <div
      className={`rounded-3xl border p-5 shadow-card ${
        assigned ? "border-mint/40 bg-mint/10" : "border-border bg-card"
      }`}
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        {assigned ? (
          <UserCheck className="size-6 shrink-0 text-primary" />
        ) : (
          <Loader2 className="size-6 shrink-0 animate-spin text-primary" />
        )}
        <p className="text-sm font-semibold text-foreground">{message}</p>
      </div>

      {assigned && customer && (
        <div className="mt-4">
          {workerPoint ? (
            <ClientOnly fallback={<MapSkeleton />}>
              <Suspense fallback={<MapSkeleton />}>
                <LiveTrackingMap
                  customer={customer}
                  worker={workerPoint}
                  onRouteDistance={setRoadKm}
                />

              </Suspense>
            </ClientOnly>
          ) : (
            <div className="flex h-[260px] items-center justify-center rounded-2xl border border-border bg-muted/40 text-sm font-medium text-muted-foreground sm:h-[300px]">
              <Loader2 className="mr-2 size-4 animate-spin" /> Cleaner location updating…
            </div>
          )}

          <dl className="mt-4 grid gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Cleaner</dt>
              <dd className="font-semibold">{state.worker_name ?? "Assigned"}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Distance away</dt>
              <dd className="font-semibold">
                {distance != null ? `${distance} km` : "Updating…"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-semibold text-primary">{statusLabel(state.status)}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>

    {assigned && (
      <div className="mt-5">
        <BookingChat
          bookingId={state.booking_id}
          sender="customer"
          locked={false}
          peerLabel={state.worker_name ?? "your cleaner"}
          onSend={(text) => sendCustomerMessage({ data: { reference, phone, text } })}
          fetchMessages={() => fetchCustomerMessages({ data: { reference, phone } })}
        />
      </div>
    )}
    </>
  );
}

function MapSkeleton() {
  return <div className="h-[260px] w-full animate-pulse rounded-2xl bg-muted sm:h-[300px]" />;
}

