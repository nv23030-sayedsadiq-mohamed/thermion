export function GET() {
  return Response.json(
    {
      status: "ok",
      firmsConfigured: Boolean(process.env.FIRMS_MAP_KEY),
      historicalStorage: "file snapshots",
      timestamp: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
