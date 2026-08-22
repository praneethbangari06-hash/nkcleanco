import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ClipboardCheck, History, Home, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { BrandMark } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";
import { clearWorkerToken } from "@/lib/worker-client";
import { workerActiveJob } from "@/lib/worker.functions";

export function useActiveJob(token: string | null | undefined) {
  return useQuery({
    queryKey: ["worker", "active-job", token],
    enabled: Boolean(token),
    refetchInterval: 15_000,
    queryFn: () => workerActiveJob({ data: { token: token as string } }),
  });
}

export function WorkerShell({
  token,
  subtitle,
  children,
}: {
  token: string | null | undefined;
  subtitle?: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const { data: activeJob } = useActiveJob(token);

  const signOut = () => {
    clearWorkerToken();
    navigate({ to: "/worker/login", replace: true });
  };

  const itemClass =
    "flex flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-bold text-muted-foreground transition-smooth";

  return (
    <div className="flex min-h-screen flex-col bg-surface pb-24">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-xl">
        <div>
          <BrandMark />
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {subtitle ?? "Worker app"}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut className="size-4" />
          Log out
        </Button>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-5">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-3 pb-3 pt-2 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-stretch gap-1">
          <Link
            to="/worker/dashboard"
            className={itemClass}
            activeProps={{ className: "bg-primary-soft text-primary" }}
          >
            <Home className="size-6" />
            Dashboard
          </Link>
          {activeJob ? (
            <Link
              to="/worker/job/$id"
              params={{ id: activeJob.id }}
              className={itemClass}
              activeProps={{ className: "bg-primary-soft text-primary" }}
            >
              <ClipboardCheck className="size-6" />
              Active Job
            </Link>
          ) : (
            <button
              type="button"
              className={itemClass}
              onClick={() => toast.info("No active job right now.")}
            >
              <ClipboardCheck className="size-6" />
              Active Job
            </button>
          )}
          <Link
            to="/worker/history"
            className={itemClass}
            activeProps={{ className: "bg-primary-soft text-primary" }}
          >
            <History className="size-6" />
            History
          </Link>
        </div>
      </nav>
    </div>
  );
}
