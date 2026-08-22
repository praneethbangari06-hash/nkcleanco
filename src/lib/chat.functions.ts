import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const CHATTABLE = ["assigned", "arrived", "in_progress"] as const;

export const sendCustomerMessage = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        reference: z.string().trim().min(4).max(32),
        phone: z.string().trim().regex(/^[6-9]\d{9}$/),
        text: z.string().trim().min(1).max(500),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("id, status")
      .eq("reference", data.reference.toUpperCase())
      .eq("phone", data.phone)
      .maybeSingle();

    if (!booking) throw new Error("We couldn't find that booking.");
    if (!CHATTABLE.includes(booking.status as (typeof CHATTABLE)[number])) {
      throw new Error("Chat is only open while your cleaner is on the job.");
    }

    const { error } = await supabaseAdmin.from("messages").insert({
      booking_id: booking.id,
      sender_type: "customer",
      message_text: data.text,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendWorkerMessage = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        token: z.string().min(1),
        bookingId: z.string().uuid(),
        text: z.string().trim().min(1).max(500),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { requireWorker } = await import("./worker.server");
    const worker = await requireWorker(data.token);

    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("id, status")
      .eq("id", data.bookingId)
      .eq("assigned_worker_id", worker.id)
      .maybeSingle();

    if (!booking) throw new Error("This job isn't assigned to you.");
    if (!CHATTABLE.includes(booking.status as (typeof CHATTABLE)[number])) {
      throw new Error("Chat is closed for this job.");
    }

    const { error } = await supabaseAdmin.from("messages").insert({
      booking_id: booking.id,
      sender_type: "worker",
      message_text: data.text,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
