import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import type { Query } from "../validation/query";
import type { FireResult, Bounds } from "../../types/fire";
import { dates, deduplicate } from "../harmonization";
import { DataError, filterResult } from "./client";
export function snapshotKey(bounds: number[], source: string, year: number) {
  return (
    createHash("sha256")
      .update(JSON.stringify([bounds, source, year]))
      .digest("hex") + ".json"
  );
}
export async function history(q: Query): Promise<FireResult> {
  const ds = dates(q.start, q.end);
  if (ds.length > 1096)
    throw new DataError(
      "DATE_RANGE",
      400,
      "Historical queries are limited to three years.",
    );
  let bytes = 0;
  const records: FireResult["records"] = [],
    coverage: FireResult["coverage"] = [];
  const timestamps: string[] = [];
  for (const source of q.sources) {
    for (
      let year = Number(q.start.slice(0, 4));
      year <= Number(q.end.slice(0, 4));
      year++
    ) {
      let snapshot: FireResult | undefined;
      try {
        const file = path.join(
          process.env.HISTORY_DIR ?? "data/history",
          snapshotKey(q.bbox, source, year),
        );
        const size = (await stat(file)).size;
        bytes += size;
        if (size > 24_000_000 || bytes > 48_000_000)
          throw new DataError(
            "RESPONSE_TOO_LARGE",
            413,
            "Historical query is too large; use pre-aggregated regional snapshots.",
          );
        snapshot = JSON.parse(await readFile(file, "utf8"));
      } catch (e) {
        if (e instanceof DataError) throw e;
        if ((e as NodeJS.ErrnoException).code !== "ENOENT")
          throw new DataError(
            "HISTORY_INVALID",
            503,
            "Historical snapshot could not be read.",
          );
      }
      if (snapshot) {
        records.push(
          ...snapshot.records.filter(
            (r) =>
              r.source === source &&
              r.acquisitionDate >= q.start &&
              r.acquisitionDate <= q.end,
          ),
        );
        timestamps.push(snapshot.metadata.fetchedAt);
      }
      for (const date of ds.filter((d) => Number(d.slice(0, 4)) === year)) {
        coverage.push(
          snapshot?.coverage.find(
            (c) => c.source === source && c.date === date,
          ) ?? { source, date, status: "missing" },
        );
      }
    }
  }
  return filterResult(
    {
      records: deduplicate(records),
      coverage,
      metadata: {
        bounds: q.bbox as Bounds,
        start: q.start,
        end: q.end,
        sources: q.sources,
        method:
          "Ingested historical snapshots; UTC boundaries; standardized aggregation.",
        fetchedAt: timestamps.sort()[0] ?? "",
        limitations:
          "Missing days have not been ingested. Product availability does not establish clear-sky pixel coverage. No sensor sensitivity correction.",
      },
    },
    q,
  );
}
