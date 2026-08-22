import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const workerLogin = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
        password: z.string().min(4).max(72),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createWorkerToken, verifyPassword } = await import("./worker.server");

    const { data: worker } = await supabaseAdmin
      .from("workers")
      .select("id, name, phone, is_online, status, password_hash")
      .eq("phone", data.phone)
      .maybeSingle();

    if (!worker || !(await verifyPassword(data.password, worker.password_hash))) {
      throw new Error("Phone number or password is incorrect.");
    }

    return {
      token: await createWorkerToken(worker.id),
      worker: {
        id: worker.id,
        name: worker.name,
        phone: worker.phone,
        is_online: worker.is_online,
        status: worker.status,
      },
    };
  });

export const workerMe = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ token: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const { requireWorker } = await import("./worker.server");
    return requireWorker(data.token);
  });

export const setWorkerOnline = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        token: z.string().min(1),
        isOnline: z.boolean(),
        lat: z.number().optional(),
        lng: z.number().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { requireWorker } = await import("./worker.server");
    const worker = await requireWorker(data.token);

    const patch = {
      is_online: data.isOnline,
      status: data.isOnline ? "available" : "offline",
      ...(data.lat != null && data.lng != null
        ? { current_lat: data.lat, current_lng: data.lng }
        : {}),
    };

    const { error } = await supabaseAdmin.from("workers").update(patch).eq("id", worker.id);
    if (error) throw new Error(error.message);
    return { is_online: data.isOnline };
  });

/** Booking assigned to this worker that is still awaiting their accept/reject. */
export const workerJobRequest = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ token: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { requireWorker, distanceKm } = await import("./worker.server");
    const worker = await requireWorker(data.token);

    const { data: me } = await supabaseAdmin
      .from("workers")
      .select("current_lat, current_lng")
      .eq("id", worker.id)
      .maybeSingle();

    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .select("id, area, service_type, booking_date, time_slot, price_min, price_max")
      .eq("assigned_worker_id", worker.id)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!booking) return null;

    return {
      ...booking,
      distance_km: distanceKm(booking.area, me?.current_lat, me?.current_lng),
    };
  });

export const respondToJobRequest = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        token: z.string().min(1),
        bookingId: z.string().uuid(),
        accept: z.boolean(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { requireWorker } = await import("./worker.server");
    const worker = await requireWorker(data.token);

    const patch = data.accept
      ? { status: "assigned" as const }
      : { status: "pending" as const, assigned_worker_id: null };

    const { error } = await supabaseAdmin
      .from("bookings")
      .update(patch)
      .eq("id", data.bookingId)
      .eq("assigned_worker_id", worker.id)
      .eq("status", "pending");
    if (error) throw new Error(error.message);

    if (data.accept) {
      await supabaseAdmin.from("workers").update({ status: "on_job" }).eq("id", worker.id);
    }
    return { accepted: data.accept };
  });

const JOB_FIELDS =
  "id, reference, customer_name, phone, address, area, service_type, booking_date, time_slot, status, notes, price_min, price_max, created_at";

export const workerActiveJob = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ token: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { requireWorker } = await import("./worker.server");
    const worker = await requireWorker(data.token);

    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .select(JOB_FIELDS)
      .eq("assigned_worker_id", worker.id)
      .in("status", ["assigned", "arrived", "in_progress"])
      .order("booking_date", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return booking;
  });

export const workerJob = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ token: z.string().min(1), id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { requireWorker } = await import("./worker.server");
    const worker = await requireWorker(data.token);

    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .select(JOB_FIELDS)
      .eq("id", data.id)
      .eq("assigned_worker_id", worker.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return booking;
  });

export const advanceJobStatus = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        token: z.string().min(1),
        bookingId: z.string().uuid(),
        next: z.enum(["arrived", "in_progress", "completed"]),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { requireWorker } = await import("./worker.server");
    const worker = await requireWorker(data.token);

    const allowedFrom = {
      arrived: "assigned",
      in_progress: "arrived",
      completed: "in_progress",
    } as const;

    const { data: updated, error } = await supabaseAdmin
      .from("bookings")
      .update({ status: data.next })
      .eq("id", data.bookingId)
      .eq("assigned_worker_id", worker.id)
      .eq("status", allowedFrom[data.next])
      .select("id, status")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!updated) throw new Error("This job was already moved to another stage.");

    if (data.next === "completed") {
      await supabaseAdmin.from("workers").update({ status: "available" }).eq("id", worker.id);
    }
    return updated;
  });

export const workerHistory = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ token: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { requireWorker } = await import("./worker.server");
    const worker = await requireWorker(data.token);

    const { data: rows, error } = await supabaseAdmin
      .from("bookings")
      .select("id, reference, area, service_type, booking_date, time_slot, status, price_min, price_max")
      .eq("assigned_worker_id", worker.id)
      .eq("status", "completed")
      .order("booking_date", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
