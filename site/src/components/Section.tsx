export function Page({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-8 sm:pt-12">{children}</main>;
}

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <header className="max-w-3xl">
      <div className="text-xs font-medium uppercase tracking-[0.12em] text-accent">{eyebrow}</div>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      {children && <div className="mt-3 text-[15px] leading-relaxed text-ink-2">{children}</div>}
    </header>
  );
}

export function Card({ title, sub, children, className = "" }: { title?: string; sub?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-line bg-panel p-5 ${className}`}>
      {title && <h2 className="text-[15px] font-medium">{title}</h2>}
      {sub && <p className="mt-1 text-[13px] leading-relaxed text-ink-3">{sub}</p>}
      <div className={title || sub ? "mt-4" : ""}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, note, accent }: { label: string; value: string; note?: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-panel px-4 py-3.5">
      <div className="text-[11px] uppercase tracking-[0.08em] text-ink-3">{label}</div>
      <div className={`num mt-1 text-2xl ${accent ? "text-red-300" : ""}`}>{value}</div>
      {note && <div className="mt-0.5 text-xs text-ink-3">{note}</div>}
    </div>
  );
}
