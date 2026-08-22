import { z } from "zod";

export const BRAND = {
  name: "NK CleanCo",
  tagline: "Home cleaning, done right",
  phone: "+91 98765 43210",
  email: "hello@nkcleanco.in",
  whatsapp: "919876543210",
};

export const SERVICE_AREAS = ["Narsingi", "Kokapet", "Kanapur"] as const;
export type ServiceArea = (typeof SERVICE_AREAS)[number];

/** Approximate centre point for each serviced area (used for map + distance display). */
export const AREA_COORDS: Record<string, { lat: number; lng: number }> = {
  Narsingi: { lat: 17.3894, lng: 78.3517 },
  Kokapet: { lat: 17.399, lng: 78.34 },
  Kanapur: { lat: 17.3612, lng: 78.3305 },
};

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}


export type ServiceId =
  | "home"
  | "deep"
  | "bathroom"
  | "kitchen"
  | "sofa"
  | "office";

export interface ServiceDef {
  id: ServiceId;
  name: string;
  blurb: string;
  detail: string;
  from: number;
  priceMin: number;
  priceMax: number;
  duration: string;
}

export const SERVICES: ServiceDef[] = [
  {
    id: "home",
    name: "Home Cleaning",
    blurb: "Regular top-to-bottom tidy up",
    detail: "Dusting, mopping, bathrooms, kitchen wipe-down for 2BHK & 3BHK homes.",
    from: 899,
    priceMin: 899,
    priceMax: 1499,
    duration: "2–3 hrs",
  },
  {
    id: "deep",
    name: "Home Deep Cleaning",
    blurb: "Full house, machine-assisted",
    detail: "Scrubbing, degreasing, grout, fans, windows and behind-the-furniture cleaning.",
    from: 2999,
    priceMin: 2999,
    priceMax: 5999,
    duration: "5–7 hrs",
  },
  {
    id: "bathroom",
    name: "Bathroom Cleaning",
    blurb: "Hard water stain removal",
    detail: "Tiles, grout, taps, commode and glass descaled with safe chemicals.",
    from: 599,
    priceMin: 599,
    priceMax: 1199,
    duration: "1–2 hrs",
  },
  {
    id: "kitchen",
    name: "Kitchen Cleaning",
    blurb: "Degrease chimney & cabinets",
    detail: "Platform, tiles, cabinet fronts, chimney exterior and appliance wipe-down.",
    from: 999,
    priceMin: 999,
    priceMax: 2199,
    duration: "2–4 hrs",
  },
  {
    id: "sofa",
    name: "Sofa & Carpet Cleaning",
    blurb: "Wet vacuum shampooing",
    detail: "Fabric-safe shampoo and extraction for sofas, mattresses, rugs and carpets.",
    from: 799,
    priceMin: 799,
    priceMax: 2499,
    duration: "1–3 hrs",
  },
  {
    id: "office",
    name: "Office Cleaning",
    blurb: "Before or after work hours",
    detail: "Workstations, cabins, pantry and washrooms on a one-time or weekly plan.",
    from: 1999,
    priceMin: 1999,
    priceMax: 6999,
    duration: "Flexible",
  },
];

export function getService(id: string | null | undefined): ServiceDef | undefined {
  return SERVICES.find((s) => s.id === id);
}

export const TIME_SLOTS = [
  { id: "morning", label: "Morning", window: "8:00 AM – 11:00 AM", hint: "Most popular" },
  { id: "midday", label: "Midday", window: "11:00 AM – 2:00 PM", hint: "Quick availability" },
  { id: "afternoon", label: "Afternoon", window: "2:00 PM – 5:00 PM", hint: "Good for offices" },
  { id: "evening", label: "Evening", window: "5:00 PM – 8:00 PM", hint: "After work hours" },
] as const;

export function slotLabel(id: string) {
  const slot = TIME_SLOTS.find((s) => s.id === id);
  return slot ? `${slot.label} (${slot.window})` : id;
}

export const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export const inr = (value: number) => inrFormatter.format(value);

/* ---------------- validation ---------------- */

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, { message: "Enter a valid 10-digit Indian mobile number" });

export const bookingSchema = z.object({
  serviceType: z.enum(["home", "deep", "bathroom", "kitchen", "sofa", "office"], {
    errorMap: () => ({ message: "Pick a service to continue" }),
  }),
  flat: z
    .string()
    .trim()
    .nonempty({ message: "House / flat number is required" })
    .max(80, { message: "Keep this under 80 characters" }),
  street: z
    .string()
    .trim()
    .nonempty({ message: "Street / locality is required" })
    .max(160, { message: "Keep this under 160 characters" }),
  area: z.enum(SERVICE_AREAS, {
    errorMap: () => ({ message: "Select one of our serviced areas" }),
  }),
  date: z.string().trim().nonempty({ message: "Choose a date" }),
  slot: z.enum(["morning", "midday", "afternoon", "evening"], {
    errorMap: () => ({ message: "Choose a time slot" }),
  }),
  name: z
    .string()
    .trim()
    .min(2, { message: "Please enter your full name" })
    .max(80, { message: "Keep this under 80 characters" }),
  phone: phoneSchema,
  notes: z.string().trim().max(400, { message: "Keep notes under 400 characters" }).optional(),
});

export type BookingInput = z.infer<typeof bookingSchema>;

export interface ConfirmedBooking {
  reference: string;
  customer_name: string;
  phone: string;
  address: string;
  area: string;
  service_type: string;
  booking_date: string;
  time_slot: string;
  price_min: number;
  price_max: number;
}

export const CONFIRMATION_KEY = "nkcleanco:last-booking";

export function todayIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function prettyDate(iso: string) {
  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function newReference() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const byte of bytes) out += REF_ALPHABET[byte % REF_ALPHABET.length];
  return `NK-${out}`;
}
