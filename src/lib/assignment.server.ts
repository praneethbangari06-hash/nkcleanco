/**
 * Server-only automatic worker assignment: picks the nearest online worker for a
 * pending booking, and rotates to the next nearest on reject / 60s timeout.
 * Never import this from a component.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const OFFER_TIMEOUT_MS = 60_000;

/** Approximate centroids for the serviced areas (bookings store an area, not coords). */
const AREA_COORDS: Record<string, { lat: number; lng: number }> = {
  Narsingi: { lat: 17.3894, lng: 78.3517 },
  Kokapet: { lat: 17.399, lng: 78.34 },
  Kanapur: { lat: 17.3612, lng: 78.3305 },
};

export function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function areaCoords(area: string) {
  return AREA_COORDS[area] ?? null;
}

export interface AssignmentResult {
  status: "assigned" | "pending" | "exhausted";
  worker?: { id: string; name: string } | null;
}

/**
 * Ensures a booking is offered to the nearest eligible online worker.
 * - Releases an offer that has been outstanding for more than 60 seconds.
 * - Skips workers who already rejected / timed out on this booking.
 */
export async function ensureAssignment(bookingId: string): Promise<AssignmentResult> {
  const { data: booking, error } = await supabaseAdmin
    .from("bookings")
    .select("id, area, status, assigned_worker_id, offered_worker_ids, offered_at")
    .eq("id", bookingId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!booking) return { status: "pending" };

  // Already accepted / in progress / done — nothing to do.
  if (booking.status !== "pending") {
    return { status: "assigned", worker: await workerSummary(booking.assigned_worker_id) };
  }

  let offered = booking.offered_worker_ids ?? [];

  // Outstanding offer: keep waiting until it times out, then release it.
  if (booking.assigned_worker_id) {
    const age = booking.offered_at ? Date.now() - new Date(booking.offered_at).getTime() : Infinity;
    if (age < OFFER_TIMEOUT_MS) {
      return { status: "pending" };
    }
    offered = Array.from(new Set([...offered, booking.assigned_worker_id]));
    await supabaseAdmin
      .from("bookings")
      .update({ assigned_worker_id: null, offered_worker_ids: offered, offered_at: null })
      .eq("id", booking.id)
      .eq("status", "pending");
  }

  const target = areaCoords(booking.area);

  const { data: workers } = await supabaseAdmin
    .from("workers")
    .select("id, name, current_lat, current_lng, status")
    .eq("is_online", true);

  const candidates = (workers ?? [])
    .filter((w) => w.status !== "on_job" && !offered.includes(w.id))
    .map((w) => ({
      id: w.id,
      name: w.name,
      distance:
        target && w.current_lat != null && w.current_lng != null
          ? haversineKm(w.current_lat, w.current_lng, target.lat, target.lng)
          : Number.MAX_SAFE_INTEGER,
    }))
    .sort((a, b) => a.distance - b.distance);

  if (candidates.length === 0) {
    return { status: (workers ?? []).length > 0 ? "exhausted" : "pending" };
  }

  const next = candidates[0]!;
  const { data: claimed } = await supabaseAdmin
    .from("bookings")
    .update({ assigned_worker_id: next.id, offered_at: new Date().toISOString() })
    .eq("id", booking.id)
    .eq("status", "pending")
    .is("assigned_worker_id", null)
    .select("id")
    .maybeSingle();

  if (!claimed) return { status: "pending" };
  return { status: "pending", worker: { id: next.id, name: next.name } };
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
