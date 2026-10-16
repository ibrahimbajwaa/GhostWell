import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CompanyWells from "@/components/CompanyWells";
import { Card, Page, Stat } from "@/components/Section";
import { companies, watchlist } from "@/lib/data";
import { fmt, pct } from "@/lib/format";

export const dynamicParams = false;

export function generateStaticParams() {
  return companies.map((c) => ({ slug: c.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = companies.find((x) => x.slug === slug);
  return { title: c ? `${c.name} · Ghostwell` : "Company · Ghostwell" };
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

export default async function CompanyPage({ params }: Props) {
  const { slug } = await params;
  const c = companies.find((x) => x.slug === slug);
  if (!c) notFound();

  const peers = watchlist;
  const compare = [
    { label: "Non-compliant with Directive 013", v: c.nc_rate, m: median(peers.map((p) => p.nc_rate)) },
    { label: "Inspection overdue", v: c.overdue_rate, m: median(peers.map((p) => p.overdue_rate)) },
    { label: "Idle 10+ years", v: c.idle10_rate, m: median(peers.map((p) => p.idle10_rate)) },
    { label: "AER medium or high risk class", v: c.high_med_rate, m: median(peers.map((p) => p.high_med_rate)) },
  ];

  return (
    <Page>
      <Link href="/watchlist" className="text-sm text-ink-3 hover:text-ink">
        ← Watchlist
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{c.name}</h1>
          <p className="mt-1 text-sm text-ink-2">
            {fmt(c.wells)} inactive wells · mostly in the {c.region} region
            {c.defunct && <span className="text-red-300"> · most wells already orphaned</span>}
          </p>
        </div>
        {c.watch !== null && (
          <div className="rounded-xl border border-line bg-panel px-4 py-3 text-right">
            <div className="text-[11px] uppercase tracking-[0.08em] text-ink-3">Watch score</div>
            <div className="num text-2xl">
              {c.watch}
              <span className="text-sm text-ink-3"> / 100</span>
            </div>
            <div className="text-xs text-ink-3">
              #{c.watch_rank} of {watchlist.length}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Inactive wells" value={fmt(c.wells)} />
        <Stat label="Orphaned" value={fmt(c.orphans)} accent={c.orphans > 0} />
        <Stat label="Median years idle" value={c.median_idle === null ? "—" : String(c.median_idle)} />
        <Stat label="Going inactive soon" value={fmt(c.forecast)} note="producing wells forecast by AER" />
      </div>

      <Card className="mt-5" title="Compared with other operators" sub={`Share of this company's inactive wells, against the median of the ${watchlist.length} companies on the watchlist.`}>
        <ul className="space-y-4">
          {compare.map((r) => (
            <li key={r.label}>
              <div className="flex justify-between text-sm">
                <span className="text-ink-2">{r.label}</span>
                <span className="num">{pct(r.v)}</span>
              </div>
              <div className="relative mt-1.5 h-2 rounded-full bg-white/5">
                <div className="h-2 rounded-full bg-[#d95926]" style={{ width: `${r.v * 100}%` }} />
                <div className="absolute -top-1 h-4 w-0.5 bg-ink" style={{ left: `${r.m * 100}%` }} title={`Median ${pct(r.m)}`} />
              </div>
              <div className="mt-1 text-xs text-ink-3">Median operator: {pct(r.m)}</div>
            </li>
          ))}
        </ul>
      </Card>

      <div className="mt-5">
        <CompanyWells name={c.name} />
      </div>
    </Page>
  );
}
