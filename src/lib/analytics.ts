import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { SERVICE_AREAS, SERVICES, getService } from "@/lib/nkcleanco";

export interface AnalyticsBooking {
  id: string;
  reference: string;
  customer_name: string;
  area: string;
  service_type: string;
  status: string;
  price_min: number;
  price_max: number;
  rating: number | null;
  created_at: string;
  booking_date: string;
  assigned_worker_id: string | null;
  offered_worker_ids: string[] | null;
}

export interface AnalyticsWorker {
  id: string;
  name: string;
  is_online: boolean;
  status: string;
}

export interface WorkerPerformance {
  id: string;
  name: string;
  isOnline: boolean;
  status: string;
  jobsCompleted: number;
  revenue: number;
  avgRating: number | null;
  acceptanceRate: number | null;
}

export interface ActivityItem {
  id: string;
  at: string;
  kind: "booking" | "accepted" | "completed";
  text: string;
}

const midpoint = (b: { price_min: number; price_max: number }) =>
  Math.round((b.price_min + b.price_max) / 2);

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

export function useAnalytics() {
  return useQuery({
    queryKey: ["admin", "analytics"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const [bookingsResult, workersResult] = await Promise.all([
        supabase
          .from("bookings")
          .select(
            "id, reference, customer_name, area, service_type, status, price_min, price_max, rating, created_at, booking_date, assigned_worker_id, offered_worker_ids",
          )
          .order("created_at", { ascending: false }),
        supabase.from("workers").select("id, name, is_online, status"),
      ]);
      if (bookingsResult.error) throw bookingsResult.error;
      if (workersResult.error) throw workersResult.error;

      const bookings = (bookingsResult.data ?? []) as unknown as AnalyticsBooking[];
      const workers = (workersResult.data ?? []) as unknown as AnalyticsWorker[];
      return buildAnalytics(bookings, workers);
    },
  });
}

export function buildAnalytics(bookings: AnalyticsBooking[], workers: AnalyticsWorker[]) {
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const completed = bookings.filter((b) => b.status === "completed");

  const revenue = completed.reduce((sum, b) => sum + midpoint(b), 0);
  const rated = completed.filter((b) => b.rating != null);
  const avgRating = rated.length
    ? Math.round((rated.reduce((s, b) => s + (b.rating ?? 0), 0) / rated.length) * 10) / 10
    : null;
  const closed = bookings.filter((b) => b.status !== "pending");
  const completionRate = bookings.length
    ? Math.round((completed.length / bookings.length) * 100)
    : 0;

  // Bookings per day for the last 30 days.
  const trend: { day: string; label: string; bookings: number }[] = [];
  for (let i = 29; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    trend.push({
      day: key,
      label: date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      bookings: bookings.filter((b) => dayKey(b.created_at) === key).length,
    });
  }

  const revenueByArea = SERVICE_AREAS.map((area) => ({
    area,
    revenue: completed.filter((b) => b.area === area).reduce((sum, b) => sum + midpoint(b), 0),
    bookings: bookings.filter((b) => b.area === area).length,
  }));

  const serviceBreakdown = SERVICES.map((service) => ({
    name: service.name,
    id: service.id,
    value: bookings.filter((b) => b.service_type === service.id || b.service_type === service.name)
      .length,
  })).filter((s) => s.value > 0);

  const workerPerformance: WorkerPerformance[] = workers
    .map((worker) => {
      const mine = bookings.filter((b) => b.assigned_worker_id === worker.id);
      const done = mine.filter((b) => b.status === "completed");
      const myRated = done.filter((b) => b.rating != null);
      const acceptedCount = mine.filter((b) => b.status !== "pending").length;
      const declinedCount = bookings.filter((b) =>
        (b.offered_worker_ids ?? []).includes(worker.id),
      ).length;
      const offered = acceptedCount + declinedCount;
      return {
        id: worker.id,
        name: worker.name,
        isOnline: worker.is_online,
        status: worker.status,
        jobsCompleted: done.length,
        revenue: done.reduce((sum, b) => sum + midpoint(b), 0),
        avgRating: myRated.length
          ? Math.round((myRated.reduce((s, b) => s + (b.rating ?? 0), 0) / myRated.length) * 10) / 10
          : null,
        acceptanceRate: offered ? Math.round((acceptedCount / offered) * 100) : null,
      };
    })
    .sort((a, b) => b.jobsCompleted - a.jobsCompleted);

  const jobsPerWorker = workerPerformance
    .map((w) => ({ name: w.name, jobs: w.jobsCompleted }))
    .sort((a, b) => b.jobs - a.jobs);

  const nameOf = (id: string | null) =>
    workers.find((w) => w.id === id)?.name ?? "A cleaner";

  const activity: ActivityItem[] = bookings.slice(0, 40).flatMap((b) => {
    const items: ActivityItem[] = [
      {
        id: `${b.id}-new`,
        at: b.created_at,
        kind: "booking",
        text: `New booking from ${b.customer_name} in ${b.area}`,
      },
    ];
    if (b.status === "completed") {
      items.push({
        id: `${b.id}-done`,
        at: b.created_at,
        kind: "completed",
        text: `${nameOf(b.assigned_worker_id)} completed a job in ${b.area}`,
      });
    } else if (b.assigned_worker_id && b.status !== "pending") {
      items.push({
        id: `${b.id}-acc`,
        at: b.created_at,
        kind: "accepted",
        text: `${nameOf(b.assigned_worker_id)} accepted a job in ${b.area}`,
      });
    }
    return items;
  });
  activity.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  return {
    totals: {
      bookings: bookings.length,
      bookingsThisMonth: bookings.filter((b) => b.created_at.startsWith(monthPrefix)).length,
      revenue,
      onlineWorkers: workers.filter((w) => w.is_online).length,
      totalWorkers: workers.length,
      avgRating,
      ratedJobs: rated.length,
      completionRate,
      completed: completed.length,
      closed: closed.length,
    },
    trend,
    revenueByArea,
    serviceBreakdown,
    workerPerformance,
    jobsPerWorker,
    activity: activity.slice(0, 12),
  };
}

export function serviceLabel(id: string) {
  return getService(id)?.name ?? id;
}
