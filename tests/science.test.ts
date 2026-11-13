import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseCSV } from "../lib/firms/csv";
import { normalize } from "../lib/firms/normalize";
import {
  dates,
  validDate,
  deduplicate,
  spatial,
  temporal,
  period,
} from "../lib/harmonization";
import { parseQuery } from "../lib/validation/query";
import { filterResult } from "../lib/firms/client";
import type { FireResult } from "../types/fire";
const modis = parseCSV(readFileSync("tests/fixtures/modis.csv", "utf8"))[0],
  viirs = parseCSV(readFileSync("tests/fixtures/viirs.csv", "utf8"))[0];
const m = normalize(modis, "MODIS_NRT")!,
  v = normalize(viirs, "VIIRS_SNPP_NRT")!;
test("synthetic fixtures normalize sensor-specific measurements and UTC times", () => {
  assert.equal(m.acquisitionTimeUTC, "00:55:00Z");
  assert.equal(m.brightness, 340.5);
  assert.equal(v.brightness, 350.2);
  assert.equal(v.confidenceType, "VIIRS category");
  assert.equal(m.confidence, "85");
  assert.equal(v.rawProperties.bright_ti5, "298.1");
  assert.notEqual(m.id, v.id);
});
test("invalid values fail; absent optional measurements stay absent", () => {
  assert.equal(normalize({ ...modis, latitude: "bad" }, "MODIS_NRT"), null);
  assert.equal(normalize({ ...modis, acq_time: "2461" }, "MODIS_NRT"), null);
  assert.equal(
    normalize({ ...modis, acq_date: "2023-02-29" }, "MODIS_NRT"),
    null,
  );
  assert.equal(normalize({ ...modis, frp: "" }, "MODIS_NRT")!.frp, undefined);
});
test("IDs ignore column order, remove only exact source duplicates", () => {
  const reversed = Object.fromEntries(Object.entries(modis).reverse());
  assert.equal(normalize(reversed, "MODIS_NRT")!.id, m.id);
  assert.equal(deduplicate([m, m, v]).length, 2);
  assert.notEqual(normalize(modis, "MODIS_SP")!.id, m.id);
});
test("CSV handles quoted commas, escaped quotes, CRLF and multiline values", () => {
  assert.deepEqual(parseCSV('a,b\r\n"hello, world","x""y"\r\n"two\nlines",z'), [
    { a: "hello, world", b: 'x"y' },
    { a: "two\nlines", b: "z" },
  ]);
  assert.throws(() => parseCSV('a\n"broken'));
});
test("UTC periods correctly handle leap days, years and Monday weeks", () => {
  assert.equal(validDate("2023-02-29"), false);
  assert.deepEqual(dates("2024-02-28", "2024-03-01"), [
    "2024-02-28",
    "2024-02-29",
    "2024-03-01",
  ]);
  assert.equal(period("2024-01-01", "weekly"), "2024-01-01");
  assert.equal(period("2023-12-31", "weekly"), "2023-12-25");
  assert.equal(period("2024-02-29", "monthly"), "2024-02");
});
test("shared grid combines occupied cells without removing observations", () => {
  const cells = spatial([m, v], 1);
  assert.equal(cells.length, 1);
  assert.equal(cells[0].count, 2);
  assert.equal(cells[0].sources.length, 2);
  const pole = spatial([{ ...m, longitude: 180, latitude: 90 }], 1)[0];
  assert.ok(pole.longitude <= 180 && pole.latitude <= 90);
});
test("missing and unavailable source-days are null, successful zero is zero", () => {
  const sources = ["MODIS_NRT", "VIIRS_SNPP_NRT"] as const;
  const coverage = [
    { source: sources[0], date: "2024-02-29", status: "queried" as const },
    { source: sources[1], date: "2024-02-29", status: "missing" as const },
  ];
  let day = temporal([m], coverage, "2024-02-29", "2024-02-29", [
    ...sources,
  ])[0];
  assert.equal(day.count, null);
  assert.equal(day.observedCount, 1);
  coverage[1].status = "queried";
  day = temporal([], coverage, "2024-02-29", "2024-02-29", [...sources])[0];
  assert.equal(day.count, 0);
  assert.equal(day.complete, true);
  assert.equal(
    temporal([], [], "2024-02-29", "2024-02-29", [...sources])[0].count,
    null,
  );
});
test("validation rejects reversed, oversized and unsupported queries", () => {
  const base = { start: "2024-02-29", end: "2024-02-29" };
  for (const extra of [
    { bbox: "60,20,40,30" },
    { bbox: ",12,61,32" },
    { start: "2020-01-01", end: "2025-01-01" },
    { bbox: "-180,-90,180,90" },
    { sources: "NOT_NASA" },
    { end: "2024-02-28" },
    { start: "2024-02-30" },
  ])
    assert.throws(() =>
      parseQuery(
        new URLSearchParams(
          Object.entries({ ...base, ...extra }).filter(
            (entry): entry is [string, string] => typeof entry[1] === "string",
          ),
        ),
      ),
    );
  assert.equal(parseQuery(new URLSearchParams(base)).grid, 0.25);
});
test("confidence filters use distinct sensor semantics", () => {
  const data = {
    records: [m, v],
    coverage: [],
    metadata: {},
  } as unknown as FireResult;
  const q = parseQuery(
    new URLSearchParams({
      start: "2024-02-29",
      end: "2024-02-29",
      confidence: "high",
    }),
  );
  assert.deepEqual(
    filterResult(data, q).records.map((r) => r.instrument),
    ["MODIS"],
  );
  q.confidence = "nominal";
  assert.equal(filterResult(data, q).records.length, 2);
});

test("descriptive monthly departures require complete matched same-source months and preserve zero baselines", async () => {
  const { historicalDepartures } = await import("../lib/analytics/baseline");
  const records = [2022, 2023, 2024].flatMap((year, i) =>
    Array.from({ length: 2 * i + 1 }, (_, n) => ({
      ...m,
      id: `synthetic-${year}-${n}`,
      acquisitionDate: `${year}-01-01`,
    })),
  );
  const coverage = [2022, 2023, 2024].flatMap((year) =>
    dates(`${year}-01-01`, `${year}-01-31`).map((date) => ({
      source: "MODIS_NRT" as const,
      date,
      status: "queried" as const,
    })),
  );
  const data: FireResult = {
    records,
    coverage,
    metadata: {
      start: "2022-01-01",
      end: "2024-01-31",
      bounds: [43, 12, 61, 32],
      sources: ["MODIS_NRT"],
      method: "Synthetic unit-test fixture",
      fetchedAt: "",
      limitations: "Synthetic",
    },
  };
  let baseline = historicalDepartures(data);
  assert.equal(baseline.available, true);
  assert.deepEqual(baseline.values[0].baselineYears, [2022, 2023]);
  assert.equal(baseline.values[0].baselineMean, 2);
  assert.equal(baseline.values[0].difference, 3);
  assert.equal(baseline.values[0].percentage, 150);
  baseline = historicalDepartures({ ...data, coverage: coverage.slice(1) });
  assert.equal(baseline.available, false);
  baseline = historicalDepartures({
    ...data,
    records: records.filter((r) => r.acquisitionDate.startsWith("2024")),
  });
  assert.equal(baseline.values[0].percentage, null);
});
