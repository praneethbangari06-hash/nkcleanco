/**
 * Server-only wrapper around the database assignment routines.
 *
 * The actual nearest-worker selection lives in Postgres
 * (`public.assign_nearest_worker` / `public.rotate_stale_offers`) and runs from an
 * AFTER INSERT trigger on `bookings`, so bookings created outside the app are also
 * assigned automatically. These helpers just nudge/observe that logic.
 * Never import this from a component.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const OFFER_TIMEOUT_MS = 60_000;

export interface AssignmentResult {
  status: "assigned" | "pending" | "exhausted";
  worker?: { id: string; name: string } | null;
}

/** Rolls stale (60s+) offers onward, then makes sure this booking is offered to someone. */
export async function ensureAssignment(bookingId: string): Promise<AssignmentResult> {
  await supabaseAdmin.rpc("rotate_stale_offers");
  await supabaseAdmin.rpc("assign_nearest_worker", { _booking_id: bookingId });

  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("status, assigned_worker_id, offered_worker_ids")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) return { status: "pending" };

  if (booking.status !== "pending") {
    return { status: "assigned", worker: await workerSummary(booking.assigned_worker_id) };
  }

  if (booking.assigned_worker_id) {
    return { status: "pending", worker: await workerSummary(booking.assigned_worker_id) };
  }

  // No cleaner holds an offer and everyone available has already passed.
  const exhausted = (booking.offered_worker_ids ?? []).length > 0;
  return { status: exhausted ? "exhausted" : "pending" };
}

/** Called when a worker rejects or times out: record it and offer the job onward. */
export async function declineAndReassign(bookingId: string, workerId: string) {
  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("offered_worker_ids")
    .eq("id", bookingId)
    .maybeSingle();

  const offered = Array.from(new Set([...(booking?.offered_worker_ids ?? []), workerId]));
  await supabaseAdmin
    .from("bookings")
    .update({ assigned_worker_id: null, offered_worker_ids: offered, offered_at: null })
    .eq("id", bookingId)
    .eq("assigned_worker_id", workerId)
    .eq("status", "pending");

  return ensureAssignment(bookingId);
}

async function workerSummary(id: string | null) {
  if (!id) return null;
  const { data } = await supabaseAdmin.from("workers").select("id, name").eq("id", id).maybeSingle();
  return data ?? null;
}
