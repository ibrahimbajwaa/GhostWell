import { fmt } from "@/lib/format";

/** Horizontal bars with labels on the left: best for long category names. */
export default function BarList({
  rows,
  color = "#3987e5",
  partColor = "#d95926",
  partLabel,
  restLabel,
  unit = "",
}: {
  rows: { label: React.ReactNode; value: number; part?: number; note?: string }[];
  color?: string;
  partColor?: string;
  partLabel?: string;
  restLabel?: string;
  unit?: string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div>
      {partLabel && (
        <div className="mb-3 flex gap-4 text-xs text-ink-2">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: partColor }} />{partLabel}</span>
          {restLabel && <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />{restLabel}</span>}
        </div>
      )}
      <ul className="space-y-2.5">
        {rows.map((r, i) => {
          const part = r.part ?? 0;
          return (
            <li key={i} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[minmax(0,13rem)_1fr_auto]">
              <span className="truncate text-ink-2">{r.label}</span>
              <span className="flex h-3.5 items-center gap-[2px]">
                {part > 0 && <span className="h-full rounded-l-[3px]" style={{ width: `${(part / max) * 100}%`, background: partColor }} />}
                <span
                  className={`h-full rounded-r-[4px] ${part > 0 ? "" : "rounded-l-[3px]"}`}
                  style={{ width: `${((r.value - part) / max) * 100}%`, background: color }}
                />
              </span>
              <span className="num w-20 text-right text-xs text-ink">
                {fmt(r.value)}
                {unit}
                {r.note && <span className="block text-[11px] text-ink-3">{r.note}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
