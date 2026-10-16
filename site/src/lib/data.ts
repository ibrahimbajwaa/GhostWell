// Build-time data written by scripts/build_data.py. Imported by server
// components, so it's baked into the static HTML instead of fetched.
import companiesJson from "../../data/companies.json";
import insightsJson from "../../data/insights.json";
import type { Company } from "./types";

export const companies = companiesJson as Company[];
export const insights = insightsJson;
export const watchlist = companies
  .filter((c) => c.watch !== null)
  .sort((a, b) => (b.watch ?? 0) - (a.watch ?? 0));
