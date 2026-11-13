/** Run outside HTTP handlers: sequential resumable 5-day batches. Synthetic fixtures are never loaded. */
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { loadEnvFile } from "node:process";
import { parseQuery } from "../lib/validation/query";
import { fetchFires } from "../lib/firms/client";
import { snapshotKey } from "../lib/firms/history";
import { dates, deduplicate } from "../lib/harmonization";
import type { FireResult } from "../types/fire";
async function main() {
  try {
    loadEnvFile(".env.local");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  const params = new URLSearchParams(process.argv[2] ?? "");
  const q = parseQuery(params);
  const dir = process.env.HISTORY_DIR ?? "data/history";
  await mkdir(dir, { recursive: true });
  for (const source of q.sources)
    for (
      let year = Number(q.start.slice(0, 4));
      year <= Number(q.end.slice(0, 4));
      year++
    ) {
      const file = path.join(dir, snapshotKey(q.bbox, source, year));
      let snapshot: FireResult = {
        records: [],
        coverage: [],
        metadata: {
          bounds: q.bbox as [number, number, number, number],
          start: `${year}-01-01`,
          end: `${year}-12-31`,
          sources: [source],
          method: "Batched NASA FIRMS Area API ingestion",
          fetchedAt: "",
          limitations:
            "Product-level availability; no per-pixel observation coverage.",
        },
      };
      try {
        snapshot = JSON.parse(await readFile(file, "utf8"));
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      }
      const ds = dates(
        q.start > `${year}-01-01` ? q.start : `${year}-01-01`,
        q.end < `${year}-12-31` ? q.end : `${year}-12-31`,
      );
      for (let i = 0; i < ds.length; i += 5) {
        const batch = ds.slice(i, i + 5);
        if (
          batch.every((d) =>
            snapshot.coverage.some(
              (c) => c.date === d && c.status === "queried",
            ),
          )
        )
          continue;
        const data = await fetchFires({
          ...q,
          sources: [source],
          start: batch[0],
          end: batch.at(-1)!,
          confidence: "all",
          dayNight: "all",
        });
        snapshot.records = deduplicate([
          ...snapshot.records.filter((r) => !batch.includes(r.acquisitionDate)),
          ...data.records,
        ]);
        snapshot.coverage = [
          ...snapshot.coverage.filter((c) => !batch.includes(c.date)),
          ...data.coverage,
        ];
        snapshot.metadata.fetchedAt = new Date().toISOString();
        await writeFile(file + ".tmp", JSON.stringify(snapshot));
        await rename(file + ".tmp", file);
        console.log(`${source} ${batch[0]}..${batch.at(-1)} saved`);
        await new Promise((r) => setTimeout(r, 2200));
      }
    }
}
main().catch(() => {
  console.error(
    "Ingestion failed. Check query, credentials, upstream availability and storage. Previously saved batches are retained.",
  );
  process.exitCode = 1;
});
