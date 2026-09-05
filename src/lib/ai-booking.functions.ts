import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const input = z.object({
  text: z.string().trim().min(3).max(400),
  today: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const SERVICE_MAP: Record<string, string> = {
  "Home Cleaning": "home",
  "Home Deep Cleaning": "deep",
  "Bathroom Cleaning": "bathroom",
  "Kitchen Cleaning": "kitchen",
  "Sofa & Carpet Cleaning": "sofa",
  "Office Cleaning": "office",
};

const SLOTS = new Set(["morning", "midday", "afternoon", "evening"]);

export type ParsedRequest = {
  serviceType: string | null;
  date: string | null;
  slot: string | null;
  complete: boolean;
};

export const parseBookingRequest = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => input.parse(data))
  .handler(async ({ data }): Promise<ParsedRequest> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { serviceType: null, date: null, slot: null, complete: false };

    const system = [
      `Today's date is ${data.today} (Asia/Kolkata).`,
      "You extract booking details from a customer's message for a home cleaning company.",
      "service must be exactly one of: Home Cleaning, Home Deep Cleaning, Bathroom Cleaning, Kitchen Cleaning, Sofa & Carpet Cleaning, Office Cleaning — or null if unclear.",
      "date must be an ISO calendar date (YYYY-MM-DD), resolving relative wording like 'this Saturday' or 'tomorrow' against today's date, never in the past — or null if unclear.",
      "slot must be one of: morning (8-11AM), midday (11AM-2PM), afternoon (2-5PM), evening (5-8PM). Pick the closest match; use morning if unclear.",
      'Reply with JSON only: {"service": string|null, "date": string|null, "slot": string}',
    ].join(" ");

    let raw = "";
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: data.text },
          ],
        }),
      });
      if (!res.ok) throw new Error(`AI gateway ${res.status}`);
      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      raw = json.choices?.[0]?.message?.content ?? "";
    } catch {
      return { serviceType: null, date: null, slot: null, complete: false };
    }

    let parsed: { service?: unknown; date?: unknown; slot?: unknown } = {};
    try {
      parsed = JSON.parse(raw.replace(/^```(?:json)?|```$/g, "").trim());
    } catch {
      return { serviceType: null, date: null, slot: null, complete: false };
    }

    const serviceName = typeof parsed.service === "string" ? parsed.service.trim() : "";
    const serviceType = SERVICE_MAP[serviceName] ?? null;

    const dateStr = typeof parsed.date === "string" ? parsed.date.trim() : "";
    const date = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && dateStr >= data.today ? dateStr : null;

    const slotStr = typeof parsed.slot === "string" ? parsed.slot.trim().toLowerCase() : "";
    const slot = SLOTS.has(slotStr) ? slotStr : "morning";

    return { serviceType, date, slot, complete: Boolean(serviceType && date) };
  });
