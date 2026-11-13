import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseCSV } from "../lib/firms/csv";
import { normalize } from "../lib/firms/normalize";
import { handle } from "../lib/firms/handler";
import { snapshotKey } from "../lib/firms/history";
// All upstream responses in these tests are synthetic; no NASA calls or production data.
test("API integration: parsing, availability, missing credentials and validation", async () => {
  const oldKey = process.env.FIRMS_MAP_KEY,
    originalFetch = globalThis.fetch;
  try {
    delete process.env.FIRMS_MAP_KEY;
    let r = await handle(
      new Request("http://localhost/api/fires?start=2024-02-29&end=2024-02-29"),
    );
    assert.equal(r.status, 503);
    assert.equal((await r.json()).error.code, "MISSING_CREDENTIALS");
    process.env.FIRMS_MAP_KEY = "synthetic-private-test-key";
    const calls: string[] = [];
    globalThis.fetch = async (input) => {
      const url = String(input);
      calls.push(url);
      return new Response(
        url.includes("data_availability")
          ? "data_id,min_date,max_date\nMODIS_NRT,2024-02-29,2024-02-29\nVIIRS_SNPP_NRT,2024-02-29,2024-02-29"
          : readFileSync(
              url.includes("/MODIS_NRT/")
                ? "tests/fixtures/modis.csv"
                : "tests/fixtures/viirs.csv",
              "utf8",
            ),
      );
    };
    const req = () =>
      new Request("http://localhost/api/fires?start=2024-02-29&end=2024-02-29");
    const responses = await Promise.all([handle(req()), handle(req())]);
    assert.equal(responses[0].status, 200);
    const body = await responses[0].json();
    assert.equal(body.records.length, 2);
    assert.equal(body.analytics.series[0].count, 2);
    assert.equal(calls.length, 3);
    assert.equal(
      JSON.stringify(body).includes("synthetic-private-test-key"),
      false,
    );
    r = await handle(
      new Request("http://localhost/api/fires?start=2024-02-28&end=2024-02-28"),
    );
    const missing = await r.json();
    assert.equal(missing.records.length, 0);
    assert.equal(missing.analytics.series[0].count, null);
    r = await handle(
      new Request("http://localhost/api/fires?start=2024-02-01&end=2024-02-29"),
    );
    assert.equal(r.status, 400);
    r = await handle(
      new Request("http://localhost/api/fires?start=2024-02-30&end=2024-02-30"),
    );
    assert.equal(r.status, 400);
  } finally {
    globalThis.fetch = originalFetch;
    if (oldKey === undefined) delete process.env.FIRMS_MAP_KEY;
    else process.env.FIRMS_MAP_KEY = oldKey;
  }
});
test("historical API distinguishes un-ingested days from successfully queried zero days", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "thermion-test-"));
  const old = process.env.HISTORY_DIR;
  process.env.HISTORY_DIR = dir;
  try {
    const url =
      "http://localhost/api/fires/calendar?start=2024-02-28&end=2024-02-29&sources=MODIS_NRT";
    let r = await handle(new Request(url), "calendar");
    let data = await r.json();
    assert.equal(data.analytics.series[0].count, null);
    await writeFile(
      path.join(dir, snapshotKey([43, 12, 61, 32], "MODIS_NRT", 2024)),
      JSON.stringify({
        records: [],
        coverage: [
          { date: "2024-02-29", source: "MODIS_NRT", status: "queried" },
        ],
        metadata: { fetchedAt: "2024-03-01T00:00:00Z" },
      }),
    );
    r = await handle(new Request(url), "calendar");
    data = await r.json();
    assert.equal(data.analytics.series[0].count, null);
    assert.equal(data.analytics.series[1].count, 0);
    const record = normalize(
      parseCSV(readFileSync("tests/fixtures/modis.csv", "utf8"))[0],
      "MODIS_NRT",
    )!;
    await writeFile(
      path.join(dir, snapshotKey([43, 12, 61, 32], "MODIS_NRT", 2024)),
      JSON.stringify({
        records: [record],
        coverage: [
          { date: "2024-02-29", source: "MODIS_NRT", status: "queried" },
        ],
        metadata: { fetchedAt: "2024-03-01T00:00:00Z" },
      }),
    );
    r = await handle(new Request(url), "calendar");
    data = await r.json();
    assert.equal(
      data.records.length,
      0,
      "Historical observation lists remain server-side",
    );
    assert.equal(data.metadata.recordScope, "aggregates-only");
    assert.equal(data.analytics.total, 1);
    assert.equal(data.aggregateViews["0.1"].base.series[1].count, 1);
    assert.equal(
      data.aggregateViews["1"].intervals.monthly.series[0].observedCount,
      1,
    );
    assert.equal(
      data.aggregateViews["1"].intervals.monthly.series[0].count,
      null,
    );
  } finally {
    if (old === undefined) delete process.env.HISTORY_DIR;
    else process.env.HISTORY_DIR = old;
    await rm(dir, { recursive: true, force: true });
  }
});
