export type Risk = "Low" | "Medium" | "High" | "Not Reported";

export type Well = {
  i: number;
  lat: number;
  lon: number;
  score: number;
  yrs: number | null;
  orphan: boolean;
  sour: boolean;
  noncompliant: boolean;
  overdue: boolean;
  forecast: boolean;
  licensee: string;
  town: string;
  km: number;
  risk: Risk;
  loc: string;
  licence: string;
  drilled: number | null;
};

export type Company = {
  name: string;
  slug: string;
  wells: number;
  orphans: number;
  nc_rate: number;
  overdue_rate: number;
  idle10_rate: number;
  median_idle: number | null;
  high_med_rate: number;
  sour: number;
  avg_score: number;
  forecast: number;
  region: string;
  defunct: boolean;
  watch: number | null;
  watch_rank: number | null;
};

type Raw = (number | string | null)[];
const RISK: Risk[] = ["Low", "Medium", "High", "Not Reported"];

export function decode(d: { licensees: string[]; towns: string[]; wells: Raw[] }): Well[] {
  return d.wells.map((r, i) => {
    const f = r[4] as number;
    return {
      i,
      lat: r[0] as number,
      lon: r[1] as number,
      score: r[2] as number,
      yrs: r[3] as number | null,
      orphan: (f & 1) > 0,
      sour: (f & 2) > 0,
      noncompliant: (f & 4) > 0,
      overdue: (f & 8) > 0,
      forecast: (f & 16) > 0,
      licensee: d.licensees[r[5] as number],
      town: d.towns[r[6] as number],
      km: r[7] as number,
      risk: RISK[r[8] as number],
      loc: r[9] as string,
      licence: r[10] as string,
      drilled: r[11] as number | null,
    };
  });
}
