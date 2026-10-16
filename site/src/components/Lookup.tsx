"use client";
import { useMemo, useState } from "react";
import WellMap from "./WellMap";
import WellDetail, { WellChips } from "./WellDetail";
import { useWells } from "@/lib/useWells";
import { distanceKm, parseLocation, type Parsed } from "@/lib/dls";
import type { Well } from "@/lib/types";
import { riskColor } from "@/lib/risk";
import { fmt } from "@/lib/format";

const RADII = [2, 5, 10, 25];
const EXAMPLES = ["7-21-57-21W4", "21-57-21W4", "45-23W4", "52.27, -113.81"];

export default function Lookup() {
  const { wells } = useWells();
  const [input, setInput] = useState("");
  const [point, setPoint] = useState<Parsed | null>(null);
  const [km, setKm] = useState(5);
  const [err, setErr] = useState("");
  const [selected, setSelected] = useState<Well | null>(null);

  const search = (value: string) => {
    setInput(value);
    const p = parseLocation(value);
    if (!p) {
      setErr("Couldn't read that. Try a legal land description like 7-21-57-21W4, a section like 21-57-21W4, or lat, lon.");
      return;
    }
    setErr("");
    setSelected(null);
    setPoint(p);
  };

  const locate = () => {
    if (!navigator.geolocation) return setErr("Your browser doesn't support location.");
    navigator.geolocation.getCurrentPosition(
      (pos) => search(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`),
      () => setErr("Location permission was denied."),
    );
  };

  const nearby = useMemo(() => {
    if (!wells || !point) return [];
    // cheap bounding box first, then exact distance
    const dLat = km / 111;
    const dLon = km / (111 * Math.cos((point.lat * Math.PI) / 180));
    return wells
      .filter((w) => Math.abs(w.lat - point.lat) <= dLat && Math.abs(w.lon - point.lon) <= dLon)
      .map((w) => ({ w, d: distanceKm(point.lat, point.lon, w.lat, w.lon) }))
      .filter((x) => x.d <= km)
      .sort((a, b) => a.d - b.d);
  }, [wells, point, km]);

  const counts = {
    orphan: nearby.filter((x) => x.w.orphan).length,
    overdue: nearby.filter((x) => x.w.overdue).length,
    sour: nearby.filter((x) => x.w.sour).length,
  };
  const mapWells = useMemo(() => nearby.map((x) => x.w).sort((a, b) => b.score - a.score), [nearby]);
  const focus = useMemo(() => (point ? { lat: point.lat, lon: point.lon, km } : null), [point, km]);

  return (
    <div className="mt-8 grid gap-5 lg:grid-cols-[400px_1fr]">
      <div className="space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            search(input);
          }}
          className="rounded-xl border border-line bg-panel p-4"
        >
          <label htmlFor="loc" className="text-sm font-medium">
            Your land location
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="loc"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. 7-21-57-21W4"
              className="num min-w-0 flex-1 rounded-md border border-line bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-ink-3 focus:border-white/30"
            />
            <button className="rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-white hover:brightness-110">Search</button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-ink-3">
            Try:
            {EXAMPLES.map((e) => (
              <button type="button" key={e} onClick={() => search(e)} className="num rounded border border-line px-1.5 py-0.5 hover:text-ink">
                {e}
              </button>
            ))}
            <button type="button" onClick={locate} className="rounded border border-line px-1.5 py-0.5 hover:text-ink">
              Use my location
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="text-ink-2">Radius</span>
            {RADII.map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => setKm(r)}
                className={`num rounded-md border px-2 py-0.5 text-xs ${km === r ? "border-white/40 bg-white/10" : "border-line text-ink-2"}`}
              >
                {r} km
              </button>
            ))}
          </div>
          {err && <p className="mt-3 text-sm text-red-300">{err}</p>}
        </form>

        {point && wells && (
          <div className="rounded-xl border border-line bg-panel p-4">
            <div className="text-sm text-ink-2">
              Within {km} km of <span className="num text-ink">{point.label}</span>{" "}
              <span className="text-ink-3">({point.level === "Coordinates" ? "coordinates" : `${point.level} centre`})</span>
            </div>
            <div className="num mt-1 text-3xl">{fmt(nearby.length)}</div>
            <div className="text-sm text-ink-2">inactive or orphaned wells</div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                ["Orphaned", counts.orphan],
                ["Overdue", counts.overdue],
                ["Sour gas", counts.sour],
              ].map(([l, v]) => (
                <div key={l as string} className="rounded-lg bg-black/30 py-2">
                  <div className="num text-lg">{v}</div>
                  <div className="text-[11px] text-ink-3">{l}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selected && <WellDetail w={selected} onClose={() => setSelected(null)} />}

        {nearby.length > 0 && (
          <ol className="max-h-[420px] overflow-y-auto rounded-xl border border-line">
            {nearby.slice(0, 60).map(({ w, d }) => (
              <li key={w.i} className="border-b border-line last:border-0">
                <button onClick={() => setSelected(w)} className="w-full px-3 py-2.5 text-left hover:bg-white/[0.04]">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="num">{w.loc}</span>
                    <span className="num text-xs text-ink-3">{d.toFixed(1)} km</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-2">
                    {!w.forecast && <span className="num" style={{ color: riskColor(w.score) }}>{Math.round(w.score)}</span>}
                    <span className="truncate">{w.licensee}</span>
                  </div>
                  <div className="mt-1.5"><WellChips w={w} /></div>
                </button>
              </li>
            ))}
          </ol>
        )}
        {point && wells && nearby.length === 0 && <p className="text-sm text-ink-2">No inactive or orphaned wells in this radius.</p>}
      </div>

      <div className="relative h-[460px] overflow-hidden rounded-xl border border-line lg:sticky lg:top-20 lg:h-[calc(100vh-7rem)]">
        <WellMap wells={point ? mapWells : []} focus={focus} selected={selected} onSelect={setSelected} />
        {!point && (
          <div className="pointer-events-none absolute inset-0 z-[1000] grid place-items-center">
            <div className="rounded-lg border border-line bg-black/70 px-4 py-3 text-sm text-ink-2 backdrop-blur">
              Enter a location to see wells near it
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
