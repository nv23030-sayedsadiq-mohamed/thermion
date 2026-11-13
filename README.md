# THERMION

A bilingual Next.js application for exploring and standardizing NASA FIRMS MODIS and VIIRS observations. The original landing page, hero, fonts, branding and language switcher are retained. Development and production scripts use Webpack for compatibility with restricted environments. Application pages use the same palette and typography.

## Run locally

Requires Node.js 22+ and pnpm 10 (Corepack supported).

```bash
corepack pnpm install
cp .env.example .env.local
# Set FIRMS_MAP_KEY in .env.local to your own NASA key.
corepack pnpm dev
```

Open http://localhost:3000. Request a free key from [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/api/). The key stays in server-only environment variables. Without it, live queries display a setup state, never substitute data. No real observations or credentials are bundled. Basemap tiles require internet access to OpenStreetMap; attribution is displayed by MapLibre.

Routes: `/`, `/explore`, `/calendar`, `/analysis`, `/compare`, `/methodology`, `/about`. The landing navigation is preserved; Explore provides the full application navigation. The existing language cookie persists English/Arabic across routes and refreshes. Application navigation scrolls on narrow screens, filters collapse, and tables scroll within their containers.

## Query and processing

Select a regional preset or enter `west,south,east,north`, select up to four source products, then retrieve. Live dates span 1–5 days; historical dates span at most three years. NASA source availability is checked per product. Product-level availability is **not** clear-sky or per-pixel observation coverage. An empty successful query is zero; missing/unavailable queries are null in comparable time series and calendars. Partial observation counts remain visible separately.

- `GET /api/fires`: normalized observations, query metadata, coverage and aggregates.
- `GET /api/fires/availability`: NASA source date availability.
- `GET /api/fires/summary`: regional aggregates; historical record lists stay server-side.
- `GET /api/fires/calendar`: historical aggregates only; no upstream requests or historical observation lists sent to the browser.
- `GET /api/fires/compare`: per-source and common-grid summaries.
- `GET /api/health`: credential configuration boolean and runtime status; no secret.

Example: `/api/fires?bbox=43,12,61,32&sources=MODIS_NRT,VIIRS_SNPP_NRT&start=2026-11-10&end=2026-11-11&grid=0.25&interval=daily`

Optional: `history=true`, `dayNight=all|D|N`, `confidence=all|nominal|high`. Intervals: `daily|weekly|monthly|yearly`. Grid: `0.1|0.25|0.5|1` degrees. Schema validation rejects invalid dates, sources, reversed or oversized bounds (>5,000 square degrees), and excessive spans. Anti-meridian areas must be queried as separate bounding boxes.

Normalization preserves source-specific confidence/brightness and raw fields, validates UTC acquisition timestamps, and hashes the complete source record. Only exact duplicates within a source are removed. Do not select NRT and SP for the same platform when overlapping products would distort your intended count. The common grid is equal-angle, anchored at −180°,−90°; it is **not equal-area**, a burned-area product, or a sensor correction. Weeks begin Monday UTC. Read `/methodology` for definitions and limitations.

The map clusters at low zoom, uses WebGL layers, synchronizes comparison cameras, and supports current-extent queries via the explicit retrieve button. Visual changes do not issue NASA requests. Calendar/Analysis receive server-computed grid and interval views; visual choices use these processed results without refetching. Processed API responses are bounded to 8 MB. Grid-point selection shows a representative detection. Exports include actual records, coverage and processing metadata; JSON also contains full aggregates. CSV exports from Calendar/Analysis contain period aggregates; Explore/Compare CSV exports contain normalized observations. Metadata explicitly identifies aggregate-only responses, and applied filters remain accurate even if draft controls are edited before export. CSV uses quoted fields and spreadsheet-formula protection.

## Historical ingestion

No historical archive ships with this project. Run the worker outside HTTP route handlers, using the same exact bounds and source selections you will use in the UI:

```bash
corepack pnpm ingest 'bbox=43,12,61,32&sources=MODIS_SP,VIIRS_SNPP_SP&start=2024-01-01&end=2024-12-31'
```

The worker loads `.env.local`, checks NASA availability, fetches sequential five-day batches, and writes atomic per-region/source/year JSON snapshots into `HISTORY_DIR` (default `data/history`). It skips successfully queried days on reruns and preserves already committed batches on failure. Out-of-range days stay unavailable and un-ingested days stay missing. Select the same source products and bounds on Calendar, or enable historical snapshots in Analysis/Compare/Explore. Different bounds require their own ingestion; no undocumented cropping/reuse assumptions are made.

Source revisions require intentional snapshot regeneration; automatic reprocessing of successful batches is not implemented. Timestamp metadata reports the oldest relevant snapshot retrieval time, not a claim of live historical freshness. When a multi-year query includes at least two complete prior same-month queries for the same sources, descriptive departures compare the latest year’s full months with their prior-year mean. Outputs show baseline years, mean, absolute difference and percentage (omitted for a zero mean). This is a raw observed-count comparison, not a cloud/overpass-corrected anomaly or a significance claim. If matching data is absent, the baseline is explicitly unavailable.

## Checks

```bash
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm start
# In another terminal, against the running application:
corepack pnpm test:http
```

Tests use **synthetic** CSV fixtures isolated in `tests/fixtures`; they are never imported by production routes. They test sensor normalization, UTC dates, deduplication, grid/time aggregation, missing-data semantics, confidence thresholds, request validation, mocked upstream parsing/deduplication, key sanitization and historical snapshots. Read-only HTTP smoke checks cover all seven English/Arabic routes, missing-key handling and leap-year calendars. A valid credential and network access are required for a real NASA end-to-end test. Next.js downloads the existing Google fonts at build time.

## Deployment

Deploy the repository as a Next.js project on Vercel. Add `FIRMS_MAP_KEY` as a server-side project environment variable and run the standard build. No `NEXT_PUBLIC_` credential is used. API handlers use the Node.js runtime and a 60-second maximum duration; select plan/runtime limits accordingly. Live queries have 20-second upstream timeouts, at most two retries, process-local five-minute/32 MB caching, in-flight deduplication, 12 MB response-size limits and a 30-request/minute upstream budget. Multi-source requests can exceed a short serverless timeout during upstream failure; reduce sources or increase the deployment execution limit.

Do not run historical ingestion on Vercel's ephemeral filesystem. Historical reads are limited to 24 MB per snapshot and 48 MB per query; larger archives need a pre-aggregated storage adapter. Generate snapshots before deployment and include `data/history` as build artifacts (these files are gitignored by default). Rebuild to publish new snapshots. For larger deployments, replace the file snapshot adapter in `lib/firms/history.ts` with S3-backed reads and run the worker as a scheduled AWS Lambda/container via EventBridge. Large/backfill tasks may need a longer-lived container rather than Lambda. DynamoDB/PostgreSQL and distributed caching/rate limits are optional scaling extensions, not currently provisioned services. The current process-local cache/budget is not a distributed quota guarantee. Put large archives in object storage and precompute aggregates before serving them; do not bundle a global record archive into Vercel.

## Remaining external dependencies / limits

- Authentic live retrieval needs a valid NASA key; fixture tests do not verify a real key or live service.
- Historical calendars need actual regional ingestion. No data is invented to fill gaps.
- Pixel/overpass coverage denominators are absent; coverage correction and anomaly significance are intentionally unavailable. Descriptive count departures require actual multi-year ingestion and complete same-source product queries.
- AWS resources, persistent shared cache, distributed quotas and ingestion scheduling are architectural extension points, not deployed infrastructure.
- Chart image export is not implemented; CSV and JSON exports are supported.
- Team identities are intentionally unfilled. Event/challenge wording follows the project brief; this project does not claim NASA endorsement.

Data attribution: [NASA FIRMS / LANCE](https://www.earthdata.nasa.gov/data/tools/firms), MODIS and VIIRS. Thermal detections are not wildfire incidents, exact perimeters, or an authoritative emergency warning feed.
