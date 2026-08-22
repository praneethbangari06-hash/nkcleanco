import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  Check,
  Clock,
  Loader2,
  MapPin,
  Navigation,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { WorkerShell, useActiveJob } from "@/components/worker/WorkerShell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { getService, prettyDate, slotLabel } from "@/lib/nkcleanco";
import { requestGeolocation, useWorkerToken } from "@/lib/worker-client";
import {
  respondToJobRequest,
  setWorkerOnline,
  updateWorkerLocation,
  workerJobRequest,
  workerMe,
} from "@/lib/worker.functions";

export const Route = createFileRoute("/worker/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Worker Dashboard — NK CleanCo" },
      { name: "description", content: "Go online and accept NK CleanCo cleaning jobs." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorkerDashboard,
});

const REQUEST_SECONDS = 60;

function WorkerDashboard() {
  const token = useWorkerToken();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (token === null) navigate({ to: "/worker/login", replace: true });
  }, [token, navigate]);

  const me = useQuery({
    queryKey: ["worker", "me", token],
    enabled: Boolean(token),
    queryFn: () => workerMe({ data: { token: token as string } }),
    retry: false,
  });

  useEffect(() => {
    if (me.isError) navigate({ to: "/worker/login", replace: true });
  }, [me.isError, navigate]);

  const online = me.data?.is_online ?? false;
  const { data: activeJob } = useActiveJob(token);

  // While online, keep the worker's GPS position fresh so auto-assignment can
  // pick the nearest cleaner. Stops as soon as they go offline.
  useEffect(() => {
    if (!token || !online) return;
    let cancelled = false;
    const push = async () => {
      const coords = await requestGeolocation();
      if (!coords || cancelled) return;
      try {
        await updateWorkerLocation({ data: { token, lat: coords.lat, lng: coords.lng } });
      } catch {
        /* transient network issue — the next tick retries */
      }
    };
    void push();
    const timer = setInterval(push, 15_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [token, online]);



  const request = useQuery({
    queryKey: ["worker", "request", token],
    enabled: Boolean(token) && online && !activeJob,
    refetchInterval: 5_000,
    queryFn: () => workerJobRequest({ data: { token: token as string } }),
  });

  const toggle = useMutation({
    mutationFn: async (next: boolean) => {
      const coords = next ? await requestGeolocation() : null;
      return setWorkerOnline({
        data: { token: token as string, isOnline: next, ...(coords ?? {}) },
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["worker"] });
      toast.success(result.is_online ? "You're online" : "You're offline");
    },
    onError: () => toast.error("Could not update your status. Try again."),
  });

  const respond = useMutation({
    mutationFn: (input: { bookingId: string; accept: boolean }) =>
      respondToJobRequest({ data: { token: token as string, ...input } }),
    onSuccess: async (result, input) => {
      await queryClient.invalidateQueries({ queryKey: ["worker"] });
      if (result.accepted) {
        toast.success("Job accepted");
        navigate({ to: "/worker/job/$id", params: { id: input.bookingId } });
      } else {
        toast.info("Job rejected. Waiting for the next request.");
      }
    },
    onError: () => toast.error("Could not send your response. Try again."),
  });

  if (!token || me.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );
  }

  const job = request.data;

  return (
    <WorkerShell token={token} subtitle="Worker app">
      <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Welcome</p>
        <h1 className="mt-1 text-2xl font-extrabold">{me.data?.name}</h1>

        <div
          className={`mt-5 flex items-center justify-between gap-4 rounded-2xl border p-4 transition-smooth ${
            online ? "border-success/40 bg-success/10" : "border-border bg-muted"
          }`}
        >
          <div>
            <p className="text-lg font-extrabold">{online ? "ONLINE" : "OFFLINE"}</p>
            <p className="text-xs font-semibold text-muted-foreground">
              {online ? "You can receive job requests" : "You will not receive requests"}
            </p>
          </div>
          <Switch
            checked={online}
            disabled={toggle.isPending}
            onCheckedChange={(next) => toggle.mutate(next)}
            aria-label="Toggle online status"
            className="h-8 w-14 data-[state=checked]:bg-success [&>span]:size-7 [&>span]:data-[state=checked]:translate-x-6"
          />
        </div>
      </section>

      {activeJob ? (
        <section className="mt-4 rounded-3xl border border-primary/30 bg-primary-soft p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Active job</p>
          <h2 className="mt-1 text-lg font-extrabold">
            {getService(activeJob.service_type)?.name ?? activeJob.service_type}
          </h2>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            {activeJob.area} · {prettyDate(activeJob.booking_date)}
          </p>
          <Button
            variant="hero"
            size="xl"
            className="mt-4 h-14 w-full text-base"
            onClick={() => navigate({ to: "/worker/job/$id", params: { id: activeJob.id } })}
          >
            <Navigation className="size-5" />
            Open job
          </Button>
        </section>
      ) : !online ? (
        <section className="mt-4 rounded-3xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-base font-bold">You're offline.</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Turn online to start receiving job requests.
          </p>
        </section>
      ) : job ? (
        <JobRequestCard
          job={job}
          busy={respond.isPending}
          onAccept={() => respond.mutate({ bookingId: job.id, accept: true })}
          onReject={() => respond.mutate({ bookingId: job.id, accept: false })}
        />
      ) : (
        <section className="mt-4 rounded-3xl border border-border bg-card p-8 text-center">
          <span className="relative mx-auto flex size-16 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-primary/25" />
            <span className="relative flex size-14 items-center justify-center rounded-full bg-gradient-primary shadow-glow">
              <Sparkles className="size-6 text-primary-foreground" />
            </span>
          </span>
          <p className="mt-5 text-base font-bold">Waiting for job requests…</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Keep this screen open. We'll alert you the moment a job comes in.
          </p>
        </section>
      )}
    </WorkerShell>
  );
}

interface JobRequest {
  id: string;
  area: string;
  service_type: string;
  booking_date: string;
  time_slot: string;
  distance_km: number | null;
}

function JobRequestCard({
  job,
  busy,
  onAccept,
  onReject,
}: {
  job: JobRequest;
  busy: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const [left, setLeft] = useState(REQUEST_SECONDS);

  useEffect(() => {
    setLeft(REQUEST_SECONDS);
    const timer = setInterval(() => setLeft((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(timer);
  }, [job.id]);

  useEffect(() => {
    if (left === 0 && !busy) onReject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  return (
    <section className="animate-fade-up mt-4 rounded-3xl border-2 border-success/50 bg-card p-5 shadow-lifted">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-success">New job request</p>
        <p className="text-2xl font-extrabold tabular-nums">{left}s</p>
      </div>

      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-success transition-all duration-1000 ease-linear"
          style={{ width: `${(left / REQUEST_SECONDS) * 100}%` }}
        />
      </div>

      <h2 className="mt-4 text-xl font-extrabold">
        {getService(job.service_type)?.name ?? job.service_type}
      </h2>

      <ul className="mt-4 space-y-2.5 text-sm font-semibold">
        <li className="flex items-center gap-2.5">
          <MapPin className="size-5 shrink-0 text-primary" />
          {job.area}
          {job.distance_km != null && (
            <span className="text-muted-foreground">· approx {job.distance_km} km away</span>
          )}
        </li>
        <li className="flex items-center gap-2.5">
          <CalendarDays className="size-5 shrink-0 text-primary" />
          {prettyDate(job.booking_date)}
        </li>
        <li className="flex items-center gap-2.5">
          <Clock className="size-5 shrink-0 text-primary" />
          {slotLabel(job.time_slot)}
        </li>
      </ul>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button
          size="xl"
          className="h-16 bg-success text-base text-primary-foreground hover:bg-success/90"
          disabled={busy}
          onClick={onAccept}
        >
          <Check className="size-6" />
          ACCEPT
        </Button>
        <Button
          size="xl"
          variant="destructive"
          className="h-16 text-base"
          disabled={busy}
          onClick={onReject}
        >
          <X className="size-6" />
          REJECT
        </Button>
      </div>
    </section>
  );
}
