import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  flat: z.string().trim().max(120),
  street: z.string().trim().max(160),
  area: z.string().trim().max(60),
});

/**
 * Turns a typed address into precise coordinates using OpenStreetMap Nominatim
 * (free, no API key). Returns null when nothing matches so callers can fall back
 * to the area centre point.
 */
export const geocodeAddress = createServerFn({ method: "POST" })
  .inputValidator((data) => schema.parse(data))
  .handler(async ({ data }) => {
    const candidates = [
      `${data.flat}, ${data.street}, ${data.area}, Hyderabad, Telangana, India`,
      `${data.street}, ${data.area}, Hyderabad, Telangana, India`,
      `${data.area}, Hyderabad, Telangana, India`,
    ];

    for (const query of candidates) {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
        const res = await fetch(url, {
          headers: {
            "User-Agent": "NKCleanCo/1.0 (booking geocoder)",
            Accept: "application/json",
          },
        });
        if (!res.ok) continue;
        const rows = (await res.json()) as Array<{ lat?: string; lon?: string }>;
        const hit = rows[0];
        if (!hit?.lat || !hit?.lon) continue;
        const lat = Number(hit.lat);
        const lng = Number(hit.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        return { lat, lng };
      } catch {
        /* try the next, broader query */
      }
    }

    return null;
  });
