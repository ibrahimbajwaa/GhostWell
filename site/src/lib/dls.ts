/**
 * Alberta Township System (Dominion Land Survey) -> latitude/longitude.
 * Same approach as dls_to_latlon() in scripts/build_data.py, extended so a
 * landowner can enter a full LSD (7-21-57-21W4), a section (21-57-21W4) or a
 * whole township (57-21W4).
 */
const MERIDIAN_LON: Record<number, number> = { 4: -110.005, 5: -114.0, 6: -118.0 };

function gridPos(n: number, size: number): [number, number] {
  const row = Math.floor((n - 1) / size);
  const idx = (n - 1) % size;
  const col = row % 2 === 0 ? idx : size - 1 - idx; // counted from the east
  return [col, row];
}

function toLatLon(milesNorth: number, milesWest: number, mer: number): [number, number] {
  const lat = 49 + milesNorth / 69.05;
  const lon = MERIDIAN_LON[mer] - milesWest / (69.17 * Math.cos((lat * Math.PI) / 180));
  return [lat, lon];
}

export type Parsed = { lat: number; lon: number; level: "LSD" | "Section" | "Township" | "Coordinates"; label: string };

export function parseLocation(input: string): Parsed | null {
  const s = input.trim().toUpperCase().replace(/\s+/g, "");
  const coord = input.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (coord) {
    const lat = Number(coord[1]);
    const lon = Number(coord[2]);
    if (lat > 48 && lat < 61 && lon < -109 && lon > -121) return { lat, lon, level: "Coordinates", label: `${lat}, ${lon}` };
    return null;
  }
  const m = s.match(/^(?:(\d{1,2})-)?(?:(\d{1,2})-)?(\d{1,3})-(\d{1,2})W(\d)$/);
  if (!m) return null;
  const [, a, b, twpS, rgeS, merS] = m;
  const twp = Number(twpS);
  const rge = Number(rgeS);
  const mer = Number(merS);
  if (!MERIDIAN_LON[mer] || twp < 1 || twp > 126 || rge < 1 || rge > 30) return null;
  const lsd = a && b ? Number(a) : null;
  const sec = a && b ? Number(b) : a ? Number(a) : null;
  if (sec !== null && (sec < 1 || sec > 36)) return null;
  if (lsd !== null && (lsd < 1 || lsd > 16)) return null;

  let north = (twp - 1) * 6 + 3;
  let west = (rge - 1) * 6 + 3;
  let level: Parsed["level"] = "Township";
  if (sec !== null) {
    const [sc, sr] = gridPos(sec, 6);
    north = (twp - 1) * 6 + sr + 0.5;
    west = (rge - 1) * 6 + sc + 0.5;
    level = "Section";
    if (lsd !== null) {
      const [lc, lr] = gridPos(lsd, 4);
      north = (twp - 1) * 6 + sr + (lr + 0.5) / 4;
      west = (rge - 1) * 6 + sc + (lc + 0.5) / 4;
      level = "LSD";
    }
  }
  const [lat, lon] = toLatLon(north, west, mer);
  return { lat, lon, level, label: s };
}

export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = (d: number) => (d * Math.PI) / 180;
  const dp = r(lat2 - lat1);
  const dl = r(lon2 - lon1);
  const a = Math.sin(dp / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(dl / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}
