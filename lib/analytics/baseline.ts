import type { FireResult } from "../../types/fire";
import { temporal } from "../harmonization";
/** Descriptive observed-count comparison, NOT a coverage-corrected fire-risk anomaly. */
export function historicalDepartures(data: FireResult) {
  const m = data.metadata,
    targetYear = Number(m.end.slice(0, 4));
  const monthly = temporal(
    data.records,
    data.coverage,
    m.start,
    m.end,
    m.sources,
    "monthly",
  );
  const full = monthly.filter((row) => {
    const [year, month] = row.date.split("-").map(Number);
    const first = `${row.date}-01`,
      last = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
    return row.complete && m.start <= first && m.end >= last;
  });
  const values = full
    .filter((row) => Number(row.date.slice(0, 4)) === targetYear)
    .flatMap((row) => {
      const prior = full.filter(
        (r) =>
          r.date.slice(5) === row.date.slice(5) &&
          Number(r.date.slice(0, 4)) < targetYear,
      );
      if (prior.length < 2) return [];
      const mean = prior.reduce((n, r) => n + r.count!, 0) / prior.length,
        difference = row.count! - mean;
      return [
        {
          month: row.date,
          observed: row.count!,
          baselineMean: mean,
          baselineYears: prior.map((r) => Number(r.date.slice(0, 4))),
          difference,
          percentage: mean === 0 ? null : (difference / mean) * 100,
        },
      ];
    });
  return {
    available: values.length > 0,
    values,
    reason:
      "Requires at least two complete prior same-month product queries with the same selected sources. Product query completeness does not control cloud cover or overpass frequency.",
  };
}
