import { analyze } from "./index";
import { temporal, type Interval } from "../harmonization";
import type { FireResult } from "../../types/fire";
/** Precompute visual choices on the server once; historical observation lists stay server-side. */
export function aggregateViews(data: FireResult) {
  const grids = [0.1, 0.25, 0.5, 1];
  return Object.fromEntries(
    grids.map((grid) => {
      const base = analyze(data, grid, "daily");
      const intervals = Object.fromEntries(
        (["daily", "weekly", "monthly", "yearly"] as Interval[]).map(
          (interval) => {
            if (interval === "daily")
              return [
                interval,
                { series: base.series, comparison: base.comparison },
              ];
            const m = data.metadata;
            const series = temporal(
              data.records,
              data.coverage,
              m.start,
              m.end,
              m.sources,
              interval,
              grid,
            );
            const modisSources = m.sources.filter((s) => s.startsWith("MODIS")),
              viirsSources = m.sources.filter((s) => s.startsWith("VIIRS"));
            const modis = temporal(
                data.records.filter((r) => r.instrument === "MODIS"),
                data.coverage,
                m.start,
                m.end,
                modisSources,
                interval,
                grid,
              ),
              viirs = temporal(
                data.records.filter((r) => r.instrument === "VIIRS"),
                data.coverage,
                m.start,
                m.end,
                viirsSources,
                interval,
                grid,
              );
            return [
              interval,
              {
                series,
                comparison: series.map((s, i) => ({
                  date: s.date,
                  MODIS: modisSources.length ? modis[i].count : null,
                  VIIRS: viirsSources.length ? viirs[i].count : null,
                })),
              },
            ];
          },
        ),
      );
      return [String(grid), { base, intervals }];
    }),
  );
}
export type AggregateViews = ReturnType<typeof aggregateViews>;
export type FirePayload = FireResult & { aggregateViews?: AggregateViews };
