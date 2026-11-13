import type { Fire, Source, Coverage } from "../../types/fire";
export function validDate(s: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    !Number.isNaN(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s
  );
}
export function dates(start: string, end: string) {
  const out: string[] = [];
  for (let d = Date.parse(start); d <= Date.parse(end); d += 86400000)
    out.push(new Date(d).toISOString().slice(0, 10));
  return out;
}
export function deduplicate(records: Fire[]) {
  return [...new Map(records.map((r) => [r.id, r])).values()];
}
/** Equal-angle geographic grid, anchored at -180,-90. Degrees are not constant-area kilometres. */
export function gridKey(r: Fire, size: number) {
  return `${Math.min(Math.ceil(360 / size) - 1, Math.floor((r.longitude + 180) / size))},${Math.min(Math.ceil(180 / size) - 1, Math.floor((r.latitude + 90) / size))}`;
}
export function spatial(records: Fire[], size: number) {
  const cells = new Map<
    string,
    {
      cell: string;
      count: number;
      longitude: number;
      latitude: number;
      sources: Set<string>;
    }
  >();
  for (const r of records) {
    const key = gridKey(r, size);
    const [x, y] = key.split(",").map(Number);
    const c = cells.get(key) ?? {
      cell: key,
      count: 0,
      longitude: -180 + (x + 0.5) * size,
      latitude: -90 + (y + 0.5) * size,
      sources: new Set<string>(),
    };
    c.count++;
    c.sources.add(r.source);
    cells.set(key, c);
  }
  return [...cells.values()].map((c) => ({ ...c, sources: [...c.sources] }));
}
export type Interval = "daily" | "weekly" | "monthly" | "yearly";
export function period(date: string, interval: Interval) {
  if (interval === "yearly") return date.slice(0, 4);
  if (interval === "monthly") return date.slice(0, 7);
  if (interval === "weekly") {
    const d = new Date(date);
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    return d.toISOString().slice(0, 10);
  }
  return date;
}
export function temporal(
  records: Fire[],
  coverage: Coverage[],
  start: string,
  end: string,
  sources: Source[],
  interval: Interval = "daily",
  size = 0.25,
) {
  const days = dates(start, end);
  const groups = new Map<string, string[]>();
  for (const d of days) {
    const key = period(d, interval);
    groups.set(key, [...(groups.get(key) ?? []), d]);
  }
  const byPeriod = new Map<string, Fire[]>();
  for (const record of records) {
    if (record.acquisitionDate < start || record.acquisitionDate > end)
      continue;
    const key = period(record.acquisitionDate, interval);
    const rows = byPeriod.get(key) ?? [];
    rows.push(record);
    byPeriod.set(key, rows);
  }
  const covered = new Set(
    coverage
      .filter((c) => c.status === "queried")
      .map((c) => `${c.source}:${c.date}`),
  );
  return [...groups].map(([date, ds]) => {
    const rows = byPeriod.get(date) ?? [];
    const complete = ds.every((d) =>
      sources.every((s) => covered.has(`${s}:${d}`)),
    );
    return {
      date,
      count: complete ? rows.length : null,
      observedCount: rows.length,
      gridCells: complete ? spatial(rows, size).length : null,
      complete,
      queriedSourceDays: ds.reduce(
        (n, d) => n + sources.filter((s) => covered.has(`${s}:${d}`)).length,
        0,
      ),
      expectedSourceDays: ds.length * sources.length,
    };
  });
}
