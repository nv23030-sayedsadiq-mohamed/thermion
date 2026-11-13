import { historicalDepartures } from "./baseline";
import type { FireResult } from "../../types/fire";
import { spatial, temporal, type Interval } from "../harmonization";
export function analyze(
  data: FireResult,
  grid = 0.25,
  interval: Interval = "daily",
) {
  const { records, coverage, metadata: m } = data;
  const series = temporal(
    records,
    coverage,
    m.start,
    m.end,
    m.sources,
    interval,
    grid,
  );
  const monthly = temporal(
    records,
    coverage,
    m.start,
    m.end,
    m.sources,
    "monthly",
    grid,
  );
  const annual = temporal(
    records,
    coverage,
    m.start,
    m.end,
    m.sources,
    "yearly",
    grid,
  );
  const modisSources = m.sources.filter((s) => s.startsWith("MODIS")),
    viirsSources = m.sources.filter((s) => s.startsWith("VIIRS"));
  const modis = temporal(
      records.filter((r) => r.instrument === "MODIS"),
      coverage,
      m.start,
      m.end,
      modisSources,
      interval,
      grid,
    ),
    viirs = temporal(
      records.filter((r) => r.instrument === "VIIRS"),
      coverage,
      m.start,
      m.end,
      viirsSources,
      interval,
      grid,
    );
  const comparison = series.map((s, i) => ({
    date: s.date,
    MODIS: modisSources.length ? modis[i].count : null,
    VIIRS: viirsSources.length ? viirs[i].count : null,
  }));
  return {
    series,
    monthly,
    annual,
    comparison,
    cells: spatial(records, grid),
    total: records.length,
    queriedSourceDays: coverage.filter((c) => c.status === "queried").length,
    expectedSourceDays: coverage.length,
    dayNight: ["D", "N", "unknown"].map((name) => ({
      name,
      count: records.filter((r) => (r.dayNight ?? "unknown") === name).length,
    })),
    sources: m.sources.map((source) => ({
      source,
      count: records.filter((r) => r.source === source).length,
      cells: spatial(
        records.filter((r) => r.source === source),
        grid,
      ).length,
      queriedDays: coverage.filter(
        (c) => c.source === source && c.status === "queried",
      ).length,
    })),
    baseline: historicalDepartures(data),
  };
}
