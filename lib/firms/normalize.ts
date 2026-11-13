import { createHash } from "node:crypto";
import type { Fire, Source } from "../../types/fire";
import { validDate } from "../harmonization";
const numeric = (v?: string) =>
  v?.trim() && Number.isFinite(Number(v)) ? Number(v) : undefined;
export function normalize(
  row: Record<string, string>,
  source: Source,
): Fire | null {
  const latitude = numeric(row.latitude),
    longitude = numeric(row.longitude),
    time = (row.acq_time ?? "").padStart(4, "0");
  if (
    latitude === undefined ||
    longitude === undefined ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180 ||
    !validDate(row.acq_date) ||
    !/^([01]\d|2[0-3])[0-5]\d$/.test(time)
  )
    return null;
  const instrument = source.startsWith("MODIS") ? "MODIS" : "VIIRS";
  // Fingerprint the complete source record. Nearby observations and platform overlaps remain distinct.
  const canonical = JSON.stringify([
    source,
    Object.entries(row).sort(([a], [b]) => a.localeCompare(b)),
  ]);
  return {
    id: createHash("sha256").update(canonical).digest("hex").slice(0, 24),
    latitude,
    longitude,
    acquisitionDate: row.acq_date,
    acquisitionTimeUTC: `${time.slice(0, 2)}:${time.slice(2)}:00Z`,
    satellite: row.satellite || undefined,
    instrument,
    source,
    processingType: source.endsWith("_SP") ? "SP" : "NRT",
    brightness: numeric(
      instrument === "MODIS" ? row.brightness : row.bright_ti4,
    ),
    brightnessType:
      instrument === "MODIS"
        ? "MODIS band 21/22 brightness temperature (K)"
        : "VIIRS I4 brightness temperature (K)",
    frp: numeric(row.frp),
    confidence: row.confidence || undefined,
    confidenceType:
      instrument === "MODIS" ? "MODIS percentage" : "VIIRS category",
    dayNight:
      row.daynight === "D" || row.daynight === "N" ? row.daynight : undefined,
    scan: numeric(row.scan),
    track: numeric(row.track),
    version: row.version || undefined,
    rawProperties: row,
  };
}
