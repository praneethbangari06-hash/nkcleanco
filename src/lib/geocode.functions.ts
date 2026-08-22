import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  flat: z.string().trim().max(120),
  street: z.string().trim().max(160),
  area: z.string().trim().max(60),
});

/** Hyderabad centre — used to sanity-check that a match is actually in the city. */
const CITY = { lat: 17.385, lng: 78.4867 };
const MAX_KM = 45;

function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function lookup(query: string): Promise<{ lat: number; lng: number } | null> {
  const url =
    "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in" +
    // Bias results to the Hyderabad south-west corridor we serve.
    "&viewbox=78.20,17.55,78.65,17.20" +
    `&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "NKCleanCo/1.0 (booking geocoder)", Accept: "application/json" },
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as Array<{ lat?: string; lon?: string }>;
  const hit = rows[0];
  if (!hit?.lat || !hit?.lon) return null;
  const lat = Number(hit.lat);
  const lng = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (km(CITY, { lat, lng }) > MAX_KM) return null;
  return { lat, lng };
}

/**
 * Turns a typed address into precise coordinates using OpenStreetMap Nominatim
 * (free, no API key). Progressively broadens the query, and returns null when
 * nothing matches so callers can fall back to the area centre point.
 */
export const geocodeAddress = createServerFn({ method: "POST" })
  .inputValidator((data) => schema.parse(data))
  .handler(async ({ data }) => {
    const candidates = [
      `${data.flat}, ${data.street}, ${data.area}, Hyderabad, Telangana, India`,
      `${data.street}, ${data.area}, Hyderabad, Telangana`,
      `${data.street}, ${data.area}, Hyderabad`,
      `${data.street}, Hyderabad`,
      `${data.area}, Hyderabad`,
    ];

    for (const query of candidates) {
      try {
        const point = await lookup(query);
        if (point) return point;
      } catch {
        /* try the next, broader query */
      }
    }

    return null;
  });

const reverseSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/** Turns GPS coordinates into a readable address using Nominatim reverse lookup. */
export const reverseGeocode = createServerFn({ method: "POST" })
  .inputValidator((data) => reverseSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const url =
        "https://nominatim.openstreetmap.org/reverse?format=json&zoom=18&addressdetails=1" +
        `&lat=${data.lat}&lon=${data.lng}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "NKCleanCo/1.0 (booking geocoder)", Accept: "application/json" },
      });
      if (!res.ok) return null;
      const json = (await res.json()) as {
        display_name?: string;
        address?: Record<string, string>;
      };
      const a = json.address ?? {};
      const house = [a["house_number"], a["house_name"], a["building"]]
        .filter(Boolean)
        .join(" ")
        .trim();
      const street = [a["road"], a["neighbourhood"], a["suburb"]]
        .filter(Boolean)
        .join(", ")
        .trim();
      return {
        display: json.display_name ?? "",
        flat: house,
        street: street || (json.display_name ?? "").split(",").slice(0, 2).join(",").trim(),
        suburb: a["suburb"] ?? a["neighbourhood"] ?? "",
      };
    } catch {
      return null;
    }
  });
