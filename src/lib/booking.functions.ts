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
      .select("id, status, assigned_worker_id, offered_worker_ids")
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
    if (fresh?.assigned_worker_id && fresh.status !== "pending") {
      const { data: worker } = await supabaseAdmin
        .from("workers")
        .select("name")
        .eq("id", fresh.assigned_worker_id)
        .maybeSingle();
      workerName = worker?.name ?? null;
    }

    return {
      status: fresh?.status ?? booking.status,
      worker_name: workerName,
      exhausted,
    };
  });
