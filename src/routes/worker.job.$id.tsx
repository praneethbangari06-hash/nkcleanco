import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import { useEffect } from "react";
import { toast } from "sonner";

import { WorkerShell } from "@/components/worker/WorkerShell";
import { Button } from "@/components/ui/button";
import { getService, prettyDate, slotLabel } from "@/lib/nkcleanco";
import { JOB_STAGES, NEXT_ACTION, useWorkerToken } from "@/lib/worker-client";
import { advanceJobStatus, workerJob } from "@/lib/worker.functions";

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

      {action ? (
        <Button
          variant="hero"
          size="xl"
          className="mt-5 h-16 w-full text-base"
          disabled={advance.isPending}
          onClick={() => advance.mutate(action.next)}
        >
          {advance.isPending ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <ActionIcon className="size-6" />
          )}
          {action.label}
        </Button>
      ) : (
        <p className="mt-5 rounded-2xl bg-success/10 px-4 py-4 text-center text-sm font-bold text-success">
          This job is {booking.status.replace("_", " ")}.
        </p>
      )}
    </WorkerShell>
  );
}
