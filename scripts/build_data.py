"""
Ghostwell data pipeline.

Reads the raw government files in data/, cleans and joins them, scores every
well's risk, runs the orphan-prediction experiment, ranks companies, and writes
the JSON the website is built from:
  site/public/wells.json    every well (map + landowner lookup)
  site/data/companies.json  company watchlist + profile pages
  site/data/insights.json   charts, headline numbers, model results

Inputs (in data/):
  aer_inactive_wells.xlsx    AER Inactive Well Licence List (~77k wells + forecast tab)
  owa_orphan_inventory.xlsx  Orphan Well Association full inventory

Run:  python scripts/build_data.py
"""
import json
import math
import re
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
PUBLIC = ROOT / "site" / "public"          # served to the browser
GEN = ROOT / "site" / "data"               # read by Next.js at build time
AER_FILE = DATA / "aer_inactive_wells.xlsx"
OWA_FILE = DATA / "owa_orphan_inventory.xlsx"
TODAY = pd.Timestamp(datetime.now().date())

# ---------------------------------------------------------------------------
# 1. Location: Alberta Township System (DLS) -> latitude / longitude
#
# Wells are located like 7-21-57-21W4 = LSD 7, Section 21, Township 57,
# Range 21, West of the 4th Meridian. Townships are 6-mile squares counted north
# from the US border (49th parallel); ranges are counted west from a meridian.
# Each township has 36 sections (1 sq mile) and each section 16 LSDs, both
# numbered in a back-and-forth "snake" pattern. This approximation ignores
# survey correction lines and is accurate to within a few hundred metres,
# plenty for a province-wide map.
# ---------------------------------------------------------------------------
MERIDIAN_LON = {4: -110.005, 5: -114.0, 6: -118.0}
DLS_RE = re.compile(r"(\d{1,2})-(\d{1,2})-(\d{1,3})-(\d{1,2})\s*W\s*(\d)", re.I)


def _grid_pos(n, size):
    row = (n - 1) // size
    idx = (n - 1) % size
    col = idx if row % 2 == 0 else size - 1 - idx   # columns counted from the east
    return col, row


def dls_to_latlon(text):
    if not isinstance(text, str):
        return None
    m = DLS_RE.search(text)
    if not m:
        return None
    lsd, sec, twp, rge, mer = map(int, m.groups())
    if mer not in MERIDIAN_LON or not (1 <= sec <= 36) or not (1 <= lsd <= 16):
        return None
    s_col, s_row = _grid_pos(sec, 6)
    l_col, l_row = _grid_pos(lsd, 4)
    miles_north = (twp - 1) * 6 + s_row + (l_row + 0.5) / 4
    miles_west = (rge - 1) * 6 + s_col + (l_col + 0.5) / 4
    lat = 49.0 + miles_north / 69.05
    lon = MERIDIAN_LON[mer] - miles_west / (69.17 * math.cos(math.radians(lat)))
    if not (48.9 < lat < 60.1 and -120.1 < lon < -109.9):
        return None
    return round(lat, 4), round(lon, 4)


# ---------------------------------------------------------------------------
# 2. Nearest community (for "how close is this to people")
# ---------------------------------------------------------------------------
TOWNS = {
    "Calgary": (51.045, -114.057), "Edmonton": (53.546, -113.494),
    "Red Deer": (52.269, -113.811), "Lethbridge": (49.694, -112.833),
    "Medicine Hat": (50.041, -110.677), "Grande Prairie": (55.171, -118.794),
    "Fort McMurray": (56.726, -111.381), "Lloydminster": (53.278, -110.005),
    "Airdrie": (51.292, -114.014), "Spruce Grove": (53.545, -113.900),
    "Leduc": (53.264, -113.552), "Camrose": (53.019, -112.835),
    "Brooks": (50.564, -111.899), "Cold Lake": (54.464, -110.182),
    "Wetaskiwin": (52.969, -113.377), "Lacombe": (52.468, -113.737),
    "Olds": (51.792, -114.106), "Drumheller": (51.464, -112.711),
    "Hinton": (53.405, -117.585), "Whitecourt": (54.142, -115.684),
    "Slave Lake": (55.283, -114.772), "Peace River": (56.234, -117.290),
    "High River": (50.580, -113.871), "Okotoks": (50.725, -113.975),
    "Stettler": (52.323, -112.719), "Vegreville": (53.494, -112.052),
    "Wainwright": (52.839, -110.857), "Drayton Valley": (53.222, -114.977),
    "Edson": (53.581, -116.439), "Rocky Mountain House": (52.376, -114.918),
    "Sylvan Lake": (52.311, -114.084), "Bonnyville": (54.268, -110.735),
    "St. Paul": (53.992, -111.297), "Athabasca": (54.719, -113.286),
    "Barrhead": (54.123, -114.401), "Westlock": (54.152, -113.857),
    "Taber": (49.786, -112.150), "Claresholm": (50.033, -113.582),
    "Pincher Creek": (49.486, -113.950), "Oyen": (51.352, -110.474),
    "Hanna": (51.638, -111.942), "Provost": (52.354, -110.268),
    "Vermilion": (53.354, -110.853), "Grande Cache": (53.888, -119.135),
    "Valleyview": (55.069, -117.286), "High Level": (58.517, -117.136),
    "Swan Hills": (54.711, -115.400), "Fox Creek": (54.401, -116.810),
    "Strathmore": (51.038, -113.400), "Didsbury": (51.661, -114.137),
    "Three Hills": (51.707, -113.264), "Ponoka": (52.677, -113.581),
    "Innisfail": (52.026, -113.950), "Cochrane": (51.189, -114.467),
    "Canmore": (51.089, -115.359), "Manning": (56.915, -117.623),
    "Fairview": (56.071, -118.389), "Beaverlodge": (55.209, -119.430),
    "Sundre": (51.797, -114.641), "Coronation": (52.091, -111.448),
    "Consort": (52.010, -110.773), "Sedgewick": (52.778, -111.700),
    "Viking": (53.096, -111.776), "Two Hills": (53.713, -111.745),
    "Elk Point": (53.896, -110.897), "Lac La Biche": (54.769, -111.965),
    "Mayerthorpe": (53.950, -115.134), "Fort Saskatchewan": (53.713, -113.213),
    "Morinville": (53.802, -113.645), "Bassano": (50.785, -112.469),
    "Vulcan": (50.400, -113.252), "Cardston": (49.199, -113.302),
    "Milk River": (49.146, -112.084), "Bow Island": (49.867, -111.375),
}
_T_NAMES = list(TOWNS)
_T_LAT = [math.radians(v[0]) for v in TOWNS.values()]
_T_LON = [math.radians(v[1]) for v in TOWNS.values()]


def nearest_town(lat, lon):
    p1, l1 = math.radians(lat), math.radians(lon)
    best_i, best_d = 0, 1e9
    for i in range(len(_T_NAMES)):
        dp, dl = _T_LAT[i] - p1, _T_LON[i] - l1
        a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(_T_LAT[i]) * math.sin(dl / 2) ** 2
        d = 2 * 6371 * math.asin(math.sqrt(a))
        if d < best_d:
            best_i, best_d = i, d
    return _T_NAMES[best_i], round(best_d, 1)


# ---------------------------------------------------------------------------
# 3. Load and clean
# ---------------------------------------------------------------------------
def norm_licence(x):
    if pd.isna(x):
        return None
    s = re.sub(r"\D", "", str(x))
    return s.lstrip("0") or None


def norm_company(name):
    """'LONG RUN EXPLORATION LTD' and 'Long Run Exploration Ltd.' -> 'LONG RUN EXPLORATION'"""
    s = re.sub(r"[^A-Z0-9 &]", " ", str(name).upper())
    s = re.sub(r"\b(LTD|LIMITED|INC|CORP|CORPORATION|CO|ULC|LP|PARTNERSHIP)\b", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def load_aer():
    # First two rows are report metadata; the real header is row 3.
    df = pd.read_excel(AER_FILE, sheet_name=0, header=2, dtype=str)
    df = df.dropna(subset=["Well Licence Number"])
    out = pd.DataFrame({
        "licence": df["Well Licence Number"].map(norm_licence),
        "loc": df["Surface Location"],
        "licensee": df["Licensee Name"].fillna("Unknown").str.strip(),
        "region": df["AER Field Centre"].fillna("Unknown").str.title(),
        "status": df["Licence Status"],
        "risk_class": df["AER Deemed Risk Class"].fillna("Not Reported"),
        "well_type": df["Industry Reported Well Operational Type"].fillna(""),
        "noncompliant": df["Directive 13 Compliance Status"].eq("Non Compliant"),
        "nc_reasons": df["Noncompliance Details"].fillna(""),
        "orphan": df["Additional Information"].eq("Orphan Well Association"),
        "type6": df["Medium Risk Type 6 Well"].eq("Yes"),
        "drilled": pd.to_datetime(df["Final Drill Date"], errors="coerce"),
        # last time the well reported any production/injection volume
        "last_active": pd.to_datetime(df["Last Volumetric Activity Date"], errors="coerce")
            .fillna(pd.to_datetime(df["Directive 13 Inactive Status Date"], errors="coerce")),
        "inactive_date": pd.to_datetime(df["Directive 13 Inactive Status Date"], errors="coerce"),
        "next_inspection": pd.to_datetime(df["Next Inspection Due Date"], errors="coerce"),
    })
    out["overdue"] = out["next_inspection"] < TODAY
    out["forecast"] = False
    out["source"] = "AER"
    print(f"  AER inactive list: {len(out):,} wells")
    return out


def load_forecast():
    """Wells still producing today that the AER forecasts will go inactive soon."""
    df = pd.read_excel(AER_FILE, sheet_name=1, header=2, dtype=str).dropna(subset=["Well Licence Number"])
    out = pd.DataFrame({
        "licence": df["Well Licence Number"].map(norm_licence),
        "loc": df["Surface Location"],
        "licensee": df["Licensee Name"].fillna("Unknown").str.strip(),
        "region": df["AER Field Centre"].fillna("Unknown").str.title(),
        "status": df["Licence Status"],
        "risk_class": df["AER Deemed Risk Class"].fillna("Not Reported"),
        "well_type": "", "noncompliant": False, "nc_reasons": "", "orphan": False, "type6": False,
        "drilled": pd.to_datetime(df["Final Drill Date"], errors="coerce"),
        "last_active": pd.to_datetime(df["Last Volumetric Activity Date"], errors="coerce"),
        "inactive_date": pd.to_datetime(df["Forecasted Directive 13 Inactive Status Date"], errors="coerce"),
        "next_inspection": pd.NaT, "overdue": False, "forecast": True, "source": "AER forecast",
    })
    print(f"  AER forecast list: {len(out):,} wells about to go inactive")
    return out


def load_owa():
    # Six blank/title rows, header on row 8.
    df = pd.read_excel(OWA_FILE, sheet_name="Full Inventory", header=7, dtype=str)
    wells = df[df["Component Type"].eq("Well & Access Road")].copy()
    print(f"  OWA inventory: {len(wells):,} orphan well sites (all stages), "
          f"{df['Component Type'].str.contains('Pipeline').sum():,} pipeline segments, "
          f"{df['Component Type'].str.startswith('Facility').sum():,} facilities")
    # Cleanup stage, for the insights page
    stage_map = {"Intake - Decommissioning": "Intake", "Intake - Environment": "Intake",
                 "Decommissioning": "Decommissioning", "Environment": "Reclamation", "Closed": "Closed"}
    wells["stage"] = wells["Responsible Department"].map(stage_map).fillna("Other")
    wells.loc[wells["Current Project Type"].eq("Rec Cert Issued"), "stage"] = "Closed"
    open_ = wells["stage"].ne("Closed")
    print(f"  OWA still open (not yet closed/reclaimed): {open_.sum():,}")
    mapped = pd.DataFrame({
        "licence": wells.loc[open_, "License Number"].map(norm_licence),
        "loc": wells.loc[open_, "Site Name"],
        "licensee": wells.loc[open_, "Licensee"].fillna("Unknown").str.strip().str.title(),
        "region": "Unknown", "status": wells.loc[open_, "stage"],
        "risk_class": "Not Reported", "well_type": "", "noncompliant": False, "nc_reasons": "",
        "orphan": True, "type6": False, "drilled": pd.NaT, "last_active": pd.NaT,
        "inactive_date": pd.NaT, "next_inspection": pd.NaT, "overdue": False, "forecast": False,
        "source": "OWA",
    })
    return mapped, wells


# ---------------------------------------------------------------------------
# 4. Risk score, 0-100. Weights are a judgment call, documented in README.
# ---------------------------------------------------------------------------
RISK_PTS = {"High": 25, "Medium": 12, "Not Reported": 6, "Low": 0}
SOUR_WORDS = ("H2S content > 50", "Sour", "Critical")


def score_all(df):
    yrs = df["years_idle"]
    s = yrs.clip(lower=0, upper=30).fillna(15)                      # up to 30: time sitting idle
    s += df["risk_class"].map(RISK_PTS).fillna(6)                   # up to 25: AER's own risk class
    s += df["orphan"].astype(int) * 15                              # 15: no company left to fix it
    s += df["sour"].astype(int) * 10                                # 10: sour gas (H2S) is toxic
    s += df["noncompliant"].astype(int) * 10                        # 10: breaking AER inactive-well rules
    s += ((30 - df["km"]).clip(lower=0) / 30 * 10)                  # up to 10: within 30 km of a town
    return s.round(1)


# ---------------------------------------------------------------------------
# 5. Experiment: can well characteristics predict which wells get orphaned?
#
# Trained only on AER-list wells (they have full attributes). The important
# part is the validation: wells from the same company are near-identical, so a
# random train/test split lets the model "recognise" bankrupt companies by
# location and look ~98% accurate. Holding out whole companies (GroupKFold)
# is the honest test: can it spot orphans at a company it has never seen?
# Reporting-behaviour fields (compliance, inspections) are left out on purpose:
# a bankrupt company stops reporting, so those are effects, not causes.
# ---------------------------------------------------------------------------
def orphan_experiment(aer):
    try:
        from sklearn.ensemble import HistGradientBoostingClassifier
        from sklearn.inspection import permutation_importance
        from sklearn.metrics import roc_auc_score
        from sklearn.model_selection import GroupKFold, StratifiedKFold
    except ImportError:
        print("  (scikit-learn not installed, skipping model experiment)")
        return None
    d = aer.dropna(subset=["lat"]).reset_index(drop=True)
    X = pd.DataFrame({
        "Drill year": d["drilled"].dt.year,
        "Latitude": d["lat"], "Longitude": d["lon"],
        "AER risk class": d["risk_class"].map({"Low": 0, "Medium": 1, "High": 2}),
        "Well type": d["well_type"].astype("category").cat.codes,
        "Region": d["region"].astype("category").cat.codes,
        "Type 6 (medium-risk)": d["type6"].astype(int),
    })
    y = d["orphan"].astype(int).to_numpy()
    groups = d["licensee"].to_numpy()

    def model():
        return HistGradientBoostingClassifier(max_iter=200, learning_rate=0.05, max_depth=4,
                                              categorical_features=[4, 5], random_state=0)

    def cv_auc(splitter, use_groups):
        p = np.zeros(len(X))
        split = splitter.split(X, y, groups) if use_groups else splitter.split(X, y)
        for tr, te in split:
            p[te] = model().fit(X.iloc[tr], y[tr]).predict_proba(X.iloc[te])[:, 1]
        return round(float(roc_auc_score(y, p)), 3)

    naive = cv_auc(StratifiedKFold(5, shuffle=True, random_state=0), False)
    honest = cv_auc(GroupKFold(5), True)
    # which features does the naive model lean on?
    m = model().fit(X, y)
    imp = permutation_importance(m, X.sample(8000, random_state=0), y[X.sample(8000, random_state=0).index],
                                 scoring="roc_auc", n_repeats=3, random_state=0)
    importance = sorted(({"feature": c, "importance": round(float(v), 4)}
                         for c, v in zip(X.columns, imp.importances_mean)), key=lambda r: -r["importance"])
    print(f"  orphan model AUC: random split {naive}, company-held-out {honest}")
    return {"n_wells": int(len(X)), "n_orphans": int(y.sum()), "n_companies": int(len(set(groups))),
            "auc_random": naive, "auc_grouped": honest, "importance": importance}


# ---------------------------------------------------------------------------
# 6. Company watchlist: warning signs among companies still operating.
# Each metric is turned into a percentile (0 = best in Alberta, 1 = worst) and
# averaged with weights. Only companies with 25+ inactive wells are ranked.
# ---------------------------------------------------------------------------
WATCH_WEIGHTS = {"nc_rate": 0.35, "overdue_rate": 0.25, "idle10_rate": 0.25, "median_idle": 0.15}


def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:60]


def company_table(df, owa_raw):
    aer = df[df["source"] == "AER"]
    g = aer.groupby("licensee")
    t = pd.DataFrame({
        "wells": g.size(),
        "orphans": g["orphan"].sum(),
        "nc_rate": g["noncompliant"].mean(),
        "overdue_rate": g["overdue"].mean(),
        "idle10_rate": g["years_idle"].apply(lambda s: (s >= 10).mean()),
        "median_idle": g["years_idle"].median(),
        "high_med_rate": g["risk_class"].apply(lambda s: s.isin(["High", "Medium"]).mean()),
        "sour": g["sour"].sum(),
        "avg_score": g["score"].mean(),
        "top_region": g["region"].agg(lambda s: s.mode().iat[0] if len(s.mode()) else ""),
    })
    fc = df[df["forecast"]].groupby("licensee").size()
    t["forecast"] = fc.reindex(t.index).fillna(0).astype(int)
    t["defunct"] = t["orphans"] / t["wells"] > 0.5
    ranked = t[(t["wells"] >= 25) & ~t["defunct"]].copy()
    watch = sum(ranked[k].rank(pct=True) * w for k, w in WATCH_WEIGHTS.items())
    ranked["watch"] = (watch * 100).round(0)
    t["watch"] = ranked["watch"]
    t["watch_rank"] = ranked["watch"].rank(ascending=False, method="min")

    # Companies that already left wells to the OWA (all stages, incl. cleaned up)
    owa_raw = owa_raw.assign(company=owa_raw["Licensee"].fillna("Unknown"))
    left = owa_raw.groupby("company").agg(wells=("stage", "size"),
                                          open=("stage", lambda s: (s != "Closed").sum()))
    left = left.sort_values("wells", ascending=False).head(15)
    defunct = [{"name": k.title(), "wells": int(v.wells), "open": int(v.open)} for k, v in left.iterrows()]
    return t, defunct


# ---------------------------------------------------------------------------
# 7. Main
# ---------------------------------------------------------------------------
def main():
    print("Ghostwell data build")
    aer, forecast, (owa, owa_raw) = load_aer(), load_forecast(), load_owa()

    # Join: an AER well whose licence is on the OWA list is an orphan.
    owa_ids = set(owa["licence"].dropna())
    aer["orphan"] = aer["orphan"] | aer["licence"].isin(owa_ids)
    known = set(aer["licence"].dropna())
    extra = owa[~owa["licence"].isin(known)].drop_duplicates("licence")
    forecast = forecast[~forecast["licence"].isin(known)]
    df = pd.concat([aer, extra, forecast], ignore_index=True).drop_duplicates("licence")
    print(f"  combined: {len(df):,} wells ({len(extra):,} extra orphans from OWA, {len(forecast):,} forecast)")

    coords = df["loc"].map(dls_to_latlon)
    df = df[coords.notna()].reset_index(drop=True)
    coords = coords.dropna().reset_index(drop=True)
    df["lat"] = [c[0] for c in coords]
    df["lon"] = [c[1] for c in coords]
    print(f"  located: {len(df):,}")

    df["years_idle"] = ((TODAY - df["last_active"]).dt.days / 365.25).round(1)
    df["sour"] = df["well_type"].apply(lambda t: any(w.lower() in t.lower() for w in SOUR_WORDS))
    near = [nearest_town(a, b) for a, b in zip(df["lat"], df["lon"])]
    df["town"] = [n[0] for n in near]
    df["km"] = [n[1] for n in near]
    df["score"] = score_all(df)
    df.loc[df["forecast"], "score"] = 0.0  # still producing today, not scored yet
    df = df.sort_values("score", ascending=False).reset_index(drop=True)

    experiment = orphan_experiment(df[df["source"] == "AER"])
    companies, defunct = company_table(df, owa_raw)

    # ---- wells.json: one compact array per well (loaded by the map + lookup)
    licensees = sorted(df["licensee"].unique())
    lic_idx = {n: i for i, n in enumerate(licensees)}
    towns = sorted(df["town"].unique())
    town_idx = {n: i for i, n in enumerate(towns)}
    risk_codes = {"Low": 0, "Medium": 1, "High": 2, "Not Reported": 3}

    def clean_loc(x):
        m = DLS_RE.search(str(x))
        return m.group(0).upper().replace(" ", "") if m else str(x)[:20]

    wells = []
    for r in df.itertuples():
        flags = ((1 if r.orphan else 0) | (2 if r.sour else 0) | (4 if r.noncompliant else 0)
                 | (8 if r.overdue else 0) | (16 if r.forecast else 0))
        wells.append([
            r.lat, r.lon, r.score,
            None if pd.isna(r.years_idle) else r.years_idle,
            flags, lic_idx[r.licensee], town_idx[r.town], r.km,
            risk_codes.get(r.risk_class, 3), clean_loc(r.loc), r.licence or "",
            None if pd.isna(r.drilled) else int(r.drilled.year),
        ])
    PUBLIC.mkdir(parents=True, exist_ok=True)
    (PUBLIC / "wells.json").write_text(json.dumps({
        "fields": ["lat", "lon", "score", "yrs", "flags", "licensee", "town", "km", "risk", "loc", "licence", "drilled"],
        "licensees": licensees, "towns": towns, "wells": wells,
    }, separators=(",", ":")))

    # ---- companies.json (watchlist + company pages)
    def num(v, nd=3):
        return None if pd.isna(v) else round(float(v), nd)
    comp_rows = []
    for name, r in companies.sort_values("wells", ascending=False).iterrows():
        if name == "Unknown":
            continue
        comp_rows.append({
            "name": name, "slug": slugify(name), "wells": int(r.wells), "orphans": int(r.orphans),
            "nc_rate": num(r.nc_rate), "overdue_rate": num(r.overdue_rate), "idle10_rate": num(r.idle10_rate),
            "median_idle": num(r.median_idle, 1), "high_med_rate": num(r.high_med_rate), "sour": int(r.sour),
            "avg_score": num(r.avg_score, 1), "forecast": int(r.forecast), "region": r.top_region,
            "defunct": bool(r.defunct), "watch": num(r.watch, 0),
            "watch_rank": None if pd.isna(r.watch_rank) else int(r.watch_rank),
        })
    slugs = {}
    for c in comp_rows:  # make slugs unique
        n = slugs.get(c["slug"], 0)
        slugs[c["slug"]] = n + 1
        if n:
            c["slug"] = f'{c["slug"]}-{n + 1}'
    GEN.mkdir(parents=True, exist_ok=True)
    (GEN / "companies.json").write_text(json.dumps(comp_rows, separators=(",", ":")))
    (GEN / "company_slugs.json").write_text(json.dumps([c["slug"] for c in comp_rows]))

    # ---- insights.json (charts, summary numbers, methodology)
    aer_located = df[df["source"] == "AER"]
    by_year = aer_located["inactive_date"].dt.year.value_counts().sort_index()
    by_year = {int(k): int(v) for k, v in by_year.items() if 1990 <= k <= TODAY.year}
    idle_bins = [0, 2, 5, 10, 15, 20, 30, 40, 200]
    idle_labels = ["<2", "2–5", "5–10", "10–15", "15–20", "20–30", "30–40", "40+"]
    idle_hist = pd.cut(aer_located["years_idle"], idle_bins, labels=idle_labels, right=False).value_counts()
    regions = (aer_located.groupby("region").agg(wells=("score", "size"), orphans=("orphan", "sum"),
                                                 noncompliant=("noncompliant", "sum"))
               .sort_values("wells", ascending=False))
    reasons = {}
    for s in aer_located["nc_reasons"]:
        for part in filter(None, s.split("\\")):
            reasons[part.strip()] = reasons.get(part.strip(), 0) + 1
    stages = owa_raw["stage"].value_counts()
    fc_month = (df[df["forecast"]]["inactive_date"].dt.to_period("M").value_counts().sort_index())
    insights = {
        "built": TODAY.strftime("%Y-%m-%d"),
        "totals": {
            "wells": int((df["source"] != "AER forecast").sum()),
            "orphans": int(df["orphan"].sum()),
            "idle_10y": int((df["years_idle"] >= 10).sum()),
            "median_years": float(aer_located["years_idle"].median()),
            "noncompliant": int(df["noncompliant"].sum()),
            "overdue": int(df["overdue"].sum()),
            "sour": int(df["sour"].sum()),
            "within_10km": int(((df["km"] <= 10) & ~df["forecast"]).sum()),
            "forecast": int(df["forecast"].sum()),
            "high_score": int((df["score"] >= 60).sum()),
            "companies": int(aer_located["licensee"].nunique()),
            "owa_sites_all_time": int(len(owa_raw)),
            "oldest_drilled": int(df["drilled"].dt.year.min()),
        },
        "inactive_by_year": [{"year": k, "wells": v} for k, v in by_year.items()],
        "idle_hist": [{"bucket": l, "wells": int(idle_hist.get(l, 0))} for l in idle_labels],
        "regions": [{"region": k, "wells": int(v.wells), "orphans": int(v.orphans), "noncompliant": int(v.noncompliant)}
                    for k, v in regions.iterrows()],
        "risk_classes": {k: int(v) for k, v in aer_located["risk_class"].value_counts().items()},
        "nc_reasons": [{"reason": k, "wells": v} for k, v in sorted(reasons.items(), key=lambda x: -x[1])[:6]],
        "owa_stages": [{"stage": s, "wells": int(stages.get(s, 0))}
                       for s in ["Intake", "Decommissioning", "Reclamation", "Closed"]],
        "forecast_by_month": [{"month": str(k), "wells": int(v)} for k, v in fc_month.items()],
        "defunct": defunct,
        "watch_weights": WATCH_WEIGHTS,
        "experiment": experiment,
    }
    (GEN / "insights.json").write_text(json.dumps(insights, indent=1))

    size = (PUBLIC / "wells.json").stat().st_size / 1e6
    print(f"  wrote public/wells.json ({len(wells):,} wells, {size:.1f} MB), "
          f"companies.json ({len(comp_rows)}), insights.json")
    print(json.dumps(insights["totals"], indent=1))


if __name__ == "__main__":
    main()
