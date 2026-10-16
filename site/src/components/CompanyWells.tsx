"use client";
import { useCallback, useMemo, useState } from "react";
import WellMap from "./WellMap";
import WellDetail from "./WellDetail";
import { useWells } from "@/lib/useWells";
import type { Well } from "@/lib/types";
import { riskColor } from "@/lib/risk";

export default function CompanyWells({ name }: { name: string }) {
  const { wells } = useWells();
  const mine = useMemo(() => (wells ? wells.filter((w) => w.licensee === name) : []), [wells, name]);
  const [selected, setSelected] = useState<Well | null>(null);
  const onSelect = useCallback((w: Well) => setSelected(w), []);
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <div className="relative h-[420px] overflow-hidden rounded-xl border border-line">
        {wells ? <WellMap wells={mine} fit selected={selected} onSelect={onSelect} /> : <div className="grid h-full place-items-center text-sm text-ink-3">Loading wells…</div>}
      </div>
      <div className="space-y-3">
        {selected && <WellDetail w={selected} onClose={() => setSelected(null)} />}
        <div>
          <h3 className="mb-1.5 text-[11px] uppercase tracking-[0.08em] text-ink-3">Riskiest wells</h3>
          <ol>
            {mine.filter((w) => !w.forecast).slice(0, 8).map((w) => (
              <li key={w.i}>
                <button onClick={() => setSelected(w)} className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-white/5">
                  <span className="num w-8" style={{ color: riskColor(w.score) }}>{Math.round(w.score)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="num block truncate text-[13px]">{w.loc}</span>
                    <span className="block truncate text-xs text-ink-3">
                      {w.yrs !== null ? `${w.yrs} yrs idle · ` : ""}near {w.town}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
