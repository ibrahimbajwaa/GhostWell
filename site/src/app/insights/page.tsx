import type { Metadata } from "next";
import Link from "next/link";
import ColumnChart from "@/components/charts/ColumnChart";
import BarList from "@/components/charts/BarList";
import { Card, Page, PageHeader, Stat } from "@/components/Section";
import { insights } from "@/lib/data";
import { fmt } from "@/lib/format";

export const metadata: Metadata = { title: "Insights · Ghostwell" };

export default function Insights() {
  const t = insights.totals;
  const years = insights.inactive_by_year.map((d) => ({ label: String(d.year), value: d.wells, highlight: d.year >= 2024 }));
  const peak = [...insights.inactive_by_year].sort((a, b) => b.wells - a.wells)[0];
  const stages = insights.owa_stages;
  const openOrphans = stages.filter((s) => s.stage !== "Closed").reduce((a, s) => a + s.wells, 0);
  const fc = insights.forecast_by_month.map((d) => ({
    label: new Date(`${d.month}-15`).toLocaleDateString("en-CA", { month: "short", year: "2-digit" }),
    value: d.wells,
  }));

  return (
    <Page>
      <PageHeader eyebrow="Insights" title="What the data says">
        Alberta&apos;s inactive well problem in numbers, from {fmt(t.wells)} wells in the Alberta Energy Regulator and Orphan
        Well Association records.
      </PageHeader>

      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Inactive & orphaned wells" value={fmt(t.wells)} />
        <Stat label="Orphaned" value={fmt(t.orphans)} accent note="no company left to clean up" />
        <Stat label="Median time idle" value={`${t.median_years} yrs`} />
        <Stat label="Inspection overdue" value={fmt(t.overdue)} note="per AER inspection schedule" />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-5">
        <Card
          className="lg:col-span-3"
          title="Wells going inactive each year"
          sub={`Year each well was officially classed inactive under AER Directive 013. ${peak.year} was the worst year on record with ${fmt(peak.wells)} wells; 2024 onward is highlighted; 2026 is a partial year.`}
        >
          <ColumnChart data={years} height={260} />
        </Card>
        <Card className="lg:col-span-2" title="How long they've been sitting" sub="Years since each well last reported production or injection.">
          <ColumnChart data={insights.idle_hist.map((d) => ({ label: d.bucket, value: d.wells }))} height={260} allTicks />
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card
          title="The cleanup pipeline"
          sub={`Every orphan well the Orphan Well Association has taken on, by stage. ${fmt(openOrphans)} are still waiting to be fully cleaned up.`}
        >
          <BarList
            rows={[
              { label: "Intake (not started)", value: stages[0].wells },
              { label: "Decommissioning (plugging)", value: stages[1].wells },
              { label: "Reclamation (restoring land)", value: stages[2].wells },
              { label: "Closed / certified", value: stages[3].wells },
            ]}
          />
        </Card>
        <Card title="Why wells are breaking the rules" sub={`${fmt(t.noncompliant)} inactive wells are non-compliant with Directive 013. A well can have several reasons.`}>
          <BarList rows={insights.nc_reasons.map((r) => ({ label: r.reason, value: r.wells }))} />
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3" title="Inactive wells by AER region" sub="Field centre responsible for each well, with the orphaned share.">
          <BarList
            partLabel="Orphaned"
            restLabel="Still licensed"
            rows={insights.regions.map((r) => ({ label: r.region, value: r.wells, part: r.orphans }))}
          />
        </Card>
        <Card className="lg:col-span-2" title="Coming next" sub={`${fmt(t.forecast)} wells still producing today are forecast to go inactive, by month.`}>
          <ColumnChart data={fc} height={220} allTicks />
        </Card>
      </div>

      <Card
        className="mt-5"
        title="Companies that left the most orphans behind"
        sub="Insolvent operators whose wells were handed to the Orphan Well Association, all-time."
      >
        <BarList
          partLabel="Still not cleaned up"
          restLabel="Closed"
          rows={insights.defunct.slice(0, 10).map((d) => ({ label: d.name, value: d.wells, part: d.open }))}
        />
      </Card>

      <p className="mt-6 text-sm text-ink-3">
        Want to know which operating companies show the same warning signs? See the{" "}
        <Link href="/watchlist" className="text-ink underline decoration-white/30 underline-offset-2">
          compliance watchlist
        </Link>
        .
      </p>
    </Page>
  );
}
