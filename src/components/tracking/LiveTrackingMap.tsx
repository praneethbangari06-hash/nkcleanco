import { useEffect, useRef, useState } from "react";

import { getMapsApiKey } from "@/lib/maps.functions";

declare global {
  interface Window {
    google?: any;
    __nkMapsLoader__?: Promise<void>;
  }
}

const LIGHT_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#f7f9fa" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6b7a83" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#e6ebee" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#fdfdfd" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#d9ecf2" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#f2f6f7" }] },
];

function loadMaps(key: string) {
  if (window.google?.maps) return Promise.resolve();
  if (window.__nkMapsLoader__) return window.__nkMapsLoader__;
  window.__nkMapsLoader__ = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=marker`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
  return window.__nkMapsLoader__;
}

interface Props {
  customer: { lat: number; lng: number };
  worker: { lat: number; lng: number } | null;
}

export default function LiveTrackingMap({ customer, worker }: Props) {
  const holder = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const workerOverlay = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const { key } = await getMapsApiKey();
        if (!key) throw new Error("Map is not configured yet");
        await loadMaps(key);
        if (cancelled || !holder.current) return;

        const google = window.google;
        const map = new google.maps.Map(holder.current, {
          center: customer,
          zoom: 14,
          styles: LIGHT_STYLE,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "cooperative",
        });
        mapRef.current = map;

        new google.maps.Marker({
          position: customer,
          map,
          title: "Your address",
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#0f766e",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 3,
          },
        });

        // Pulsing "live" dot for the cleaner, drawn as a DOM overlay.
        class LiveDot extends google.maps.OverlayView {
          position: any;
          div: HTMLDivElement | null = null;
          constructor(position: any) {
            super();
            this.position = position;
          }
          onAdd() {
            const div = document.createElement("div");
            div.className = "nk-live-dot";
            this.div = div;
            (this as any)["getPanes"]().overlayMouseTarget.appendChild(div);
          }
          draw() {
            if (!this.div) return;
            const point = (this as any)["getProjection"]().fromLatLngToDivPixel(this.position);
            if (!point) return;
            this.div.style.left = `${point.x}px`;
            this.div.style.top = `${point.y}px`;
          }
          setPosition(position: any) {
            this.position = position;
            this.draw();
          }
          onRemove() {
            this.div?.remove();
            this.div = null;
          }
        }

        if (worker) {
          const overlay = new LiveDot(new google.maps.LatLng(worker.lat, worker.lng));
          (overlay as any)["setMap"](map);
          workerOverlay.current = overlay;
          const bounds = new google.maps.LatLngBounds();
          bounds.extend(customer);
          bounds.extend(worker);
          map.fitBounds(bounds, 64);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Map unavailable");
      }
    };

    void init();
    return () => {
      cancelled = true;
      workerOverlay.current?.["setMap"]?.(null);
      workerOverlay.current = null;
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Move the live dot whenever a fresh worker position arrives.
  useEffect(() => {
    const google = window.google;
    const map = mapRef.current;
    if (!google || !map || !worker) return;
    const latLng = new google.maps.LatLng(worker.lat, worker.lng);
    if (workerOverlay.current) {
      workerOverlay.current.setPosition(latLng);
    }
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(customer);
    bounds.extend(latLng);
    map.fitBounds(bounds, 64);
  }, [worker?.lat, worker?.lng, customer.lat, customer.lng]);

  if (error) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-2xl border border-border bg-muted/40 text-sm text-muted-foreground">
        {error}
      </div>
    );
  }

  return <div ref={holder} className="h-[260px] w-full rounded-2xl sm:h-[300px]" />;
}
