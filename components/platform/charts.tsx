"use client";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import type { PlatformDictionary } from "@/lib/i18n/platform";
export default function Charts({
  series,
  monthly,
  annual,
  comparison,
  sources,
  dayNight,
  t,
  period,
  metric,
}: {
  series: Record<string, unknown>[];
  monthly: Record<string, unknown>[];
  annual: Record<string, unknown>[];
  comparison?: Record<string, unknown>[];
  sources: { source: string; count: number; cells: number }[];
  dayNight: { name: string; count: number }[];
  t: PlatformDictionary;
  period: string;
  metric: "count" | "gridCells";
}) {
  const line = (data: Record<string, unknown>[], key: string) => (
    <ResponsiveContainer width="100%" height={245}>
      <LineChart
        data={data}
        margin={{ left: 0, right: 20, top: 20, bottom: 10 }}
      >
        <CartesianGrid stroke="#2a2622" vertical={false} />
        <XAxis
          dataKey="date"
          stroke="#a8a097"
          tick={{ fontSize: 10 }}
          minTickGap={30}
        />
        <YAxis
          stroke="#a8a097"
          tick={{ fontSize: 10 }}
          allowDecimals={false}
          width={45}
        />
        <Tooltip
          contentStyle={{ background: "#151311", border: "1px solid #40352c" }}
        />
        <Line
          type="linear"
          dataKey={key}
          name={metric === "count" ? t.count : t.cells}
          stroke="#e08a4b"
          strokeWidth={2}
          dot={data.length < 32}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
  const bar = (data: Record<string, unknown>[], key: string) => (
    <ResponsiveContainer width="100%" height={245}>
      <BarChart data={data}>
        <CartesianGrid stroke="#2a2622" vertical={false} />
        <XAxis dataKey="name" stroke="#a8a097" tick={{ fontSize: 10 }} />
        <YAxis stroke="#a8a097" allowDecimals={false} width={45} />
        <Tooltip
          contentStyle={{ background: "#151311", border: "1px solid #40352c" }}
        />
        <Bar dataKey={key} name={t.count} fill="#b16d40" />
      </BarChart>
    </ResponsiveContainer>
  );
  return (
    <div className="charts-grid">
      {comparison && (
        <section className="panel">
          <h2>{t.comparisonSeries}</h2>
          <p className="caption">
            NASA FIRMS · {period} · {t.count} · UTC
          </p>
          <div dir="ltr">
            <ResponsiveContainer width="100%" height={245}>
              <LineChart data={comparison}>
                <CartesianGrid stroke="#2a2622" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#a8a097"
                  tick={{ fontSize: 10 }}
                  minTickGap={30}
                />
                <YAxis stroke="#a8a097" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "#151311",
                    border: "1px solid #40352c",
                  }}
                />
                <Line dataKey="MODIS" stroke="#e08a4b" connectNulls={false} />
                <Line dataKey="VIIRS" stroke="#c6b8a7" connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
      <section className="panel">
        <h2>{t.annual}</h2>
        <p className="caption">
          NASA FIRMS · {period} · {metric === "count" ? t.count : t.cells} · UTC
        </p>
        <div dir="ltr">{line(annual, metric)}</div>
      </section>
      <section className="panel">
        <h2>{t.series}</h2>
        <p className="caption">
          {period} · {metric === "count" ? t.count : t.cells} · UTC
        </p>
        <div dir="ltr">{line(series, metric)}</div>
      </section>
      <section className="panel">
        <h2>{t.monthlyTitle}</h2>
        <p className="caption">
          {period} · {metric === "count" ? t.count : t.cells} · UTC
        </p>
        <div dir="ltr">{line(monthly, metric)}</div>
      </section>
      <section className="panel">
        <h2>{t.composition}</h2>
        <p className="caption">
          NASA FIRMS · {t.count} · {period}
        </p>
        <div dir="ltr">
          {bar(
            sources.map((s) => ({ name: s.source, count: s.count })),
            "count",
          )}
        </div>
      </section>
      <section className="panel">
        <h2>{t.nightChart}</h2>
        <p className="caption">
          NASA FIRMS · {t.count} · {period}
        </p>
        <div dir="ltr">
          {bar(
            dayNight.map((s) => ({
              name: s.name === "D" ? t.D : s.name === "N" ? t.N : t.unknown,
              count: s.count,
            })),
            "count",
          )}
        </div>
      </section>
    </div>
  );
}
