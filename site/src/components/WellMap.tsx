"use client";
import dynamic from "next/dynamic";

// Leaflet touches `window` when it loads, so the map only renders in the browser.
const WellMap = dynamic(() => import("./WellMapInner"), {
  ssr: false,
  loading: () => <div className="grid h-full w-full place-items-center text-sm text-ink-3">Loading map…</div>,
});

export default WellMap;
export type { WellMapProps } from "./WellMapInner";
