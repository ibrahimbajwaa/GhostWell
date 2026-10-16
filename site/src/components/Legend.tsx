import { FORECAST_COLOR, riskColor } from "@/lib/risk";

export default function Legend({ forecast = true }: { forecast?: boolean }) {
  const rows: [string, string][] = [
    ["High risk (60+)", riskColor(70)],
    ["Elevated (45–59)", riskColor(50)],
    ["Moderate (30–44)", riskColor(35)],
    ["Low (<30)", riskColor(10)],
  ];
  if (forecast) rows.push(["Going inactive soon", FORECAST_COLOR]);
  return (
    <div className="pointer-events-none absolute bottom-6 right-3 z-[1000] space-y-1 rounded-md border border-line bg-black/75 px-3 py-2 text-xs text-ink-2 backdrop-blur">
      {rows.map(([l, c]) => (
        <div key={l} className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
          {l}
        </div>
      ))}
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full border border-white" />
        Orphaned (ring, zoom in)
      </div>
    </div>
  );
}
