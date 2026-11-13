import { normalize } from "./normalize";
import { parseCSV } from "./csv";
import { deduplicate, dates, validDate } from "../harmonization";
import type { Query } from "../validation/query";
import type { Source, FireResult, Coverage, Bounds } from "../../types/fire";
export class DataError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const cache = new Map<string, { expires: number; value: string }>(),
  pending = new Map<string, Promise<string>>();
let transactions: number[] = [];
let cacheBytes = 0;
export async function upstream(path: string): Promise<string> {
  const key = process.env.FIRMS_MAP_KEY;
  if (!key)
    throw new DataError(
      "MISSING_CREDENTIALS",
      503,
      "Configure FIRMS_MAP_KEY on the server.",
    );
  const cached = cache.get(path);
  if (cached && cached.expires > Date.now()) return cached.value;
  const running = pending.get(path);
  if (running) return running;
  const request = (async () => {
    transactions = transactions.filter((t) => t > Date.now() - 60000);
    if (transactions.length >= 30)
      throw new DataError(
        "RATE_LIMIT",
        429,
        "Upstream request budget reached. Try again in a minute.",
      );
    for (let attempt = 0; attempt < 3; attempt++) {
      transactions = transactions.filter((t) => t > Date.now() - 60000);
      if (transactions.length >= 30)
        throw new DataError(
          "RATE_LIMIT",
          429,
          "Upstream request budget reached. Try again in a minute.",
        );
      transactions.push(Date.now());
      try {
        const response = await fetch(
          `https://firms.modaps.eosdis.nasa.gov/api/${path.replace("{KEY}", encodeURIComponent(key))}`,
          {
            signal: AbortSignal.timeout(20000),
            cache: "no-store",
            redirect: "error",
          },
        );
        if (response.status === 429)
          throw new DataError("RATE_LIMIT", 429, "NASA request limit reached.");
        if (!response.ok)
          throw new DataError(
            "UPSTREAM_UNAVAILABLE",
            502,
            "NASA FIRMS could not complete the request.",
          );
        if (Number(response.headers.get("content-length")) > 12_000_000)
          throw new DataError(
            "RESPONSE_TOO_LARGE",
            413,
            "Choose a smaller area or date range.",
          );
        const reader = response.body?.getReader();
        if (!reader)
          throw new DataError(
            "UPSTREAM_UNAVAILABLE",
            502,
            "Empty upstream response.",
          );
        const chunks: Uint8Array[] = [];
        let length = 0;
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          length += value.length;
          if (length > 12_000_000) {
            await reader.cancel();
            throw new DataError(
              "RESPONSE_TOO_LARGE",
              413,
              "Choose a smaller query.",
            );
          }
          chunks.push(value);
        }
        const body = Buffer.concat(chunks).toString("utf8");
        if (
          !body.trim() ||
          /^\s*</.test(body) ||
          /Invalid MAP_KEY|Invalid source|Error|exceeded|Invalid date/i.test(
            body.slice(0, 300),
          )
        )
          throw new DataError(
            "UPSTREAM_UNAVAILABLE",
            502,
            "NASA returned an invalid response. Check credentials and availability.",
          );
        while (
          cache.size &&
          (cacheBytes + length > 32_000_000 || cache.size >= 80)
        ) {
          const oldest = cache.keys().next().value!;
          cacheBytes -= Buffer.byteLength(cache.get(oldest)!.value);
          cache.delete(oldest);
        }
        const previous = cache.get(path);
        if (previous) cacheBytes -= Buffer.byteLength(previous.value);
        cacheBytes += length;
        cache.set(path, { expires: Date.now() + 300000, value: body });
        return body;
      } catch (e) {
        if (e instanceof DataError && (e.status === 429 || e.status === 413))
          throw e;
        if (attempt === 2)
          throw e instanceof DataError
            ? e
            : new DataError(
                "UPSTREAM_UNAVAILABLE",
                502,
                "NASA FIRMS is unavailable or timed out.",
              );
        await new Promise((r) => setTimeout(r, 250 * 2 ** attempt));
      }
    }
    throw new DataError("UPSTREAM_UNAVAILABLE", 502, "NASA FIRMS unavailable.");
  })();
  pending.set(path, request);
  try {
    return await request;
  } finally {
    pending.delete(path);
  }
}
export async function availability() {
  const rows = parseCSV(await upstream("data_availability/csv/{KEY}/ALL"));
  if (
    !rows.length ||
    rows.some(
      (row) =>
        !(row.data_id ?? row.source) ||
        !validDate(row.min_date?.slice(0, 10) ?? "") ||
        !validDate(row.max_date?.slice(0, 10) ?? ""),
    )
  )
    throw new DataError(
      "INVALID_UPSTREAM",
      502,
      "Unexpected NASA availability schema.",
    );
  return rows;
}
export function filterResult(result: FireResult, q: Query): FireResult {
  return {
    ...result,
    metadata: {
      ...result.metadata,
      filters: { dayNight: q.dayNight, confidence: q.confidence },
    },
    records: result.records.filter((r) => {
      if (q.dayNight !== "all" && r.dayNight !== q.dayNight) return false;
      if (q.confidence === "all") return true;
      if (r.instrument === "MODIS") {
        const n = Number(r.confidence);
        return (
          r.confidence !== undefined &&
          Number.isFinite(n) &&
          n >= (q.confidence === "high" ? 80 : 30)
        );
      }
      return q.confidence === "high"
        ? r.confidence === "h"
        : r.confidence === "n" || r.confidence === "h";
    }),
  };
}
export async function fetchFires(q: Query): Promise<FireResult> {
  if (q.end > new Date().toISOString().slice(0, 10))
    throw new DataError(
      "DATE_RANGE",
      400,
      "Future observations cannot be queried.",
    );
  const ds = dates(q.start, q.end);
  if (ds.length > 5)
    throw new DataError(
      "DATE_RANGE",
      400,
      "Live queries are limited to 1–5 days. Use an ingested historical snapshot for longer periods.",
    );
  const available = await availability();
  const records: FireResult["records"] = [],
    coverage: Coverage[] = [];
  // Sequential source calls bound upstream concurrency and memory.
  for (const source of q.sources) {
    const a = available.find((a) => (a.data_id ?? a.source) === source);
    const eligible = ds.filter(
      (d) => a && d >= a.min_date.slice(0, 10) && d <= a.max_date.slice(0, 10),
    );
    for (const d of ds)
      coverage.push({
        source,
        date: d,
        status: eligible.includes(d) ? "queried" : "unavailable",
      });
    if (!eligible.length) continue;
    const csv = await upstream(
      `area/csv/{KEY}/${source}/${q.bbox.join(",")}/${eligible.length}/${eligible[0]}`,
    );
    // A header-only CSV is a successful query with zero observations.
    if (!/^\uFEFF?latitude,longitude,/i.test(csv.trim()))
      throw new DataError(
        "INVALID_UPSTREAM",
        502,
        "Unexpected NASA detection schema.",
      );
    for (const row of parseCSV(csv)) {
      const r = normalize(row, source);
      if (!r)
        throw new DataError(
          "INVALID_UPSTREAM",
          502,
          "NASA returned an invalid observation; the query was not treated as complete.",
        );
      if (r.acquisitionDate >= q.start && r.acquisitionDate <= q.end)
        records.push(r);
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
        sources: q.sources as Source[],
        method:
          "Standardized aggregation; exact record deduplication; UTC boundaries; equal-angle grid.",
        fetchedAt: new Date().toISOString(),
        limitations:
          "Detections are not fire incidents or burned area. Availability is product-level, not pixel-level observation coverage. No sensor sensitivity correction.",
      },
    },
    q,
  );
}
