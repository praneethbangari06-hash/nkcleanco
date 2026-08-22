import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect, useRef } from "react";

interface Props {
  customer: { lat: number; lng: number };
  worker: { lat: number; lng: number } | null;
}

export default function LiveTrackingMap({ customer, worker }: Props) {
  const holder = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const workerMarker = useRef<L.Marker | null>(null);

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

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    L.circleMarker([customer.lat, customer.lng], {
      radius: 8,
      color: "#ffffff",
      weight: 3,
      fillColor: "#0f766e",
      fillOpacity: 1,
    })
      .addTo(map)
      .bindTooltip("Your address");

    return () => {
      map.remove();
      mapRef.current = null;
      workerMarker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Move the live dot whenever a fresh worker position arrives.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !worker) return;

    if (!workerMarker.current) {
      workerMarker.current = L.marker([worker.lat, worker.lng], {
        icon: L.divIcon({
          className: "nk-live-marker",
          html: '<span class="nk-live-dot"></span>',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        }),
        title: "Cleaner",
      }).addTo(map);
    } else {
      workerMarker.current.setLatLng([worker.lat, worker.lng]);
    }

    map.fitBounds(
      L.latLngBounds([customer.lat, customer.lng], [worker.lat, worker.lng]),
      { padding: [48, 48], maxZoom: 16 },
    );
  }, [worker?.lat, worker?.lng, customer.lat, customer.lng]);

  return (
    <div
      ref={holder}
      className="h-[260px] w-full overflow-hidden rounded-2xl border border-border sm:h-[300px]"
    />
  );
}
