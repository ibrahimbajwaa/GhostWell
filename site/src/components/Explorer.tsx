"use client";
import { useCallback, useMemo, useState } from "react";
import WellMap from "./WellMap";
import Legend from "./Legend";
import WellDetail from "./WellDetail";
import { useWells } from "@/lib/useWells";
import type { Well } from "@/lib/types";
import { riskColor } from "@/lib/risk";
import { fmt } from "@/lib/format";

type Filter = "orphan" | "sour" | "noncompliant" | "overdue" | "forecast";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "orphan", label: "Orphaned" },
  { key: "sour", label: "Sour gas" },
  { key: "noncompliant", label: "Non-compliant" },
  { key: "overdue", label: "Inspection overdue" },
  { key: "forecast", label: "Going inactive soon" },
];

export default function Explorer({ stats }: { stats: { label: string; value: string; accent?: boolean }[] }) {
  const { wells, error } = useWells();
  const [minScore, setMinScore] = useState(0);
  const [on, setOn] = useState<Set<Filter>>(new Set());
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Well | null>(null);
  const onSelect = useCallback((w: Well) => setSelected(w), []);

  const toggle = (k: Filter) =>
    setOn((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const visible = useMemo(() => {
    if (!wells) return [];
    const q = query.trim().toLowerCase();
    return wells.filter(
      (w) =>
        (w.forecast ? on.has("forecast") || minScore === 0 : w.score >= minScore) &&
        [...on].every((k) => w[k]) &&
        (!q || w.licensee.toLowerCase().includes(q) || w.town.toLowerCase().includes(q) || w.loc.toLowerCase().includes(q) || w.licence === q.replace(/^0+/, "")),
    );
  }, [wells, minScore, on, query]);

  return (
    <div className="flex flex-1 flex-col md:h-[calc(100vh-3.5rem)] md:flex-row">
      <aside className="order-2 flex w-full shrink-0 flex-col gap-4 border-line p-4 md:order-1 md:w-[390px] md:overflow-y-auto md:border-r">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Alberta&apos;s ghost wells</h1>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">
            Every inactive and orphaned oil &amp; gas well in the province, scored 0–100 for how risky it is to leave in the
            ground. Click any well to see why.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border border-line bg-panel px-3 py-2.5">
              <div className="text-[10.5px] uppercase tracking-[0.08em] text-ink-3">{s.label}</div>
              <div className={`num mt-0.5 text-lg ${s.accent ? "text-red-300" : ""}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {selected && <WellDetail w={selected} onClose={() => setSelected(null)} />}

        <section className="space-y-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search company, town, location or licence"
            className="w-full rounded-md border border-line bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-ink-3 focus:border-white/30"
          />
          <label className="block text-sm">
            <span className="flex justify-between text-ink-2">
              Minimum risk score <span className="num text-ink">{minScore}</span>
            </span>
            <input
              type="range"
              min={0}
              max={80}
              step={5}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="mt-1.5 w-full accent-[#ff4d4f]"
            />
          </label>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => toggle(f.key)}
                className={`rounded-full border px-2.5 py-1 text-xs transition ${
                  on.has(f.key) ? "border-red-400/60 bg-red-500/15 text-red-100" : "border-line text-ink-2 hover:border-white/25"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="text-xs text-ink-3">
            {error ? "Couldn't load the well data." : wells ? `${fmt(visible.length)} wells shown` : "Loading 91k wells…"}
          </div>
        </section>

        <section>
          <h2 className="mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-ink-3">Riskiest wells in view</h2>
          <ol>
            {visible.filter((w) => !w.forecast).slice(0, 10).map((w) => (
              <li key={w.i}>
                <button
                  onClick={() => setSelected(w)}
                  className={`flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-white/5 ${selected?.i === w.i ? "bg-white/10" : ""}`}
                >
                  <span className="num w-8" style={{ color: riskColor(w.score) }}>
                    {Math.round(w.score)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{w.licensee}</span>
                    <span className="block truncate text-xs text-ink-3">
                      {w.orphan ? "Orphan · " : ""}
                      {w.yrs !== null ? `${w.yrs} yrs idle · ` : ""}near {w.town}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </section>

        <p className="mt-auto pt-2 text-[11px] leading-relaxed text-ink-3">
          Sources: Alberta Energy Regulator Inactive Well Licence List, Orphan Well Association inventory (Oct 2026). Locations
          converted from survey coordinates and approximate. The risk score is Ghostwell&apos;s own weighting, not an AER rating.
        </p>
      </aside>

      <main className="relative order-1 h-[58vh] flex-none md:order-2 md:h-auto md:flex-1">
        <WellMap wells={visible} selected={selected} onSelect={onSelect} />
        <Legend />
      </main>
    </div>
  );
}
