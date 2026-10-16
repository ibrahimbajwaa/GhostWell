import type { Well } from "./types";

export const FORECAST_COLOR = "#3987e5";

export function riskColor(score: number): string {
  if (score >= 60) return "#ff4d4f";
  if (score >= 45) return "#ff8a3d";
  if (score >= 30) return "#e8c547";
  return "#4b5563";
}

export function wellColor(w: Well) {
  return w.forecast ? FORECAST_COLOR : riskColor(w.score);
}

export function riskLabel(score: number): string {
  if (score >= 60) return "High";
  if (score >= 45) return "Elevated";
  if (score >= 30) return "Moderate";
  return "Low";
}

/** Mirrors score_all() in scripts/build_data.py so the UI can explain each score. */
export function breakdown(w: Well): { label: string; pts: number; max: number }[] {
  const riskPts = { High: 25, Medium: 12, "Not Reported": 6, Low: 0 }[w.risk];
  return [
    {
      label: w.yrs === null ? "Years idle unknown" : `Idle ${w.yrs} years`,
      pts: w.yrs === null ? 15 : Math.round(Math.min(Math.max(w.yrs, 0), 30) * 10) / 10,
      max: 30,
    },
    { label: `AER risk class: ${w.risk}`, pts: riskPts, max: 25 },
    { label: w.orphan ? "Orphaned" : "Has a licensee", pts: w.orphan ? 15 : 0, max: 15 },
    { label: w.sour ? "Sour gas (H2S) well" : "Not a sour well", pts: w.sour ? 10 : 0, max: 10 },
    { label: w.noncompliant ? "Breaking Directive 013" : "Compliant", pts: w.noncompliant ? 10 : 0, max: 10 },
    { label: `${w.km} km from ${w.town}`, pts: Math.round((Math.max(0, 30 - w.km) / 30) * 100) / 10, max: 10 },
  ];
}
