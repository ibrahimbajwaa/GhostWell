import type { Metadata } from "next";
import Link from "next/link";
import WatchTable from "@/components/WatchTable";
import { Page, PageHeader } from "@/components/Section";
import { insights, watchlist } from "@/lib/data";

export const metadata: Metadata = { title: "Compliance watchlist · Ghostwell" };

export default function Watchlist() {
  const w = insights.watch_weights;
  return (
    <Page>
      <PageHeader eyebrow="Watchlist" title="Which operators show the most warning signs?">
        Companies whose wells end up orphaned usually let things slide first: wells sit idle for years, inspections lapse and
        rules get broken. This ranks the {watchlist.length} operating companies with 25+ inactive wells on those signals from
        public AER data.
      </PageHeader>

      <div className="mt-6 grid gap-3 text-[13px] leading-relaxed text-ink-2 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-panel p-4">
          <div className="font-medium text-ink">How the watch score works</div>
          Each company gets a percentile against every other company for four signals, weighted: non-compliance{" "}
          {w.nc_rate * 100}%, overdue inspections {w.overdue_rate * 100}%, share idle 10+ years {w.idle10_rate * 100}%, median
          years idle {w.median_idle * 100}%. 100 means worst in Alberta on every signal.{" "}
          <Link href="/methodology#watchlist" className="text-ink underline decoration-white/30 underline-offset-2">
            Details
          </Link>
        </div>
        <div className="rounded-xl border border-amber-400/20 bg-amber-500/[0.06] p-4">
          <div className="font-medium text-amber-200">Read this first</div>
          This is a ranking of compliance signals in regulator data, not a prediction that any company will go insolvent. Rates
          only cover each company&apos;s inactive wells, not its producing ones, and the data can lag behind what companies
          have actually done.
        </div>
      </div>

      <div className="mt-6">
        <WatchTable rows={watchlist} />
      </div>
    </Page>
  );
}
