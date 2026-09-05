import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const phoneSchema = z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number");
const passwordSchema = z.string().min(6, "Use at least 6 characters").max(72);

async function assertAdmin(context: { supabase: unknown; userId: string }) {
  const supabase = context.supabase as {
    from: (table: string) => {
      select: (cols: string) => {
        eq: (
          col: string,
          value: string,
        ) => {
          eq: (
            col: string,
            value: string,
          ) => { maybeSingle: () => Promise<{ data: unknown }> };
        };
      };
    };
  };
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden");
}

export const listWorkers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("workers")
      .select("id, name, phone, is_online, is_active, status, created_at, last_location_update")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createWorker = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        name: z.string().trim().min(2, "Enter the cleaner's name").max(80),
        phone: phoneSchema,
        password: passwordSchema,
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { hashPassword } = await import("./worker.server");

    const { data: existing } = await supabaseAdmin
      .from("workers")
      .select("id")
      .eq("phone", data.phone)
      .maybeSingle();
    if (existing) {
      return { ok: false as const, message: "A cleaner with this phone number already exists." };
    }

    const { data: created, error } = await supabaseAdmin
      .from("workers")
      .insert({
        name: data.name,
        phone: data.phone,
        is_online: false,
        is_active: true,
        status: "offline",
      })
      .select("id, name, phone")
      .single();
    if (error) throw new Error(error.message);

    const { error: credError } = await supabaseAdmin
      .from("cleaner_credentials")
      .insert({ worker_id: created.id, password_hash: await hashPassword(data.password) });
    if (credError) {
      await supabaseAdmin.from("workers").delete().eq("id", created.id);
      throw new Error(credError.message);
    }
    return { ok: true as const, worker: created };
  });

export const updateWorker = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().trim().min(2).max(80).optional(),
        phone: phoneSchema.optional(),
        isActive: z.boolean().optional(),
        password: passwordSchema.optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const patch: {
      name?: string;
      phone?: string;
      is_active?: boolean;
      is_online?: boolean;
      status?: string;
    } = {};
    if (data.name) patch.name = data.name;
    if (data.phone) {
      const { data: clash } = await supabaseAdmin
        .from("workers")
        .select("id")
        .eq("phone", data.phone)
        .neq("id", data.id)
        .maybeSingle();
      if (clash) return { ok: false as const, message: "Another cleaner already uses this phone number." };
      patch.phone = data.phone;
    }
    if (data.isActive != null) {
      patch.is_active = data.isActive;
      if (!data.isActive) {
        patch.is_online = false;
        patch.status = "offline";
      }
    }
    if (data.password) {
      const { hashPassword } = await import("./worker.server");
      const { error: credError } = await supabaseAdmin
        .from("cleaner_credentials")
        .upsert(
          { worker_id: data.id, password_hash: await hashPassword(data.password) },
          { onConflict: "worker_id" },
        );
      if (credError) throw new Error(credError.message);
    }
    if (Object.keys(patch).length === 0) return { ok: true };

    const { error } = await supabaseAdmin.from("workers").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
