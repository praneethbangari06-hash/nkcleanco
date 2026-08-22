import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  ArrowUpDown,
  CalendarDays,
  CheckCircle2,
  IndianRupee,
  Loader2,
  Star,
  UserCheck,
  Users,
} from "lucide-react";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { BookingsTable } from "@/components/admin/BookingsTable";
import { Button } from "@/components/ui/button";
import { useAnalytics, type WorkerPerformance } from "@/lib/analytics";
import { inr } from "@/lib/nkcleanco";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — NK CleanCo Admin" }] }),
  component: DashboardPage,
});

const CHART_COLORS = [
  "var(--color-primary)",
  "var(--color-mint)",
  "var(--color-warning)",
  "var(--color-accent)",
  "var(--color-ink)",
];

function Card({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-3xl border border-border bg-card p-5 shadow-card ${className ?? ""}`}
    >
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const tooltipStyle = {
  borderRadius: 14,
  border: "1px solid var(--color-border)",
  background: "var(--color-card)",
  fontSize: 12,
  fontWeight: 600,
} as const;

type SortKey = keyof Pick<
  WorkerPerformance,
  "name" | "jobsCompleted" | "revenue" | "avgRating" | "acceptanceRate"
>;

function DashboardPage() {
  const { data, isLoading } = useAnalytics();
  const [sortKey, setSortKey] = useState<SortKey>("jobsCompleted");
  const [asc, setAsc] = useState(false);

  if (isLoading || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );
  }

  const { totals } = data;

  const stats = [
    {
      label: "Total bookings",
      value: String(totals.bookings),
      icon: CalendarDays,
      hint: `${totals.bookingsThisMonth} this month`,
    },
    {
      label: "Revenue generated",
      value: inr(totals.revenue),
      icon: IndianRupee,
      hint: `${totals.completed} completed jobs`,
    },
    {
      label: "Workers online",
      value: String(totals.onlineWorkers),
      icon: Users,
      hint: `of ${totals.totalWorkers} cleaners`,
    },
    {
      label: "Average rating",
      value: totals.avgRating != null ? `${totals.avgRating} / 5` : "—",
      icon: Star,
      hint: totals.ratedJobs ? `${totals.ratedJobs} rated jobs` : "No ratings yet",
    },
    {
      label: "Completion rate",
      value: `${totals.completionRate}%`,
      icon: CheckCircle2,
      hint: "Completed vs all bookings",
    },
  ];

  const sortedWorkers = [...data.workerPerformance].sort((a, b) => {
    const x = a[sortKey];
    const y = b[sortKey];
    if (typeof x === "string" || typeof y === "string") {
      return asc
        ? String(x).localeCompare(String(y))
        : String(y).localeCompare(String(x));
    }
    const nx = x ?? -1;
    const ny = y ?? -1;
    return asc ? Number(nx) - Number(ny) : Number(ny) - Number(nx);
  });

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setAsc((prev) => !prev);
    else {
      setSortKey(key);
      setAsc(key === "name");
    }
  };

  const columns: { key: SortKey; label: string; numeric?: boolean }[] = [
    { key: "name", label: "Worker" },
    { key: "jobsCompleted", label: "Total jobs", numeric: true },
    { key: "revenue", label: "Revenue", numeric: true },
    { key: "avgRating", label: "Avg rating", numeric: true },
    { key: "acceptanceRate", label: "Acceptance", numeric: true },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Dashboard</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Live analytics across bookings, revenue and cleaner performance.
          </p>
        </div>
        <Button asChild variant="soft" size="sm">
          <Link to="/admin/bookings">
            All bookings
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card title="Bookings — last 30 days" className="lg:col-span-2">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trend} margin={{ left: -20, right: 8, top: 8 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="label"
                  interval={4}
                  tick={{ fontSize: 11 }}
                  stroke="var(--color-muted-foreground)"
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="bookings"
                  stroke="var(--color-primary)"
                  strokeWidth={3}
                  dot={{ r: 2 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Revenue by area">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.revenueByArea} margin={{ left: -10, right: 8, top: 8 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="area" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => [inr(value), "Revenue"]}
                />
                <Bar dataKey="revenue" radius={[10, 10, 0, 0]} fill="var(--color-primary)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Jobs completed per worker">
          <div className="h-64 w-full">
            {data.jobsPerWorker.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.jobsPerWorker}
                  layout="vertical"
                  margin={{ left: 8, right: 16, top: 8 }}
                >
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="4 4" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={92}
                    tick={{ fontSize: 11 }}
                    stroke="var(--color-muted-foreground)"
                  />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v, "Jobs"]} />
                  <Bar dataKey="jobs" radius={[0, 10, 10, 0]} fill="var(--color-mint)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </div>
        </Card>

        <Card title="Service type breakdown">
          <div className="h-64 w-full">
            {data.serviceBreakdown.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.serviceBreakdown}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={86}
                    paddingAngle={3}
                  >
                    {data.serviceBreakdown.map((entry, index) => (
                      <Cell key={entry.id} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n) => [v, String(n)]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </div>
          <ul className="mt-3 grid gap-1.5 text-xs font-semibold">
            {data.serviceBreakdown.map((entry, index) => (
              <li key={entry.id} className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: CHART_COLORS[index % CHART_COLORS.length] }}
                />
                {entry.name}
                <span className="ml-auto text-muted-foreground">
                  {Math.round(
                    (entry.value /
                      data.serviceBreakdown.reduce((sum, item) => sum + item.value, 0)) *
                      100,
                  )}
                  %
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Recent activity">
          {data.activity.length ? (
            <ul className="space-y-3">
              {data.activity.map((item) => (
                <li key={item.id} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    {item.kind === "completed" ? (
                      <CheckCircle2 className="size-4" />
                    ) : item.kind === "accepted" ? (
                      <UserCheck className="size-4" />
                    ) : (
                      <Activity className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{item.text}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.at).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No activity yet.</p>
          )}
        </Card>
      </div>

      <h2 className="mt-10 text-lg font-bold">Worker performance</h2>
      <div className="mt-4 overflow-x-auto rounded-3xl border border-border bg-card shadow-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleSort(column.key)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground transition-smooth hover:text-primary"
                  >
                    {column.label}
                    <ArrowUpDown
                      className={`size-3.5 ${sortKey === column.key ? "text-primary" : ""}`}
                    />
                  </button>
                </th>
              ))}
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedWorkers.map((worker) => (
              <tr key={worker.id} className="border-b border-border/70 last:border-0">
                <td className="px-4 py-3 font-bold">{worker.name}</td>
                <td className="px-4 py-3 font-semibold">{worker.jobsCompleted}</td>
                <td className="px-4 py-3 font-semibold">{inr(worker.revenue)}</td>
                <td className="px-4 py-3 font-semibold">
                  {worker.avgRating != null ? (
                    <span className="inline-flex items-center gap-1">
                      <Star className="size-3.5 text-warning" />
                      {worker.avgRating}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 font-semibold">
                  {worker.acceptanceRate != null ? `${worker.acceptanceRate}%` : "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${
                      worker.isOnline
                        ? "border-mint/30 bg-mint-soft text-mint"
                        : "border-border bg-muted text-muted-foreground"
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${
                        worker.isOnline ? "bg-mint" : "bg-muted-foreground"
                      }`}
                    />
                    {worker.isOnline ? "Online" : "Offline"}
                  </span>
                </td>
              </tr>
            ))}
            {sortedWorkers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No cleaners on the roster yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 text-lg font-bold">Latest bookings</h2>
      <div className="mt-4">
        <BookingsTable limit={8} />
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center rounded-2xl bg-surface text-sm font-semibold text-muted-foreground">
      Not enough data yet
    </div>
  );
}
