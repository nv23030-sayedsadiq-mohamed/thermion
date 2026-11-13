"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Download, SlidersHorizontal } from "lucide-react";
import { format } from "date-fns";
import { arSA, enUS } from "date-fns/locale";
import type { Locale } from "@/lib/i18n/config";
import { platformDictionary } from "@/lib/i18n/platform";
import { SOURCES, type Fire, type Bounds, type Source } from "@/types/fire";
import { temporal, type Interval } from "@/lib/harmonization";
import { analyze } from "@/lib/analytics";
import type { FirePayload } from "@/lib/analytics/views";
const FireMap = dynamic(() => import("@/components/maps/fire-map"), {
  ssr: false,
  loading: () => <div className="fire-map" aria-busy="true" />,
});
const Charts = dynamic(() => import("./charts"), { ssr: false });
type Props = {
  locale: Locale;
  page: "explore" | "calendar" | "analysis" | "compare";
};
const regions = {
  arabia: [43, 12, 61, 32],
  amazon: [-65, -18, -45, -2],
  australia: [140, -39, 154, -25],
  med: [26, 29, 43, 42],
} satisfies Record<string, Bounds>;
const today = () => new Date(Date.now() - 86400000).toISOString().slice(0, 10);
export function Workspace({ locale, page }: Props) {
  const t = platformDictionary(locale),
    isCalendar = page === "calendar";
  const [region, setRegion] = useState("arabia"),
    [bbox, setBbox] = useState("43,12,61,32"),
    [start, setStart] = useState(today),
    [end, setEnd] = useState(today),
    [year, setYear] = useState(new Date().getUTCFullYear()),
    [sources, setSources] = useState<Source[]>(["MODIS_NRT", "VIIRS_SNPP_NRT"]),
    [history, setHistory] = useState(isCalendar),
    [grid, setGrid] = useState(0.25),
    [interval, setInterval] = useState<Interval>("daily"),
    [dayNight, setDayNight] = useState("all"),
    [confidence, setConfidence] = useState("all"),
    [aggregated, setAggregated] = useState(false),
    [visible, setVisible] = useState(true),
    [filters, setFilters] = useState(true);
  const [data, setData] = useState<FirePayload | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [selected, setSelected] = useState<Fire | null>(null),
    [selectedDay, setSelectedDay] = useState(""),
    [availability, setAvailability] = useState<Record<string, string>[] | null>(
      null,
    ),
    [availabilityError, setAvailabilityError] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("start")) setStart(p.get("start")!);
    if (p.get("end")) setEnd(p.get("end")!);
    if (p.get("bbox")) {
      setBbox(p.get("bbox")!);
      setRegion("custom");
    }
    if (p.get("sources"))
      setSources(
        p
          .get("sources")!
          .split(",")
          .filter((s) => SOURCES.includes(s as Source)) as Source[],
      );
    if (p.get("history") === "true") setHistory(true);
    if (["all", "D", "N"].includes(p.get("dayNight") ?? ""))
      setDayNight(p.get("dayNight")!);
    if (["all", "nominal", "high"].includes(p.get("confidence") ?? ""))
      setConfidence(p.get("confidence")!);
    return () => controller.current?.abort();
  }, []);
  const result = useMemo(() => {
    if (!data) return null;
    const view = data.aggregateViews?.[String(grid)];
    return view
      ? { ...view.base, ...view.intervals[interval] }
      : analyze(data, grid, interval);
  }, [data, grid, interval]);
  const calendar = useMemo(
    () =>
      data?.aggregateViews?.[String(grid)]?.base.series ??
      (data
        ? temporal(
            data.records,
            data.coverage,
            data.metadata.start,
            data.metadata.end,
            data.metadata.sources,
            "daily",
            grid,
          )
        : []),
    [data, grid],
  );
  const metric = aggregated ? "gridCells" : "count";
  const activeBounds = (data?.metadata.bounds ?? regions.arabia) as Bounds;
  const errorText = (code: string) =>
    ({
      MISSING_CREDENTIALS: t.setup,
      INVALID_QUERY: t.invalid,
      DATE_RANGE: t.range,
      RATE_LIMIT: t.rate,
      UPSTREAM_UNAVAILABLE: t.unavailable,
      INVALID_UPSTREAM: t.unavailable,
      RESPONSE_TOO_LARGE: t.tooLarge,
    })[code] ?? t.error;
  function params() {
    return new URLSearchParams({
      bbox,
      sources: sources.join(","),
      start: isCalendar ? `${year}-01-01` : start,
      end: isCalendar ? `${year}-12-31` : end,
      grid: String(grid),
      interval,
      dayNight,
      confidence,
      history: String(history || isCalendar),
    });
  }
  async function run(e?: React.FormEvent) {
    e?.preventDefault();
    setError("");
    setSelected(null);
    setSelectedDay("");
    setData(null);
    const b = bbox.split(",").map(Number);
    if (
      !sources.length ||
      b.length !== 4 ||
      b.some((v) => !Number.isFinite(v))
    ) {
      setError(t.invalid);
      return;
    }
    if (
      page === "compare" &&
      (!sources.some((s) => s.startsWith("MODIS")) ||
        !sources.some((s) => s.startsWith("VIIRS")))
    ) {
      setError(t.sourceRequired);
      return;
    }
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/fires${isCalendar ? "/calendar" : page === "compare" ? "/compare" : page === "analysis" ? "/summary" : ""}?${params()}`,
        { signal: abort.signal },
      );
      const body = await response.json();
      if (!response.ok) {
        setError(errorText(body.error?.code));
        return;
      }
      setData(body);
      if (isCalendar) setSelectedDay(body.metadata.start);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError(t.error);
    } finally {
      if (!abort.signal.aborted) setLoading(false);
    }
  }
  async function checkAvailability() {
    setAvailabilityError("");
    try {
      const r = await fetch("/api/fires/availability");
      const d = await r.json();
      if (!r.ok) {
        setAvailabilityError(errorText(d.error?.code));
        return;
      }
      setAvailability(d.sources);
    } catch {
      setAvailabilityError(t.error);
    }
  }
  function exportData(kind: "csv" | "json") {
    if (!data) return;
    const metadata = {
      ...data.metadata,
      recordType: data.metadata.recordScope ?? "normalized-detections",
      exportedAt: new Date().toISOString(),
      gridDegrees: grid,
      interval,
      filters: data.metadata.filters,
      metric: aggregated ? "occupied cells" : "raw detections",
      limitations: data.metadata.limitations,
    };
    const escape = (v: unknown) => {
      let s = String(v ?? "");
      if (/^[=+@\-]/.test(s)) s = "'" + s;
      return '"' + s.replaceAll('"', '""') + '"';
    };
    const fields = [
      "id",
      "latitude",
      "longitude",
      "acquisitionDate",
      "acquisitionTimeUTC",
      "satellite",
      "instrument",
      "source",
      "processingType",
      "brightness",
      "brightnessType",
      "frp",
      "confidence",
      "confidenceType",
      "dayNight",
      "scan",
      "track",
      "version",
    ] as const;
    const content =
      kind === "json"
        ? JSON.stringify(
            {
              metadata,
              records: data.records,
              coverage: data.coverage,
              analytics: result,
            },
            null,
            2,
          )
        : [
            ...Object.entries(metadata).map(([k, v]) =>
              [
                escape("# " + k),
                escape(typeof v === "object" ? JSON.stringify(v) : v),
              ].join(","),
            ),
            ...(data.metadata.recordScope === "aggregates-only" && result
              ? [
                  "date,detection_count,observed_count,occupied_grid_cells,complete,queried_source_days,expected_source_days",
                  ...result.series.map((r) =>
                    [
                      r.date,
                      r.count ?? "",
                      r.observedCount,
                      r.gridCells ?? "",
                      r.complete,
                      r.queriedSourceDays,
                      r.expectedSourceDays,
                    ]
                      .map(escape)
                      .join(","),
                  ),
                ]
              : [
                  fields.join(","),
                  ...data.records.map((r) =>
                    fields.map((f) => escape(r[f])).join(","),
                  ),
                ]),
          ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob([content], {
        type: kind === "json" ? "application/json" : "text/csv;charset=utf-8",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `thermion-${data.metadata.start}.${kind}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const selectedStats = calendar.find((d) => d.date === selectedDay);
  const completeDays = calendar.filter((d) => d.complete).length;
  const colors = ["#211d18", "#543722", "#87502d", "#b16a3b", "#e08a4b"];
  const max = Math.max(1, ...calendar.map((d) => d[metric] ?? 0));
  return (
    <>
      <div className="workspace-toolbar">
        <button
          type="button"
          onClick={() => setFilters(!filters)}
          aria-expanded={filters}
        >
          <SlidersHorizontal size={15} />
          {t.filters}
        </button>
        <span className="caption">{t.standard}</span>
        <div className="export-buttons">
          <button disabled={!data} onClick={() => exportData("csv")}>
            <Download size={14} />
            {t.csv}
          </button>
          <button disabled={!data} onClick={() => exportData("json")}>
            {t.json}
          </button>
        </div>
      </div>
      <div
        className={filters ? "workspace-layout" : "workspace-layout no-sidebar"}
      >
        {filters && (
          <aside className="filter-panel">
            <form onSubmit={run}>
              <label>
                {t.region}
                <select
                  value={region}
                  onChange={(e) => {
                    const r = e.target.value;
                    setRegion(r);
                    if (r !== "custom")
                      setBbox(regions[r as keyof typeof regions].join(","));
                  }}
                >
                  {Object.keys(regions).map((r) => (
                    <option key={r} value={r}>
                      {t[r as keyof typeof regions]}
                    </option>
                  ))}
                  <option value="custom">{t.custom}</option>
                </select>
              </label>
              <label>
                {t.bounds}
                <input
                  dir="ltr"
                  value={bbox}
                  onChange={(e) => {
                    setBbox(e.target.value);
                    setRegion("custom");
                  }}
                  required
                />
              </label>
              {isCalendar ? (
                <label>
                  {t.year}
                  <input
                    type="number"
                    min="2000"
                    max={new Date().getUTCFullYear()}
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                  />
                </label>
              ) : (
                <>
                  <label>
                    {t.start}
                    <input
                      type="date"
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    {t.end}
                    <input
                      type="date"
                      value={end}
                      onChange={(e) => setEnd(e.target.value)}
                      required
                    />
                  </label>
                </>
              )}
              <fieldset>
                <legend>{t.sources}</legend>
                {SOURCES.map((s) => (
                  <label className="checkbox" key={s}>
                    <input
                      type="checkbox"
                      checked={sources.includes(s)}
                      onChange={(e) =>
                        setSources(
                          e.target.checked
                            ? [...sources, s]
                            : sources.filter((v) => v !== s),
                        )
                      }
                    />
                    <span dir="ltr">{s}</span>
                  </label>
                ))}
              </fieldset>
              <p className="caption">
                {locale === "ar"
                  ? "اختر حتى أربعة مصادر."
                  : "Select up to four sources."}
              </p>
              {!isCalendar && (
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={history}
                    onChange={(e) => setHistory(e.target.checked)}
                  />
                  {t.history}
                </label>
              )}
              <label>
                {t.dayNight}
                <select
                  value={dayNight}
                  onChange={(e) => setDayNight(e.target.value)}
                >
                  {["all", "D", "N"].map((v) => (
                    <option key={v} value={v}>
                      {t[v as "all" | "D" | "N"]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t.confidence}
                <select
                  value={confidence}
                  onChange={(e) => setConfidence(e.target.value)}
                >
                  {["all", "nominal", "high"].map((v) => (
                    <option key={v} value={v}>
                      {t[v as "all" | "nominal" | "high"]}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="primary-button"
                disabled={loading}
              >
                {loading ? t.loading : t.apply}
              </button>
            </form>
            <div className="availability">
              <button onClick={checkAvailability}>{t.fetchAvailability}</button>
              <p className="caption">{t.availabilityNote}</p>
              {availabilityError && <p role="alert">{availabilityError}</p>}
              {availability && (
                <div className="availability-list">
                  {availability
                    .filter((a) =>
                      sources.includes((a.data_id ?? a.source) as Source),
                    )
                    .map((a, i) => (
                      <p key={i} dir="ltr">
                        {a.data_id ?? a.source}
                        <br />
                        {a.min_date} — {a.max_date}
                      </p>
                    ))}
                </div>
              )}
            </div>
          </aside>
        )}
        <div className="workspace-content" aria-busy={loading}>
          <div className="view-controls">
            <label>
              {t.mode}
              <select
                value={aggregated ? "grid" : "raw"}
                onChange={(e) => setAggregated(e.target.value === "grid")}
              >
                <option value="raw">{t.raw}</option>
                <option value="grid">{t.aggregated}</option>
              </select>
            </label>
            <label>
              {t.grid}
              <select
                value={grid}
                onChange={(e) => setGrid(Number(e.target.value))}
              >
                {[0.1, 0.25, 0.5, 1].map((v) => (
                  <option key={v} value={v}>
                    {v}°
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t.interval}
              <select
                value={interval}
                onChange={(e) => setInterval(e.target.value as Interval)}
              >
                {["daily", "weekly", "monthly", "yearly"].map((v) => (
                  <option key={v} value={v}>
                    {t[v as Interval]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {loading && (
            <p className="status" role="status">
              {t.loading}
            </p>
          )}
          {error && (
            <p className="status error" role="alert">
              {error}
            </p>
          )}
          {!data && !loading && !error && (
            <p className="status">{t.unqueried}</p>
          )}
          {data && result && (
            <>
              <div className="query-summary">
                <div>
                  <strong>{result.total.toLocaleString(locale)}</strong>
                  <span>{t.observed}</span>
                </div>
                <div>
                  <strong>{result.cells.length.toLocaleString(locale)}</strong>
                  <span>
                    {t.cells} · {grid}°
                  </span>
                </div>
                <div>
                  <strong>
                    {result.queriedSourceDays} / {result.expectedSourceDays}
                  </strong>
                  <span>{t.coverage}</span>
                </div>
              </div>
              <p className="caption query-meta" dir="ltr">
                {data.metadata.sources.join(" + ")} · {data.metadata.start} —{" "}
                {data.metadata.end} UTC · {data.metadata.bounds.join(", ")}
              </p>
              <p className="caption">
                {t.refresh}: <bdi>{data.metadata.fetchedAt || t.missing}</bdi> ·{" "}
                {t.dayNight}: {t[data.metadata.filters?.dayNight ?? "all"]} ·{" "}
                {t.confidence}: {t[data.metadata.filters?.confidence ?? "all"]}
              </p>
              {result.queriedSourceDays === 0 && (
                <p className="status">
                  {history || isCalendar ? t.noHistory : t.missing}
                </p>
              )}
              {result.total === 0 && result.queriedSourceDays > 0 && (
                <p className="status">{t.noData}</p>
              )}
            </>
          )}
          {isCalendar && data && (
            <>
              <section className="panel calendar-panel">
                <div className="panel-heading">
                  <h2>{data.metadata.start.slice(0, 4)}</h2>
                  <span className="caption">
                    {aggregated ? t.cells : t.count} · UTC
                  </span>
                </div>
                <div className="year-calendar">
                  {Array.from({ length: 12 }, (_, month) => {
                    const ds = calendar.filter(
                      (d) => Number(d.date.slice(5, 7)) === month + 1,
                    );
                    return (
                      <section key={month} className="calendar-month">
                        <h3>
                          {format(new Date(Date.UTC(year, month, 1)), "MMMM", {
                            locale: locale === "ar" ? arSA : enUS,
                          })}
                        </h3>
                        <div className="month-cells" dir="ltr">
                          {ds.map((d, i) => (
                            <button
                              key={d.date}
                              style={{
                                background:
                                  d[metric] === null
                                    ? "repeating-linear-gradient(135deg,#151311,#151311 3px,#302a24 3px,#302a24 4px)"
                                    : colors[
                                        d[metric] === 0
                                          ? 0
                                          : Math.min(
                                              4,
                                              Math.max(
                                                1,
                                                Math.ceil(
                                                  ((d[metric] ?? 0) / max) * 4,
                                                ),
                                              ),
                                            )
                                      ],
                                gridColumnStart:
                                  i === 0
                                    ? new Date(d.date).getUTCDay() + 1
                                    : undefined,
                              }}
                              onClick={() => setSelectedDay(d.date)}
                              aria-pressed={selectedDay === d.date}
                              aria-label={`${d.date}: ${d[metric] === null ? t.missing : d[metric]}`}
                              title={`${d.date}: ${d[metric] === null ? t.missing : d[metric]}`}
                            >
                              {Number(d.date.slice(-2))}
                            </button>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
                <div className="calendar-legend">
                  <span className="missing-swatch" />
                  {t.missing}
                  {colors.map((color, i) => (
                    <span
                      key={color}
                      style={{ background: color }}
                      title={
                        i === 0 ? t.zero : String(Math.ceil((max * i) / 4))
                      }
                    />
                  ))}
                  <span>
                    {t.legend} · 0 — {max}
                  </span>
                </div>
                <p className="caption">
                  {completeDays} / {calendar.length} · {t.complete}
                </p>
              </section>
              {selectedStats && (
                <section className="panel">
                  <h2>
                    {t.calendarDay}: <bdi>{selectedDay}</bdi>
                  </h2>
                  <p>
                    {t.count}: {selectedStats.count ?? t.missing} · {t.cells}:{" "}
                    {selectedStats.gridCells ?? t.missing}
                  </p>
                  <p>
                    {t.coverage}: {selectedStats.queriedSourceDays} /{" "}
                    {selectedStats.expectedSourceDays}
                  </p>
                  <p dir="ltr">
                    {data.metadata.sources
                      .filter((s) =>
                        data.coverage.some(
                          (c) =>
                            c.source === s &&
                            c.date === selectedDay &&
                            c.status === "queried",
                        ),
                      )
                      .join(" · ")}
                  </p>
                  <p className="caption">{t.baseline}</p>
                  <Link
                    className="text-accent"
                    href={`/explore?${new URLSearchParams({ start: selectedDay, end: selectedDay, bbox: data.metadata.bounds.join(","), sources: data.metadata.sources.join(","), history: "true", dayNight: data.metadata.filters?.dayNight ?? "all", confidence: data.metadata.filters?.confidence ?? "all" })}`}
                  >
                    {t.viewDay} →
                  </Link>
                </section>
              )}
            </>
          )}
          {(page === "explore" || page === "compare") && (
            <>
              <div className="map-controls">
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={visible}
                    onChange={(e) => setVisible(e.target.checked)}
                  />
                  {t.layer}
                </label>
                <span className="caption">
                  {aggregated ? t.cells : t.count} · {t.standard}
                </span>
              </div>
              <FireMap
                records={data?.records ?? []}
                bounds={activeBounds}
                visible={visible}
                grid={grid}
                aggregated={aggregated}
                onSelect={setSelected}
                onExtent={(b) => {
                  setBbox(b.map((n) => Number(n.toFixed(4))).join(","));
                  setRegion("custom");
                  setFilters(true);
                }}
                t={t}
                compare={page === "compare"}
              />
              {page === "explore" && (
                <section className="panel">
                  <h2>{t.selected}</h2>
                  {aggregated && (
                    <p className="caption">
                      {locale === "ar"
                        ? "تحديد خلية يعرض رصدًا ممثلًا؛ تُصدّر جميع السجلات المتاحة."
                        : "Selecting a grid point shows a representative observation; exports include all available records."}
                    </p>
                  )}
                  {selected ? (
                    <>
                      <dl className="detection-details">
                        {(
                          [
                            ["lat", selected.latitude],
                            ["lon", selected.longitude],
                            ["date", selected.acquisitionDate],
                            ["time", selected.acquisitionTimeUTC],
                            ["satellite", selected.satellite],
                            ["instrument", selected.instrument],
                            ["source", selected.source],
                            ["processing", selected.processingType],
                            ["brightness", selected.brightness],
                            ["frp", selected.frp],
                            [
                              "confidence",
                              selected.confidence === undefined
                                ? undefined
                                : `${selected.confidence} (${selected.confidenceType})`,
                            ],
                            ["dayNight", selected.dayNight],
                            ["scan", selected.scan],
                            ["track", selected.track],
                            ["version", selected.version],
                          ] as const
                        )
                          .filter(([, v]) => v !== undefined)
                          .map(([key, v]) => (
                            <div key={key}>
                              <dt>{t[key]}</dt>
                              <dd dir="ltr">{v}</dd>
                            </div>
                          ))}
                      </dl>
                      <details>
                        <summary>{t.rawMetadata}</summary>
                        <pre dir="ltr">
                          {JSON.stringify(selected.rawProperties, null, 2)}
                        </pre>
                      </details>
                    </>
                  ) : (
                    <p className="caption">{t.select}</p>
                  )}
                </section>
              )}
            </>
          )}
          {page === "compare" && (
            <section className="panel">
              <h2>{t.comparisonNote}</h2>
              <p>{t.comparisonBody}</p>
              <p className="caption">{t.coverageMode}</p>
              {result && (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>{t.source}</th>
                        <th>{t.count}</th>
                        <th>
                          {t.cells} · {grid}°
                        </th>
                        <th>{t.coverage}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.sources.map((s) => (
                        <tr key={s.source}>
                          <td dir="ltr">{s.source}</td>
                          <td>{s.queriedDays ? s.count : t.missing}</td>
                          <td>{s.queriedDays ? s.cells : t.missing}</td>
                          <td>{s.queriedDays}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
          {result &&
            (page === "analysis" || page === "compare" || isCalendar) && (
              <>
                <Charts
                  series={result.series}
                  monthly={result.monthly}
                  annual={result.annual}
                  comparison={
                    page === "compare" ? result.comparison : undefined
                  }
                  sources={result.sources}
                  dayNight={result.dayNight}
                  t={t}
                  period={`${data!.metadata.start} — ${data!.metadata.end}`}
                  metric={metric}
                />
                <section className="panel">
                  <h2>{t.method}</h2>
                  <p>
                    {t.standard} · {grid}° · {t[interval]} · UTC
                  </p>
                  <p className="caption">{t.availabilityNote}</p>
                  <p>
                    {result.baseline.available ? t.baselineMethod : t.baseline}
                  </p>
                </section>
                {result.baseline.available && (
                  <section className="panel">
                    <h2>{t.baselineTitle}</h2>
                    <p>{t.baselineMethod}</p>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>{t.date}</th>
                            <th>{t.count}</th>
                            <th>{t.baselineYears}</th>
                            <th>{t.baselineMean}</th>
                            <th>{t.difference}</th>
                            <th>{t.percentage}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.baseline.values.map((r) => (
                            <tr key={r.month}>
                              <td>{r.month}</td>
                              <td>{r.observed}</td>
                              <td>{r.baselineYears.join(", ")}</td>
                              <td>{r.baselineMean.toFixed(1)}</td>
                              <td>{r.difference.toFixed(1)}</td>
                              <td>
                                {r.percentage === null
                                  ? "—"
                                  : r.percentage.toFixed(1) + "%"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}
                {page === "analysis" && (
                  <section className="panel">
                    <h2>{t.spatial}</h2>
                    <p className="caption">
                      NASA FIRMS · {grid}° · {t.cells}
                    </p>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>{t.lon}</th>
                            <th>{t.lat}</th>
                            <th>{t.count}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.cells.slice(0, 100).map((c) => (
                            <tr key={c.cell}>
                              <td>{c.longitude.toFixed(3)}</td>
                              <td>{c.latitude.toFixed(3)}</td>
                              <td>{c.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {result.cells.length > 100 && (
                      <p className="caption">
                        {locale === "ar"
                          ? "أول 100 خلية؛ يتضمن تصدير JSON جميع الخلايا."
                          : "First 100 cells; JSON export contains all cells."}
                      </p>
                    )}
                  </section>
                )}
              </>
            )}
        </div>
      </div>
    </>
  );
}
