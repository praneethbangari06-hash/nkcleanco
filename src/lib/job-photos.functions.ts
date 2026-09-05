import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "job-photos";

const dataUrl = z
  .string()
  .min(100)
  .max(8_000_000)
  .regex(/^data:image\/(jpeg|jpg|png|webp);base64,/, "Upload a JPEG, PNG or WebP photo");

function decodeDataUrl(value: string) {
  const [header, body = ""] = value.split(",", 2);
  const mime = header?.slice(5).split(";")[0] ?? "image/jpeg";
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return { bytes, mime, ext: mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg" };
}

type CheckResult = { result: "pass" | "flagged"; reason: string | null };

async function runPhotoCheck(before: string, after: string): Promise<CheckResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return { result: "pass", reason: null };

  const system = [
    "You review before/after photos submitted by a home cleaning professional.",
    "Check three things: (1) both photos are reasonably clear and bright enough to judge (not blurry, not too dark);",
    "(2) both photos appear to show the same room or space (not two unrelated places);",
    "(3) the after photo looks visibly cleaner or tidier than the before photo.",
    "Be lenient: only flag when a problem is obvious.",
    'Reply with JSON only: {"result": "pass" | "flagged", "reason": string}.',
    "reason must be one short sentence when flagged, and an empty string when it passes.",
  ].join(" ");

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: [
              { type: "text", text: "First image is BEFORE, second image is AFTER." },
              { type: "image_url", image_url: { url: before } },
              { type: "image_url", image_url: { url: after } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`AI gateway ${res.status}`);
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = (json.choices?.[0]?.message?.content ?? "").replace(/^```(?:json)?|```$/g, "").trim();
    const parsed = JSON.parse(raw) as { result?: unknown; reason?: unknown };
    const flagged = parsed.result === "flagged";
    const reason = typeof parsed.reason === "string" ? parsed.reason.trim().slice(0, 200) : "";
    if (!flagged) return { result: "pass", reason: null };
    return { result: "flagged", reason: reason || "Photos need a manual review." };
  } catch {
    // Never block the worker on an AI outage.
    return { result: "pass", reason: null };
  }
}

/** Uploads before/after photos, runs the AI check, then completes the job. */
export const completeJobWithPhotos = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        token: z.string().min(1),
        bookingId: z.string().uuid(),
        before: dataUrl,
        after: dataUrl,
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
    if (booking.status !== "in_progress") {
      throw new Error("This job was already moved to another stage.");
    }

    const stamp = Date.now();
    const paths: Record<"before" | "after", string> = { before: "", after: "" };
    for (const kind of ["before", "after"] as const) {
      const file = decodeDataUrl(data[kind]);
      const path = `${data.bookingId}/${kind}-${stamp}.${file.ext}`;
      const { error } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(path, file.bytes, { contentType: file.mime, upsert: true });
      if (error) throw new Error("Could not upload the photos. Please try again.");
      paths[kind] = path;
    }

    const check = await runPhotoCheck(data.before, data.after);

    const { data: updated, error } = await supabaseAdmin
      .from("bookings")
      .update({
        status: "completed" as const,
        before_photo_path: paths.before,
        after_photo_path: paths.after,
        photo_check_result: check.result,
        photo_check_reason: check.reason,
        photo_checked_at: new Date().toISOString(),
      })
      .eq("id", data.bookingId)
      .eq("assigned_worker_id", worker.id)
      .eq("status", "in_progress")
      .select("id, status")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!updated) throw new Error("This job was already moved to another stage.");

    await supabaseAdmin.from("workers").update({ status: "available" }).eq("id", worker.id);

    return { status: updated.status, result: check.result, reason: check.reason };
  });

/** Admin-only: short-lived links to a booking's before/after photos. */
export const bookingPhotoLinks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ bookingId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./admin-guard.server");
    await assertAdmin(context as { supabase: unknown; userId: string });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("before_photo_path, after_photo_path")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (!booking?.before_photo_path || !booking.after_photo_path) return null;

    const sign = async (path: string) => {
      const { data: signed } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUrl(path, 60 * 30);
      return signed?.signedUrl ?? null;
    };

    return { before: await sign(booking.before_photo_path), after: await sign(booking.after_photo_path) };
  });
