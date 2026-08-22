import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const lookupSchema = z.object({
  reference: z.string().trim().min(4).max(24),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/),
});

/** Kicks off auto-assignment right after a booking is created. */
export const requestAutoAssignment = createServerFn({ method: "POST" })
  .inputValidator((data) => lookupSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { ensureAssignment } = await import("./assignment.server");

    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("id")
      .eq("reference", data.reference)
      .eq("phone", data.phone)
      .maybeSingle();
    if (!booking) return { ok: false };

    await ensureAssignment(booking.id);
    return { ok: true };
  });

/** Customer-side tracking: safe subset of booking state, keyed by reference + phone. */
export const bookingTracking = createServerFn({ method: "POST" })
  .inputValidator((data) => lookupSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { ensureAssignment } = await import("./assignment.server");

    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("id, status, area, customer_lat, customer_lng, assigned_worker_id, offered_worker_ids")
      .eq("reference", data.reference)
      .eq("phone", data.phone)
      .maybeSingle();
    if (!booking) return null;

    let exhausted = false;
    if (booking.status === "pending") {
      const result = await ensureAssignment(booking.id);
      exhausted = result.status === "exhausted";
    }

    const { data: fresh } = await supabaseAdmin
      .from("bookings")
      .select("status, assigned_worker_id")
      .eq("id", booking.id)
      .maybeSingle();

    let workerName: string | null = null;
    let workerLat: number | null = null;
    let workerLng: number | null = null;
    let locationUpdatedAt: string | null = null;
    if (fresh?.assigned_worker_id && fresh.status !== "pending") {
      const { data: worker } = await supabaseAdmin
        .from("workers")
        .select("name, current_lat, current_lng, last_location_update")
        .eq("id", fresh.assigned_worker_id)
        .maybeSingle();
      workerName = worker?.name ?? null;
      workerLat = worker?.current_lat ?? null;
      workerLng = worker?.current_lng ?? null;
      locationUpdatedAt = worker?.last_location_update ?? null;
    }

    return {
      booking_id: booking.id,
      status: fresh?.status ?? booking.status,
      area: booking.area,
      customer_lat: booking.customer_lat,
      customer_lng: booking.customer_lng,
      worker_name: workerName,
      worker_lat: workerLat,
      worker_lng: workerLng,
      location_updated_at: locationUpdatedAt,
      exhausted,
    };
  });

