import "maplibre-gl/dist/maplibre-gl.css";

import * as maplibregl from "maplibre-gl";
import { useEffect, useRef } from "react";

interface Props {
  customer: { lat: number; lng: number };
  worker: { lat: number; lng: number } | null;
  customerLabel?: string;
  workerLabel?: string;
  /** Called with the road distance (km) each time a route is fetched. */
  onRouteDistance?: (km: number | null) => void;
  className?: string;
}

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const TEAL = "#0f766e";

const EMPTY_LINE = {
  type: "FeatureCollection" as const,
  features: [] as GeoJSON.Feature[],
};

function lineFeature(coords: [number, number][]): GeoJSON.FeatureCollection {
  if (coords.length < 2) return EMPTY_LINE;
  return {
    type: "FeatureCollection",
    features: [
      { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } },
    ],
  };
}

function destPinEl(): HTMLElement {
  const el = document.createElement("div");
  el.className = "nk-dest-marker";
  el.innerHTML =
    '<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">' +
    '<path fill="#1e293b" stroke="#ffffff" stroke-width="1.4" d="M12 1.8c-4 0-7.2 3.2-7.2 7.2 0 5.3 7.2 13.2 7.2 13.2s7.2-7.9 7.2-13.2c0-4-3.2-7.2-7.2-7.2z"/>' +
    '<circle cx="12" cy="9" r="2.6" fill="#ffffff"/></svg>';
  return el;
}

function liveDotEl(): HTMLElement {
  const el = document.createElement("div");
  el.className = "nk-live-marker";
  el.innerHTML = '<span class="nk-live-dot"></span>';
  return el;
}

export default function LiveTrackingMap({
  customer,
  worker,
  customerLabel = "Your address",
  workerLabel = "Cleaner",
  onRouteDistance,
  className,
}: Props) {
  const holder = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const readyRef = useRef(false);
  const workerMarker = useRef<maplibregl.Marker | null>(null);
  const animRef = useRef<number | null>(null);
  const travelled = useRef<[number, number][]>([]);
  const didFit = useRef(false);
  const distanceCb = useRef(onRouteDistance);
  distanceCb.current = onRouteDistance;

  useEffect(() => {
    if (!holder.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: holder.current,
      style: STYLE_URL,
      center: [customer.lng, customer.lat],
      zoom: 13,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.scrollZoom.disable();

    new maplibregl.Marker({ element: destPinEl(), anchor: "bottom" })
      .setLngLat([customer.lng, customer.lat])
      .setPopup(new maplibregl.Popup({ offset: 18 }).setText(customerLabel))
      .addTo(map);

    map.on("load", () => {
      map.addSource("route-remaining", { type: "geojson", data: EMPTY_LINE });
      map.addSource("route-covered", { type: "geojson", data: EMPTY_LINE });

      map.addLayer({
        id: "route-remaining-line",
        type: "line",
        source: "route-remaining",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": TEAL,
          "line-width": 4,
          "line-opacity": 0.4,
          "line-dasharray": [1.6, 1.6],
        },
      });
      map.addLayer({
        id: "route-covered-line",
        type: "line",
        source: "route-covered",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": TEAL, "line-width": 4, "line-opacity": 0.95 },
      });
      readyRef.current = true;
    });

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
      workerMarker.current = null;
      travelled.current = [];
      didFit.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Move the live dot + refresh the driving route whenever a fresh position arrives.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !worker) return;
    let cancelled = false;

    const target: [number, number] = [worker.lng, worker.lat];

    if (!workerMarker.current) {
      workerMarker.current = new maplibregl.Marker({ element: liveDotEl() })
        .setLngLat(target)
        .setPopup(new maplibregl.Popup({ offset: 14 }).setText(workerLabel))
        .addTo(map);
    } else {
      // Smoothly interpolate from the previous position over ~1s.
      const from = workerMarker.current.getLngLat();
      const start = performance.now();
      const duration = 1000;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = t * (2 - t);
        workerMarker.current?.setLngLat([
          from.lng + (target[0] - from.lng) * eased,
          from.lat + (target[1] - from.lat) * eased,
        ]);
        if (t < 1) animRef.current = requestAnimationFrame(step);
      };
      animRef.current = requestAnimationFrame(step);
    }

    // Track the path already covered so progress is visible.
    const last = travelled.current[travelled.current.length - 1];
    if (!last || last[0] !== target[0] || last[1] !== target[1]) {
      travelled.current = [...travelled.current, target].slice(-500);
    }
    const setData = (id: string, data: GeoJSON.FeatureCollection) => {
      const src = map.getSource(id) as maplibregl.GeoJSONSource | undefined;
      src?.setData(data);
    };
    if (readyRef.current) setData("route-covered", lineFeature(travelled.current));

    if (!didFit.current) {
      const bounds = new maplibregl.LngLatBounds(target, [customer.lng, customer.lat]);
      map.fitBounds(bounds, { padding: 56, maxZoom: 16, duration: 0 });
      didFit.current = true;
    }

    const fetchRoute = async () => {
      try {
        const url =
          `https://router.project-osrm.org/route/v1/driving/` +
          `${worker.lng},${worker.lat};${customer.lng},${customer.lat}` +
          `?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("route unavailable");
        const json = (await res.json()) as {
          routes?: { distance: number; geometry: { coordinates: [number, number][] } }[];
        };
        const route = json.routes?.[0];
        if (cancelled || !route || !mapRef.current) return;

        const coords = route.geometry.coordinates;
        if (readyRef.current) {
          setData("route-remaining", lineFeature(coords));
          setData("route-covered", lineFeature(travelled.current));
        }
        const bounds = coords.reduce(
          (b, c) => b.extend(c),
          new maplibregl.LngLatBounds(coords[0], coords[0]),
        );
        mapRef.current.fitBounds(bounds, { padding: 48, maxZoom: 16 });
        distanceCb.current?.(Math.round((route.distance / 1000) * 10) / 10);
      } catch {
        if (!cancelled) distanceCb.current?.(null);
      }
    };

    void fetchRoute();
    return () => {
      cancelled = true;
    };
  }, [worker?.lat, worker?.lng, customer.lat, customer.lng, workerLabel]);

  return (
    <div
      className={
        className ??
        "relative h-[260px] w-full overflow-hidden rounded-2xl border border-border sm:h-[300px]"
      }
    >
      {/* maplibre-gl.css forces .maplibregl-map to position:relative, which cancels
          absolute/inset-0 — size the holder explicitly instead. */}
      <div ref={holder} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      <p className="pointer-events-none absolute bottom-1 right-1 z-10 rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
        OpenFreeMap © OpenMapTiles Data from OpenStreetMap
      </p>
    </div>
  );
}
