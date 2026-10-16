import type { Metadata } from "next";
import BarList from "@/components/charts/BarList";
import { Card, Page, PageHeader } from "@/components/Section";
import { companies, insights } from "@/lib/data";
import { fmt } from "@/lib/format";

export const metadata: Metadata = { title: "Methodology · Ghostwell" };

function Box({ title, items, tone = "default" }: { title: string; items: string[]; tone?: "default" | "src" | "out" }) {
  const border = { default: "border-line", src: "border-[#3987e5]/40", out: "border-[#d95926]/40" }[tone];
  return (
    <div className={`rounded-lg border ${border} bg-panel p-3`}>
      <div className="text-[13px] font-medium">{title}</div>
      <ul className="mt-1.5 space-y-0.5 text-xs text-ink-2">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex items-center justify-center text-ink-3 lg:px-1" aria-hidden>
      <span className="lg:hidden">↓</span>
      <span className="hidden lg:inline">→</span>
    </div>
  );
}

function Pipeline() {
  return (
    <div className="grid items-stretch gap-2 lg:grid-cols-[1fr_auto_1.25fr_auto_1fr_auto_1fr]">
      <div className="space-y-2">
        <div className="text-[11px] uppercase tracking-[0.08em] text-ink-3">1 · Raw data</div>
        <Box tone="src" title="AER Inactive Well Licence List" items={["77,070 wells · Excel", "+ forecast tab (3,215)"]} />
        <Box tone="src" title="Orphan Well Association inventory" items={["43,156 sites, pipelines, facilities", "23,415 wells · Excel"]} />
      </div>
      <Arrow />
      <div className="space-y-2">
        <div className="text-[11px] uppercase tracking-[0.08em] text-ink-3">2 · Python pipeline</div>
        <Box title="Clean" items={["Skip metadata header rows", "Normalise licence numbers + company names", "Parse dates, drop closed sites"]} />
        <Box title="Join + locate" items={["Join AER ↔ OWA on licence number", "Survey grid (DLS) → lat/lon", "Nearest community (haversine)"]} />
        <Box title="Analyse" items={["0–100 risk score per well", "Orphan model (scikit-learn)", "Company watchlist percentiles"]} />
      </div>
      <Arrow />
      <div className="space-y-2">
        <div className="text-[11px] uppercase tracking-[0.08em] text-ink-3">3 · Data files</div>
        <Box tone="out" title="wells.json" items={["91k wells, compact arrays", "lookup tables for names"]} />
        <Box tone="out" title="companies.json" items={[`${companies.length} operators`]} />
        <Box tone="out" title="insights.json" items={["chart data, model results"]} />
      </div>
      <Arrow />
      <div className="space-y-2">
        <div className="text-[11px] uppercase tracking-[0.08em] text-ink-3">4 · Next.js site</div>
        <Box title="Static build" items={["TypeScript + Tailwind", `${companies.length + 6} pre-rendered pages`]} />
        <Box title="In the browser" items={["Leaflet canvas map", "Live filtering + search", "Landowner radius search"]} />
        <Box title="Hosting" items={["Vercel CDN"]} />
      </div>
    </div>
  );
}

function TownshipGrid() {
  // Sections are numbered in a snake pattern starting at the bottom-right corner.
  const rows = Array.from({ length: 6 }, (_, r) => {
    const nums = Array.from({ length: 6 }, (_, c) => r * 6 + c + 1);
    return r % 2 === 0 ? [...nums].reverse() : nums;
  }).reverse();
  return (
    <div className="inline-grid grid-cols-6 gap-[2px] rounded-md bg-white/10 p-[2px]">
      {rows.flat().map((n) => (
        <div key={n} className={`num grid h-8 w-8 place-items-center rounded-sm text-[11px] ${n === 21 ? "bg-[#d95926] text-white" : "bg-panel text-ink-2"}`}>
          {n}
        </div>
      ))}
    </div>
  );
}

export default function Methodology() {
  const e = insights.experiment!;
  const w = insights.watch_weights;
  return (
    <Page>
      <PageHeader eyebrow="Methodology" title="How Ghostwell works">
        Where the data comes from, how it&apos;s cleaned and joined, how each score is calculated, and what didn&apos;t work.
      </PageHeader>

      <Card className="mt-8" title="Architecture" sub="Raw government spreadsheets in, a static website out. The heavy lifting happens once in Python at build time, so the site needs no server.">
        <Pipeline />
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card title="Turning survey locations into map points">
          <div className="flex flex-wrap items-start gap-5">
            <TownshipGrid />
            <div className="min-w-0 flex-1 text-[13.5px] leading-relaxed text-ink-2">
              Alberta wells aren&apos;t recorded with GPS coordinates. They use the Dominion Land Survey:{" "}
              <span className="num text-ink">7-21-57-21W4</span> means legal subdivision 7, section{" "}
              <span className="text-[#ec835a]">21</span>, township 57, range 21, west of the 4th meridian. Townships are 6-mile
              squares counted north from the US border, ranges are counted west from a meridian, and sections and LSDs are
              numbered in a back-and-forth snake. Ghostwell converts each one to latitude and longitude, accurate to a few hundred
              metres.
            </div>
          </div>
        </Card>

        <Card title="Risk score (0–100)" sub="One function, documented weights. It's a judgment call, not an official AER rating.">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-white/[0.06]">
              {[
                ["Years since last production (capped at 30)", "up to 30"],
                ["AER deemed risk class: High / Medium / Low", "25 / 12 / 0"],
                ["Orphaned (no company left)", "15"],
                ["Sour gas (H2S) well", "10"],
                ["Non-compliant with Directive 013", "10"],
                ["Within 30 km of a community", "up to 10"],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td className="py-2 pr-3 text-ink-2">{k}</td>
                  <td className="num py-2 text-right">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Card
        className="mt-5"
        title="Experiment: can we predict which wells get orphaned?"
        sub={`A gradient-boosted classifier (scikit-learn) trained on ${fmt(e.n_wells)} wells, ${fmt(e.n_orphans)} of them orphaned, from ${fmt(e.n_companies)} companies.`}
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <div className="space-y-3">
              {[
                { label: "Random train/test split", v: e.auc_random, color: "#6b7280" },
                { label: "Held out by company (honest)", v: e.auc_grouped, color: "#d95926" },
              ].map((r) => (
                <div key={r.label}>
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-2">{r.label}</span>
                    <span className="num">AUC {r.v.toFixed(2)}</span>
                  </div>
                  <div className="relative mt-1.5 h-3 rounded-r bg-white/5">
                    <div className="h-3 rounded-r-[4px]" style={{ width: `${r.v * 100}%`, background: r.color }} />
                    <div className="absolute -top-1 h-5 w-px bg-ink-3" style={{ left: "50%" }} />
                  </div>
                </div>
              ))}
              <div className="text-xs text-ink-3">AUC 0.5 (line) = coin flip · 1.0 = perfect</div>
            </div>
            <div className="mt-5 space-y-3 text-[13.5px] leading-relaxed text-ink-2">
              <p>
                With a normal random split the model scores an impressive <span className="num text-ink">{e.auc_random.toFixed(2)}</span>.
                But that&apos;s leakage: wells from the same company sit side by side and look alike, so the model just learns
                <em> where</em> bankrupt companies operated and recognises their other wells in the test set.
              </p>
              <p>
                Holding out entire companies (GroupKFold) asks the real question: can it flag orphans at a company it&apos;s
                never seen? Then it drops to <span className="num text-ink">{e.auc_grouped.toFixed(2)}</span>, better than chance
                but weak.
              </p>
              <p className="text-ink">
                Takeaway: a well gets orphaned because its <em>company</em> fails, not because of anything about the well. So
                instead of a well-level prediction, Ghostwell tracks company-level warning signs in the{" "}
                <a href="/watchlist" className="underline decoration-white/30 underline-offset-2">watchlist</a>.
              </p>
            </div>
          </div>
          <div>
            <div className="text-sm text-ink-2">What the random-split model relied on (permutation importance)</div>
            <div className="mt-3">
              <BarList rows={e.importance.map((r) => ({ label: r.feature, value: Math.round(r.importance * 1000) }))} color="#3987e5" />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink-3">
              Location dominates, which confirms the leakage. Compliance and inspection fields were deliberately excluded: a company
              that has already gone bust stops reporting, so those are effects of being orphaned, not causes.
            </p>
          </div>
        </div>
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card title="Watchlist score" className="scroll-mt-20" sub="Only operating companies with 25+ inactive wells. Companies with most wells already orphaned are excluded.">
          <div id="watchlist" className="space-y-2 text-[13.5px] leading-relaxed text-ink-2">
            <p>Each signal is converted to a percentile rank among all ranked companies (0 = best, 1 = worst), then weighted:</p>
            <ul className="num space-y-1 text-[13px] text-ink">
              <li>{w.nc_rate} × non-compliance rate</li>
              <li>{w.overdue_rate} × overdue inspection rate</li>
              <li>{w.idle10_rate} × share idle 10+ years</li>
              <li>{w.median_idle} × median years idle</li>
            </ul>
            <p>× 100. Rates are relative to the company&apos;s inactive wells, so a giant with many producing wells is judged on its idle ones.</p>
          </div>
        </Card>
        <Card title="Limitations">
          <ul className="list-disc space-y-1.5 pl-4 text-[13.5px] leading-relaxed text-ink-2">
            <li>Locations are approximate: the conversion ignores survey correction lines.</li>
            <li>The AER list only covers inactive wells, so company rates exclude producing wells.</li>
            <li>OWA-only wells lack AER attributes (risk class, dates), so they get neutral defaults.</li>
            <li>Nearest-community distance uses ~80 towns, not every hamlet or farmhouse.</li>
            <li>Next: distance to rivers and lakes, cleanup cost estimates, PostGIS-backed API.</li>
          </ul>
        </Card>
      </div>

      <Card className="mt-5" title="Sources">
        <ul className="space-y-1 text-sm text-ink-2">
          <li>
            <a className="underline decoration-white/30 underline-offset-2" href="https://www1.aer.ca/productcatalogue/_ALL.html" target="_blank" rel="noreferrer">
              Alberta Energy Regulator: Inactive Well Licence List
            </a>{" "}
            (Petrinex data to Aug 2026, report created Oct 2026)
          </li>
          <li>
            <a className="underline decoration-white/30 underline-offset-2" href="https://www.orphanwell.ca/site-specific-inventory" target="_blank" rel="noreferrer">
              Orphan Well Association: Full Inventory
            </a>{" "}
            (Oct 2026)
          </li>
          <li>Map tiles © Esri and OpenStreetMap contributors</li>
        </ul>
      </Card>
    </Page>
  );
}
