"use client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Datum = { label: string; value: number; highlight?: boolean };

export default function ColumnChart({
  data,
  color = "#3987e5",
  highlightColor = "#d95926",
  unit = "wells",
  height = 240,
  allTicks = false,
}: {
  data: Datum[];
  color?: string;
  highlightColor?: string;
  unit?: string;
  height?: number;
  allTicks?: boolean;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -12, bottom: 0 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.15)" }} tick={{ fill: "#6b7280", fontSize: 11 }} interval={allTicks ? 0 : "preserveStartEnd"} minTickGap={allTicks ? 0 : 14} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "#6b7280", fontSize: 11 }} tickFormatter={(v: number) => (v >= 1000 ? `${v / 1000}k` : String(v))} width={48} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.05)" }}
            contentStyle={{ background: "#15181d", border: "1px solid #2a2f37", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#e7e9ec" }}
            itemStyle={{ color: "#a3a9b3" }}
            formatter={(v) => [`${Number(v).toLocaleString("en-CA")} ${unit}`, ""]}
            separator=""
          />
          <Bar
            dataKey="value"
            maxBarSize={24}
            radius={[4, 4, 0, 0]}
            shape={(props: unknown) => {
              const p = props as { x: number; y: number; width: number; height: number; payload: Datum };
              const r = Math.min(4, p.width / 2, p.height);
              const { x, y, width: w, height: h } = p;
              const d = `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
              return <path d={d} fill={p.payload.highlight ? highlightColor : color} />;
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
