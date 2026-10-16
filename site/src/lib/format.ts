export const fmt = (n: number) => n.toLocaleString("en-CA");
export const pct = (r: number | null | undefined) => (r == null ? "—" : `${Math.round(r * 100)}%`);
