"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";
import type { Well } from "@/lib/types";
import { wellColor } from "@/lib/risk";

export type WellMapProps = {
  wells: Well[];
  selected?: Well | null;
  onSelect?: (w: Well) => void;
  /** fit the view to the wells whenever the list changes (company pages) */
  fit?: boolean;
  /** landowner lookup: a search point and radius ring */
  focus?: { lat: number; lon: number; km: number } | null;
};

const ALBERTA: L.LatLngBoundsExpression = [[49, -120], [60, -110]];

// Dots grow as you zoom in, so the province view isn't one solid blob.
function radiusFor(score: number, zoom: number) {
  const k = zoom <= 5 ? 0.45 : zoom <= 7 ? 0.7 : zoom <= 9 ? 1 : zoom <= 11 ? 1.4 : 1.9;
  return (1.4 + score / 25) * k;
}

/**
 * Up to ~91k wells, so markers are drawn on one canvas with plain Leaflet
 * instead of one React component per well.
 */
export default function WellMapInner({ wells, selected, onSelect, fit, focus }: WellMapProps) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const renderer = useRef<L.Canvas | null>(null);
  const highlight = useRef<L.CircleMarker | null>(null);
  const focusLayer = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // create the map once
  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { minZoom: 4, preferCanvas: true, zoomSnap: 0.5 });
    m.fitBounds(ALBERTA);
    // Free basemaps that need no API key: Esri's dark grey canvas first,
    // falling back to standard OpenStreetMap (darkened with CSS) if it fails.
    const esri = L.tileLayer(
      "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      { attribution: "Tiles &copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors", maxZoom: 16 },
    ).addTo(m);
    let failures = 0;
    esri.on("tileerror", () => {
      failures += 1;
      if (failures !== 4) return;
      m.removeLayer(esri);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        className: "osm-dark",
      }).addTo(m);
    });
    renderer.current = L.canvas({ padding: 0.3, tolerance: 5 });
    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []);

  // draw wells
  useEffect(() => {
    const m = map.current;
    if (!m || !renderer.current) return;
    const g = L.layerGroup();
    const markers: { mk: L.CircleMarker; w: Well }[] = [];
    const z = m.getZoom();
    for (let i = wells.length - 1; i >= 0; i--) {
      const w = wells[i]; // list is sorted riskiest-first, so draw it last (on top)
      const mk = L.circleMarker([w.lat, w.lon], {
        renderer: renderer.current,
        radius: radiusFor(w.forecast ? 30 : w.score, z),
        stroke: w.orphan && z >= 8,
        color: "#f1f5f9",
        weight: 0.8,
        fillColor: wellColor(w),
        fillOpacity: 0.85,
      }).on("click", () => onSelectRef.current?.(w));
      mk.addTo(g);
      markers.push({ mk, w });
    }
    g.addTo(m);
    if (fit && wells.length) {
      m.fitBounds(L.latLngBounds(wells.map((w) => [w.lat, w.lon] as [number, number])).pad(0.15), { maxZoom: 11 });
    }
    const onZoom = () => {
      const zoom = m.getZoom();
      for (const { mk, w } of markers) {
        mk.setRadius(radiusFor(w.forecast ? 30 : w.score, zoom));
        mk.setStyle({ stroke: w.orphan && zoom >= 8 });
      }
    };
    m.on("zoomend", onZoom);
    return () => { m.off("zoomend", onZoom); g.remove(); };
  }, [wells, fit]);

  // selected well: ring + fly to it
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    highlight.current?.remove();
    if (!selected) return;
    highlight.current = L.circleMarker([selected.lat, selected.lon], {
      radius: 13, color: "#ffffff", weight: 2, fill: false, interactive: false,
    }).addTo(m);
    m.flyTo([selected.lat, selected.lon], Math.max(m.getZoom(), 11), { duration: 0.9 });
  }, [selected]);

  // landowner search point
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    focusLayer.current?.remove();
    if (!focus) return;
    const g = L.layerGroup([
      L.circle([focus.lat, focus.lon], { radius: focus.km * 1000, color: "#3987e5", weight: 1.5, fillOpacity: 0.06, interactive: false }),
      L.circleMarker([focus.lat, focus.lon], { radius: 6, color: "#0b0d10", weight: 2, fillColor: "#3987e5", fillOpacity: 1, interactive: false }),
    ]).addTo(m);
    focusLayer.current = g;
    m.fitBounds(L.latLng(focus.lat, focus.lon).toBounds(focus.km * 2200), { maxZoom: 13 });
  }, [focus]);

  return <div ref={el} className="h-full w-full" />;
}
