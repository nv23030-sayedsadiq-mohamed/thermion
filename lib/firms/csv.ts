/** RFC 4180-style parser: quoted commas, escaped quotes, CRLF and embedded newlines. */
export function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (quoted) throw new Error("Malformed CSV");
  row.push(field);
  if (row.some(Boolean)) rows.push(row);
  const header =
    rows.shift()?.map((v) => v.replace(/^\uFEFF/, "").trim()) ?? [];
  return rows.map((r) =>
    Object.fromEntries(header.map((h, i) => [h, r[i]?.trim() ?? ""])),
  );
}
