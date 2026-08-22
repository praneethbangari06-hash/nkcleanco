/**
 * Server-only helpers for the worker app: password hashing, session tokens and
 * distance maths. Never import this from a component.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ITERATIONS = 100_000;
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

const enc = new TextEncoder();

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function base64url(input: string) {
  return btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(input: string) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  return atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function pbkdf2(password: string, salt: string, iterations: number) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations },
    key,
    256,
  );
  return toHex(bits);
}

export async function hashPassword(password: string) {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  const hash = await pbkdf2(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${salt}$${hash}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, iterations, salt, hash] = stored.split("$");
  if (scheme !== "pbkdf2" || !iterations || !salt || !hash) return false;
  const candidate = await pbkdf2(password, salt, Number(iterations));
  return timingSafeEqual(candidate, hash);
}

/* ------------------------- session tokens ------------------------- */

function sessionSecret() {
  const secret = process.env["WORKER_SESSION_SECRET"];
  if (!secret) throw new Error("WORKER_SESSION_SECRET is not configured");
  return secret;
}

async function sign(payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
}

export async function createWorkerToken(workerId: string) {
  const body = base64url(JSON.stringify({ wid: workerId, exp: Date.now() + TOKEN_TTL_MS }));
  return `${body}.${await sign(body)}`;
}

export async function workerIdFromToken(token: string): Promise<string> {
  const [body, signature] = token.split(".");
  if (!body || !signature) throw new Error("Unauthorized");
  if (!timingSafeEqual(await sign(body), signature)) throw new Error("Unauthorized");
  const payload = JSON.parse(fromBase64url(body)) as { wid?: string; exp?: number };
  if (!payload.wid || !payload.exp || payload.exp < Date.now()) throw new Error("Unauthorized");
  return payload.wid;
}

export interface WorkerProfile {
  id: string;
  name: string;
  phone: string;
  is_online: boolean;
  status: string;
}

export async function requireWorker(token: string): Promise<WorkerProfile> {
  const workerId = await workerIdFromToken(token);
  const { data, error } = await supabaseAdmin
    .from("workers")
    .select("id, name, phone, is_online, status")
    .eq("id", workerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Unauthorized");
  return data as WorkerProfile;
}

/* ------------------------- distance ------------------------- */

const AREA_COORDS: Record<string, { lat: number; lng: number }> = {
  Narsingi: { lat: 17.3894, lng: 78.3517 },
  Kokapet: { lat: 17.399, lng: 78.34 },
  Kanapur: { lat: 17.3612, lng: 78.3305 },
};

export function distanceKm(
  destination: { area: string; lat?: number | null; lng?: number | null },
  lat: number | null | undefined,
  lng: number | null | undefined,
): number | null {
  const target =
    destination.lat != null && destination.lng != null
      ? { lat: destination.lat, lng: destination.lng }
      : AREA_COORDS[destination.area];
  if (!target || lat == null || lng == null) return null;
  const R = 6371;
  const dLat = ((target.lat - lat) * Math.PI) / 180;
  const dLng = ((target.lng - lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat * Math.PI) / 180) * Math.cos((target.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)) * 10) / 10;
}
