import { createServerFn } from "@tanstack/react-start";

/**
 * Hands the browser-side Google Maps JS key to the client. This key is designed
 * to be public (restrict it by HTTP referrer in the Google Cloud console).
 */
export const getMapsApiKey = createServerFn({ method: "GET" }).handler(async () => {
  return { key: process.env["GOOGLE_MAPS_API_KEY"] ?? null };
});
