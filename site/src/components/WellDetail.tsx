"use client";
import Link from "next/link";
import type { Well } from "@/lib/types";
import { breakdown, riskColor, riskLabel } from "@/lib/risk";
import { slugify } from "@/lib/slug";
import { hasCompanyPage } from "@/lib/companySlugs";

export function Chip({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "bad" | "info" }) {
  const cls = {
    neutral: "border-line text-ink-2",
    bad: "border-red-400/40 bg-red-500/10 text-red-200",
    info: "border-blue-400/40 bg-blue-500/10 text-blue-200",
  }[tone];
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${cls}`}>{children}</span>;
}

export function WellChips({ w }: { w: Well }) {
  return (
    <div className="flex flex-wrap gap-1">
      {w.forecast && <Chip tone="info">Going inactive soon</Chip>}
      {w.orphan && <Chip tone="bad">Orphaned</Chip>}
      {w.sour && <Chip tone="bad">Sour gas (H2S)</Chip>}
      {w.noncompliant && <Chip tone="bad">Non-compliant</Chip>}
      {w.overdue && <Chip>Inspection overdue</Chip>}
    </div>
  );
}

export default function WellDetail({ w, onClose }: { w: Well; onClose?: () => void }) {
  return (
    <section className="rounded-lg border border-line bg-panel p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="num text-sm">{w.loc}</div>
          <div className="text-xs text-ink-3">
            Licence {w.licence || "—"}
            {w.drilled ? ` · drilled ${w.drilled}` : ""}
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="-m-1 p-1 text-ink-3 hover:text-ink" aria-label="Close">
            ✕
          </button>
        )}
      </div>
      {w.forecast ? (
        <p className="mt-3 text-sm text-ink-2">
          Still producing today, but the AER forecasts it will be classed inactive within months. Not scored yet.
        </p>
      ) : (
        <div className="mt-3 flex items-baseline gap-2">
          <span className="num text-3xl font-medium" style={{ color: riskColor(w.score) }}>
            {w.score}
          </span>
          <span className="text-sm text-ink-3">/ 100 · {riskLabel(w.score)} risk</span>
        </div>
      )}
      <div className="mt-1.5 text-sm">
        {w.orphan ? "Last licensee " : "Licensee "}
        {hasCompanyPage(slugify(w.licensee)) ? (
          <Link className="underline decoration-white/20 underline-offset-2 hover:decoration-white" href={`/companies/${slugify(w.licensee)}`}>
            {w.licensee}
          </Link>
        ) : (
          w.licensee
        )}
      </div>
      <div className="mt-2">
        <WellChips w={w} />
      </div>
      {!w.forecast && (
        <ul className="mt-3 space-y-2">
          {breakdown(w).map((b) => (
            <li key={b.label} className="text-xs">
              <div className="flex justify-between text-ink-2">
                <span>{b.label}</span>
                <span className="num">+{b.pts}</span>
              </div>
              <div className="mt-1 h-1 rounded-full bg-white/5">
                <div className="h-1 rounded-full bg-accent/70" style={{ width: `${(b.pts / b.max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
