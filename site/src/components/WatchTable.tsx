"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Company } from "@/lib/types";
import { fmt, pct } from "@/lib/format";

type Key = "watch" | "wells" | "nc_rate" | "overdue_rate" | "idle10_rate" | "median_idle";
const COLS: { key: Key; label: string; short: string }[] = [
  { key: "wells", label: "Inactive wells", short: "Wells" },
  { key: "nc_rate", label: "Non-compliant", short: "Non-comp." },
  { key: "overdue_rate", label: "Inspection overdue", short: "Overdue" },
  { key: "idle10_rate", label: "Idle 10+ yrs", short: "Idle 10+" },
  { key: "median_idle", label: "Median yrs idle", short: "Median" },
  { key: "watch", label: "Watch score", short: "Score" },
];

function RateCell({ v }: { v: number }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <span className="hidden h-1.5 w-14 rounded-full bg-white/5 sm:block">
        <span className="block h-1.5 rounded-full bg-[#d95926]" style={{ width: `${v * 100}%` }} />
      </span>
      <span className="num w-9 text-right">{pct(v)}</span>
    </div>
  );
}

export default function WatchTable({ rows }: { rows: Company[] }) {
  const [sort, setSort] = useState<Key>("watch");
  const [q, setQ] = useState("");
  const [all, setAll] = useState(false);
  const sorted = useMemo(() => {
    const f = rows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()));
    return [...f].sort((a, b) => ((b[sort] ?? 0) as number) - ((a[sort] ?? 0) as number));
  }, [rows, sort, q]);

  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={`Search ${rows.length} companies`}
        className="mb-3 w-full max-w-sm rounded-md border border-line bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-ink-3 focus:border-white/30"
      />
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-panel text-left text-[11px] uppercase tracking-[0.06em] text-ink-3">
            <tr>
              <th className="w-12 px-3 py-2.5 font-medium">#</th>
              <th className="px-3 py-2.5 font-medium">Company</th>
              {COLS.map((c) => (
                <th key={c.key} className="px-3 py-2.5 text-right font-medium">
                  <button onClick={() => setSort(c.key)} className={`uppercase ${sort === c.key ? "text-ink" : "hover:text-ink-2"}`} title={`Sort by ${c.label}`}>
                    {c.short}
                    {sort === c.key ? " ↓" : ""}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {(all || q ? sorted : sorted.slice(0, 50)).map((r) => (
              <tr key={r.slug} className="hover:bg-white/[0.03]">
                <td className="num px-3 py-2.5 text-ink-3">{r.watch_rank}</td>
                <td className="max-w-[16rem] px-3 py-2.5">
                  <Link href={`/companies/${r.slug}`} className="block truncate hover:underline">
                    {r.name}
                  </Link>
                  <span className="text-xs text-ink-3">{r.region}</span>
                </td>
                <td className="num px-3 py-2.5 text-right">{fmt(r.wells)}</td>
                <td className="px-3 py-2.5"><RateCell v={r.nc_rate} /></td>
                <td className="px-3 py-2.5"><RateCell v={r.overdue_rate} /></td>
                <td className="px-3 py-2.5"><RateCell v={r.idle10_rate} /></td>
                <td className="num px-3 py-2.5 text-right">{r.median_idle ?? "—"}</td>
                <td className="px-3 py-2.5 text-right">
                  <span className={`num inline-block min-w-10 rounded px-1.5 py-0.5 text-center ${(r.watch ?? 0) >= 75 ? "bg-red-500/20 text-red-200" : (r.watch ?? 0) >= 50 ? "bg-orange-500/15 text-orange-200" : "text-ink-2"}`}>
                    {r.watch}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!all && !q && sorted.length > 50 && (
        <button onClick={() => setAll(true)} className="mt-3 rounded-md border border-line px-3 py-1.5 text-sm text-ink-2 hover:text-ink">
          Show all {sorted.length} companies
        </button>
      )}
    </div>
  );
}
