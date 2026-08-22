import { useEffect, useState } from "react";

export const WORKER_TOKEN_KEY = "nkcleanco:worker-token";

export function readWorkerToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(WORKER_TOKEN_KEY);
}

export function storeWorkerToken(token: string) {
  window.localStorage.setItem(WORKER_TOKEN_KEY, token);
}

export function clearWorkerToken() {
  window.localStorage.removeItem(WORKER_TOKEN_KEY);
}

/** Reads the worker token after hydration. `undefined` while still loading. */
export function useWorkerToken() {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    setToken(readWorkerToken());
  }, []);
  return token;
}

export const JOB_STAGES = [
  { status: "assigned", label: "Assigned" },
  { status: "arrived", label: "Arrived" },
  { status: "in_progress", label: "In Progress" },
  { status: "completed", label: "Completed" },
] as const;

export const NEXT_ACTION: Record<string, { next: "arrived" | "in_progress" | "completed"; label: string }> = {
  assigned: { next: "arrived", label: "Mark as Arrived" },
  arrived: { next: "in_progress", label: "Start Cleaning" },
  in_progress: { next: "completed", label: "Mark as Completed" },
};

export function requestGeolocation(): Promise<{ lat: number; lng: number } | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 6000 },
    );
  });
}
