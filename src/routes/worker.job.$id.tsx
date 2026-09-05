import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClientOnly, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  PhoneCall,
  Play,
  User,
} from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

import { BookingChat } from "@/components/chat/BookingChat";
import { CompletionPhotos } from "@/components/worker/CompletionPhotos";
import { WorkerShell } from "@/components/worker/WorkerShell";
import { fetchWorkerMessages, sendWorkerMessage } from "@/lib/chat.functions";
import { Button } from "@/components/ui/button";
import { completeJobWithPhotos } from "@/lib/job-photos.functions";
import { AREA_COORDS, getService, haversineKm, prettyDate, slotLabel } from "@/lib/nkcleanco";
import { JOB_STAGES, NEXT_ACTION, requestGeolocation, useWorkerToken } from "@/lib/worker-client";
import { advanceJobStatus, updateWorkerLocation, workerJob } from "@/lib/worker.functions";

const LiveTrackingMap = lazy(() => import("@/components/tracking/LiveTrackingMap"));

export const Route = createFileRoute("/worker/job/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Active Job — NK CleanCo Worker" },
      { name: "description", content: "Job details and status updates for NK CleanCo cleaners." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorkerJobPage,
});

const ACTION_ICON = {
  arrived: MapPin,
  in_progress: Play,
  completed: Check,
} as const;

function WorkerJobPage() {
  const { id } = Route.useParams();
  const token = useWorkerToken();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null);
  const [roadKm, setRoadKm] = useState<number | null>(null);
  const [beforePhoto, setBeforePhoto] = useState<string | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<string | null>(null);

  // Read this device's GPS every 15s so the map + distance stay live.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const ping = async () => {
      const pos = await requestGeolocation();
      if (cancelled || !pos) return;
      setMyPos(pos);
      try {
        await updateWorkerLocation({ data: { token, lat: pos.lat, lng: pos.lng } });
      } catch {
        /* keep showing the local position */
      }
    };
    void ping();
    const timer = setInterval(ping, 15_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [token]);

  useEffect(() => {
    if (token === null) navigate({ to: "/worker/login", replace: true });
  }, [token, navigate]);

  const job = useQuery({
    queryKey: ["worker", "job", id, token],
    enabled: Boolean(token),
    queryFn: () => workerJob({ data: { token: token as string, id } }),
  });

  const advance = useMutation({
    mutationFn: (next: "arrived" | "in_progress" | "completed") =>
      advanceJobStatus({ data: { token: token as string, bookingId: id, next } }),
    onSuccess: async (_result, next) => {
      await queryClient.invalidateQueries({ queryKey: ["worker"] });
      if (next === "completed") {
        toast.success("Job completed. Great work!");
        navigate({ to: "/worker/dashboard", replace: true });
      } else {
        toast.success("Status updated");
      }
    },
    onError: (error: Error) => toast.error(error.message || "Could not update the job status."),
  });

  const finish = useMutation({
    mutationFn: () =>
      completeJobWithPhotos({
        data: {
          token: token as string,
          bookingId: id,
          before: beforePhoto as string,
          after: afterPhoto as string,
        },
      }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["worker"] });
      if (result.result === "flagged") {
        toast.success("Job completed. The office will take a quick look at your photos.");
      } else {
        toast.success("Photos verified. Job completed — great work!");
      }
      navigate({ to: "/worker/dashboard", replace: true });
    },
    onError: (error: Error) => toast.error(error.message || "Could not complete this job."),
  });

  if (!token || job.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );
  }

  if (!job.data) {
    return (
      <WorkerShell token={token} subtitle="Active job">
        <div className="rounded-3xl border border-border bg-card p-8 text-center">
          <p className="text-base font-bold">This job isn't assigned to you.</p>
          <Button
            variant="hero"
            size="xl"
            className="mt-5 h-14 w-full text-base"
            onClick={() => navigate({ to: "/worker/dashboard" })}
          >
            Back to dashboard
          </Button>
        </div>
      </WorkerShell>
    );
  }

  const booking = job.data;
  const action = NEXT_ACTION[booking.status];
  const currentIndex = JOB_STAGES.findIndex((s) => s.status === booking.status);
  const ActionIcon = action ? ACTION_ICON[action.next] : CheckCircle2;
  const customerPoint =
    booking.customer_lat != null && booking.customer_lng != null
      ? { lat: booking.customer_lat, lng: booking.customer_lng }
      : (AREA_COORDS[booking.area] ?? null);
  const straightKm = customerPoint && myPos ? haversineKm(customerPoint, myPos) : null;
  const distance = roadKm ?? straightKm;
  const stageLabel =
    JOB_STAGES.find((s) => s.status === booking.status)?.label ??
    booking.status.replace("_", " ");

  return (
    <WorkerShell token={token} subtitle="Active job">
      <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">
          Job {booking.reference}
        </p>
        <h1 className="mt-1 text-2xl font-extrabold">
          {getService(booking.service_type)?.name ?? booking.service_type}
        </h1>

        <ul className="mt-5 space-y-3.5 text-sm font-semibold">
          <li className="flex items-start gap-3">
            <User className="mt-0.5 size-5 shrink-0 text-primary" />
            <span>{booking.customer_name}</span>
          </li>
          <li className="flex items-start gap-3">
            <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
            <span>
              {booking.address}
              <span className="block font-bold text-muted-foreground">{booking.area}</span>
            </span>
          </li>
          <li className="flex items-start gap-3">
            <CalendarDays className="mt-0.5 size-5 shrink-0 text-primary" />
            <span>{prettyDate(booking.booking_date)}</span>
          </li>
          <li className="flex items-start gap-3">
            <Clock className="mt-0.5 size-5 shrink-0 text-primary" />
            <span>{slotLabel(booking.time_slot)}</span>
          </li>
        </ul>

        {booking.notes && (
          <p className="mt-4 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
            <span className="font-bold text-foreground">Customer note: </span>
            {booking.notes}
          </p>
        )}

        <a href={`tel:${booking.phone}`} className="mt-5 block">
          <Button variant="outline" size="xl" className="h-14 w-full text-base">
            <PhoneCall className="size-5" />
            Call {booking.phone}
          </Button>
        </a>
      </section>

      {customerPoint && booking.status !== "completed" && (
        <section className="mt-4 rounded-3xl border border-border bg-card p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Live route
          </p>
          <div className="mt-3">
            {myPos ? (
              <ClientOnly fallback={<MapSkeleton />}>
                <Suspense fallback={<MapSkeleton />}>
                  <LiveTrackingMap
                    customer={customerPoint}
                    worker={myPos}
                    customerLabel="Customer address"
                    workerLabel="You"
                    onRouteDistance={setRoadKm}
                  />
                </Suspense>
              </ClientOnly>
            ) : (
              <div className="flex h-[260px] items-center justify-center rounded-2xl border border-border bg-muted/40 text-sm font-bold text-muted-foreground sm:h-[300px]">
                <Loader2 className="mr-2 size-4 animate-spin" /> Getting your location…
              </div>
            )}
          </div>
          <dl className="mt-4 grid gap-2 rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Distance remaining</dt>
              <dd className="font-extrabold">
                {distance != null ? `${distance} km` : "Updating…"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-extrabold text-primary">{stageLabel}</dd>
            </div>
          </dl>
        </section>
      )}

      <section className="mt-4 rounded-3xl border border-border bg-card p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Job progress
        </p>
        <ol className="mt-4 space-y-3">
          {JOB_STAGES.map((stage, index) => {
            const done = index <= currentIndex;
            return (
              <li key={stage.status} className="flex items-center gap-3">
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold transition-smooth ${
                    done ? "bg-success text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {done ? <Check className="size-4" /> : index + 1}
                </span>
                <span className={`text-sm font-bold ${done ? "" : "text-muted-foreground"}`}>
                  {stage.label}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      {booking.status !== "pending" && (
        <div className="mt-4">
          <BookingChat
            bookingId={booking.id}
            sender="worker"
            locked={booking.status === "completed" || booking.status === "cancelled"}
            peerLabel={booking.customer_name}
            onSend={(text) =>
              sendWorkerMessage({ data: { token: token as string, bookingId: booking.id, text } })
            }
            fetchMessages={() =>
              fetchWorkerMessages({ data: { token: token as string, bookingId: booking.id } })
            }
          />
        </div>
      )}

      {isFinalStep && (
        <CompletionPhotos
          before={beforePhoto}
          after={afterPhoto}
          onBefore={setBeforePhoto}
          onAfter={setAfterPhoto}
          disabled={finish.isPending}
        />
      )}

      {action ? (
        <>
          <Button
            variant="hero"
            size="xl"
            className="mt-5 h-16 w-full text-base"
            disabled={isFinalStep ? finish.isPending || !photosReady : advance.isPending}
            onClick={() =>
              isFinalStep ? finish.mutate() : advance.mutate(action.next)
            }
          >
            {(isFinalStep ? finish.isPending : advance.isPending) ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <ActionIcon className="size-6" />
            )}
            {isFinalStep && finish.isPending ? "Checking photos…" : action.label}
          </Button>
          {isFinalStep && !photosReady && (
            <p className="mt-2 text-center text-xs font-bold text-muted-foreground">
              Add both photos above to finish this job.
            </p>
          )}
        </>
      ) : (
        <p className="mt-5 rounded-2xl bg-success/10 px-4 py-4 text-center text-sm font-bold text-success">
          This job is {booking.status.replace("_", " ")}.
        </p>
      )}
    </WorkerShell>
  );
}

function MapSkeleton() {
  return <div className="h-[260px] w-full animate-pulse rounded-2xl bg-muted sm:h-[300px]" />;
}
