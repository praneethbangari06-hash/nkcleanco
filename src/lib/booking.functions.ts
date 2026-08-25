import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const lookupSchema = z.object({
  reference: z.string().trim().min(4).max(24),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/),
});

const createSchema = z.object({
  reference: z.string().trim().min(4).max(24),
  customer_name: z.string().trim().min(2).max(80),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/),
  address: z.string().trim().min(3).max(300),
  area: z.enum(["Narsingi", "Kokapet", "Kanapur"]),
  service_type: z.string().trim().min(2).max(80),
  booking_date: z.string().trim().min(8).max(10),
  time_slot: z.string().trim().min(2).max(40),
  notes: z.string().trim().max(500).nullable().optional(),
  price_min: z.number().int().min(0).max(1000000),
  price_max: z.number().int().min(0).max(1000000),
  customer_lat: z.number().min(-90).max(90).nullable().optional(),
  customer_lng: z.number().min(-180).max(180).nullable().optional(),
});

/** Creates a booking server-side so the browser never calls the database host directly. */
export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((data) => createSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("bookings").insert({
      ...data,
      notes: data.notes ?? null,
      customer_lat: data.customer_lat ?? null,
      customer_lng: data.customer_lng ?? null,
    });
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const };
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

