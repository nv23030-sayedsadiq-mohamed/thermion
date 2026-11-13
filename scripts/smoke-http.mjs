// Read-only checks against a running Next.js instance; no NASA traffic without explicit query.
import assert from "node:assert/strict";
const origin = process.argv[2] ?? "http://127.0.0.1:3000";
for (const route of [
  "/",
  "/explore",
  "/calendar",
  "/analysis",
  "/compare",
  "/methodology",
  "/about",
]) {
  const en = await fetch(origin + route);
  assert.equal(en.status, 200, route);
  assert.match(await en.text(), /lang="en"/);
  const ar = await fetch(origin + route, {
    headers: { Cookie: "thermion-locale=ar" },
  });
  assert.equal(ar.status, 200, route + " Arabic");
  const html = await ar.text();
  assert.match(html, /lang="ar"/);
  assert.match(html, /dir="rtl"/);
  console.log(`${route}: English + Arabic HTTP 200`);
}
const health = await (await fetch(origin + "/api/health")).json();
assert.equal(health.status, "ok");
let response = await fetch(origin + "/api/fires?start=invalid&end=invalid");
assert.equal(response.status, 400);
if (!health.firmsConfigured) {
  response = await fetch(origin + "/api/fires?start=2024-02-29&end=2024-02-29");
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, "MISSING_CREDENTIALS");
  console.log("Missing-key state: HTTP 503");
}
response = await fetch(
  origin +
    "/api/fires/calendar?start=2024-01-01&end=2024-12-31&sources=MODIS_NRT",
);
assert.equal(response.status, 200);
const calendar = await response.json();
assert.equal(calendar.analytics.series.length, 366);
console.log("Historical leap-year calendar: 366 UTC days; HTTP 200");
console.log(
  "HTTP smoke checks passed. Browser rendering and real NASA retrieval were not tested.",
);
