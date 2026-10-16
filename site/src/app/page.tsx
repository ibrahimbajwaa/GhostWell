import Explorer from "@/components/Explorer";
import { insights } from "@/lib/data";
import { fmt } from "@/lib/format";

export default function Home() {
  const t = insights.totals;
  const stats = [
    { label: "Wells mapped", value: fmt(t.wells) },
    { label: "Orphaned", value: fmt(t.orphans), accent: true },
    { label: "Idle 10+ years", value: fmt(t.idle_10y) },
    { label: "Inspection overdue", value: fmt(t.overdue) },
    { label: "Breaking AER rules", value: fmt(t.noncompliant) },
    { label: "Going inactive soon", value: fmt(t.forecast) },
  ];
  return <Explorer stats={stats} />;
}
