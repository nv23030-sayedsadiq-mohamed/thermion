import { ZodError } from "zod";
import { parseQuery } from "../validation/query";
import { fetchFires, availability, DataError } from "./client";
import { history } from "./history";
import { analyze } from "../analytics";
import { aggregateViews } from "../analytics/views";
export async function handle(request: Request, mode = "fires") {
  try {
    if (mode === "availability")
      return Response.json({ sources: await availability() });
    const url = new URL(request.url),
      q = parseQuery(url.searchParams);
    const data =
      mode === "calendar" || url.searchParams.get("history") === "true"
        ? await history(q)
        : await fetchFires(q);
    const summarized = mode === "calendar" || mode === "summary";
    const views = summarized ? aggregateViews(data) : undefined;
    const analytics = views
      ? {
          ...views[String(q.grid)].base,
          ...views[String(q.grid)].intervals[q.interval],
        }
      : analyze(data, q.grid, q.interval);
    const payload = {
      ...data,
      records: summarized ? [] : data.records,
      metadata: {
        ...data.metadata,
        recordScope: summarized ? "aggregates-only" : "normalized-detections",
      },
      analytics,
      aggregateViews: views,
    };
    const body = JSON.stringify(payload);
    if (Buffer.byteLength(body) > 8_000_000)
      throw new DataError(
        "RESPONSE_TOO_LARGE",
        413,
        "Processed response exceeds 8 MB. Choose a smaller area or date range.",
      );
    return new Response(body, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (e) {
    if (e instanceof ZodError)
      return Response.json(
        {
          error: {
            code: "INVALID_QUERY",
            message: "Invalid query parameters.",
            details: e.issues.map((i) => ({
              field: i.path.join("."),
              message: i.message,
            })),
          },
        },
        { status: 400 },
      );
    const error =
      e instanceof DataError
        ? e
        : new DataError(
            "INTERNAL_ERROR",
            500,
            "The request could not be completed.",
          );
    return Response.json(
      { error: { code: error.code, message: error.message } },
      {
        status: error.status,
        headers: error.status === 429 ? { "Retry-After": "60" } : {},
      },
    );
  }
}
