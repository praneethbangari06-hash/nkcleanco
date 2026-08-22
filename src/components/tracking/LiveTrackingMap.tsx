import "leaflet/dist/leaflet.css";

import L from "leaflet";
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

const CARTO_TILES =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

export default function LiveTrackingMap({
  customer,
  worker,
  customerLabel = "Your address",
  workerLabel = "Cleaner",
  onRouteDistance,
  className,
}: Props) {
  const holder = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const workerMarker = useRef<L.Marker | null>(null);
  const routeLine = useRef<L.Polyline | null>(null);
  const distanceCb = useRef(onRouteDistance);
  distanceCb.current = onRouteDistance;

  useEffect(() => {
    if (!holder.current || mapRef.current) return;

    const map = L.map(holder.current, {
      center: [customer.lat, customer.lng],
      zoom: 14,
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false,
    });
    mapRef.current = map;

    L.tileLayer(CARTO_TILES, {
      maxZoom: 20,
      subdomains: "abcd",
      attribution: "© OpenStreetMap contributors, © CARTO",
    }).addTo(map);

    L.circleMarker([customer.lat, customer.lng], {
      radius: 8,
      color: "#ffffff",
      weight: 3,
      fillColor: "#0f766e",
      fillOpacity: 1,
    })
      .addTo(map)
      .bindTooltip(customerLabel);

    return () => {
      map.remove();
      mapRef.current = null;
      workerMarker.current = null;
      routeLine.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Move the live dot + refresh the driving route whenever a fresh position arrives.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !worker) return;
    let cancelled = false;

    if (!workerMarker.current) {
      workerMarker.current = L.marker([worker.lat, worker.lng], {
        icon: L.divIcon({
          className: "nk-live-marker",
          html: '<span class="nk-live-dot"></span>',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        }),
        title: workerLabel,
      }).addTo(map);
    } else {
      workerMarker.current.setLatLng([worker.lat, worker.lng]);
    }

    const straightBounds = L.latLngBounds(
      [customer.lat, customer.lng],
      [worker.lat, worker.lng],
    );
    map.fitBounds(straightBounds, { padding: [48, 48], maxZoom: 16 });

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

        const latlngs = route.geometry.coordinates.map(
          ([lng, lat]) => [lat, lng] as [number, number],
        );
        if (routeLine.current) {
          routeLine.current.setLatLngs(latlngs);
        } else {
          routeLine.current = L.polyline(latlngs, {
            color: "#0f766e",
            weight: 5,
            opacity: 0.75,
            lineJoin: "round",
          }).addTo(mapRef.current);
        }
        mapRef.current.fitBounds(routeLine.current.getBounds(), {
          padding: [40, 40],
          maxZoom: 16,
        });
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
      ref={holder}
      className={
        className ??
        "h-[260px] w-full overflow-hidden rounded-2xl border border-border sm:h-[300px]"
      }
    />
  );
}
