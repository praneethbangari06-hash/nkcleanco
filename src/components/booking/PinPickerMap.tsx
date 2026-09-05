import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect, useRef } from "react";

interface Props {
  center: { lat: number; lng: number };
  value: { lat: number; lng: number } | null;
  onChange: (point: { lat: number; lng: number }) => void;
  className?: string;
}

const OSM_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

/** Small interactive map with a draggable pin used to set exact booking coordinates. */
export default function PinPickerMap({ center, value, onChange, className }: Props) {
  const holder = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const pin = useRef<L.Marker | null>(null);
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    if (!holder.current || mapRef.current) return;
    const start = value ?? center;

    const map = L.map(holder.current, {
      center: [start.lat, start.lng],
      zoom: value ? 17 : 14,
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false,
    });
    mapRef.current = map;

    L.tileLayer(OSM_TILES, {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    const marker = L.marker([start.lat, start.lng], {
      draggable: true,
      autoPan: true,
      icon: L.divIcon({
        className: "nk-pin-marker",
        html: '<span class="nk-pin-dot"></span>',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      }),
    }).addTo(map);
    pin.current = marker;

    marker.on("dragend", () => {
      const p = marker.getLatLng();
      cb.current({ lat: p.lat, lng: p.lng });
    });

    map.on("click", (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      cb.current({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    // Report the initial pin position so a coordinate is always stored.
    cb.current({ lat: start.lat, lng: start.lng });

    return () => {
      map.remove();
      mapRef.current = null;
      pin.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow externally-set coordinates (e.g. after "use my location").
  useEffect(() => {
    if (!mapRef.current || !pin.current || !value) return;
    pin.current.setLatLng([value.lat, value.lng]);
    mapRef.current.setView([value.lat, value.lng], 17);
  }, [value?.lat, value?.lng]);

  return (
    <div
      ref={holder}
      className={
        className ?? "h-[240px] w-full overflow-hidden rounded-2xl border border-border shadow-soft"
      }
    />
  );
}
