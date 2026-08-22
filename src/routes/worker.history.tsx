import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarDays, CheckCircle2, Clock, Loader2, MapPin } from "lucide-react";
import { useEffect } from "react";

import { WorkerShell } from "@/components/worker/WorkerShell";
import { getService, prettyDate, slotLabel } from "@/lib/nkcleanco";
import { useWorkerToken } from "@/lib/worker-client";
import { workerHistory } from "@/lib/worker.functions";

export const Route = createFileRoute("/worker/history")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Job History — NK CleanCo Worker" },
      { name: "description", content: "Completed cleaning jobs for NK CleanCo staff." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorkerHistoryPage,
});

function WorkerHistoryPage() {
  const token = useWorkerToken();
  const navigate = useNavigate();

  useEffect(() => {
    if (token === null) navigate({ to: "/worker/login", replace: true });
  }, [token, navigate]);

  const history = useQuery({
    queryKey: ["worker", "history", token],
    enabled: Boolean(token),
    queryFn: () => workerHistory({ data: { token: token as string } }),
  });

  if (!token || history.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );
  }

  const rows = history.data ?? [];

  return (
    <WorkerShell token={token} subtitle="Job history">
      <h1 className="text-2xl font-extrabold">Completed jobs</h1>
      <p className="mt-1 text-sm text-muted-foreground">Most recent first.</p>

      {rows.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-base font-bold">No completed jobs yet.</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Finished jobs will appear here automatically.
          </p>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="rounded-3xl border border-border bg-card p-4 shadow-soft transition-smooth"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-extrabold">
                  {getService(row.service_type)?.name ?? row.service_type}
                </h2>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-bold text-success">
                  <CheckCircle2 className="size-3.5" />
                  Completed
                </span>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm font-semibold text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CalendarDays className="size-4 text-primary" />
                  {prettyDate(row.booking_date)}
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="size-4 text-primary" />
                  {slotLabel(row.time_slot)}
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="size-4 text-primary" />
                  {row.area}
                </li>
              </ul>
            </li>
          ))}
        </ul>
      )}
    </WorkerShell>
  );
}
