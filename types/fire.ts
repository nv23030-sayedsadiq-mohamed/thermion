export const SOURCES = [
  "MODIS_NRT",
  "MODIS_SP",
  "VIIRS_SNPP_NRT",
  "VIIRS_SNPP_SP",
  "VIIRS_NOAA20_NRT",
  "VIIRS_NOAA20_SP",
  "VIIRS_NOAA21_NRT",
  "VIIRS_NOAA21_SP",
] as const;
export type Source = (typeof SOURCES)[number];
export type Bounds = [number, number, number, number];
export type Fire = {
  id: string;
  latitude: number;
  longitude: number;
  acquisitionDate: string;
  acquisitionTimeUTC: string;
  satellite?: string;
  instrument: "MODIS" | "VIIRS";
  source: Source;
  processingType: "NRT" | "SP";
  brightness?: number;
  brightnessType?: string;
  frp?: number;
  confidence?: string;
  confidenceType: "MODIS percentage" | "VIIRS category";
  dayNight?: "D" | "N";
  scan?: number;
  track?: number;
  version?: string;
  rawProperties: Record<string, string>;
};
export type Coverage = {
  source: Source;
  date: string;
  status: "queried" | "unavailable" | "missing";
};
export type FireResult = {
  records: Fire[];
  coverage: Coverage[];
  metadata: {
    bounds: Bounds;
    start: string;
    end: string;
    sources: Source[];
    method: string;
    fetchedAt: string;
    limitations: string;
    recordScope?: "normalized-detections" | "aggregates-only";
    filters?: {
      dayNight: "all" | "D" | "N";
      confidence: "all" | "nominal" | "high";
    };
  };
};
