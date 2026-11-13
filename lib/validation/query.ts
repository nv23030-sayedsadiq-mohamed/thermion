import { z } from "zod";
import { SOURCES } from "../../types/fire";
import { validDate } from "../harmonization";
const date = z.string().refine(validDate, "Expected a real YYYY-MM-DD date");
export const querySchema = z
  .object({
    bbox: z
      .string()
      .default("43,12,61,32")
      .refine(
        (v) => v.split(",").every((s) => s.trim() !== ""),
        "Coordinate values cannot be empty",
      )
      .transform((v) => v.split(",").map(Number))
      .refine(
        (v) =>
          v.length === 4 &&
          v.every(Number.isFinite) &&
          v[0] >= -180 &&
          v[2] <= 180 &&
          v[1] >= -90 &&
          v[3] <= 90 &&
          v[0] < v[2] &&
          v[1] < v[3] &&
          (v[2] - v[0]) * (v[3] - v[1]) <= 5000,
        "Invalid or excessive bounding box (maximum 5,000 square degrees)",
      ),
    sources: z
      .string()
      .default("MODIS_NRT,VIIRS_SNPP_NRT")
      .transform((v) => [...new Set(v.split(","))])
      .pipe(z.array(z.enum(SOURCES)).min(1).max(4)),
    start: date,
    end: date,
    grid: z.coerce
      .number()
      .refine((v) => [0.1, 0.25, 0.5, 1].includes(v))
      .default(0.25),
    interval: z.enum(["daily", "weekly", "monthly", "yearly"]).default("daily"),
    dayNight: z.enum(["all", "D", "N"]).default("all"),
    confidence: z.enum(["all", "nominal", "high"]).default("all"),
  })
  .superRefine((v, c) => {
    if ((Date.parse(v.end) - Date.parse(v.start)) / 86400000 > 1095)
      c.addIssue({
        code: "custom",
        message: "Maximum query span is three years",
      });
    if (v.end < v.start)
      c.addIssue({ code: "custom", message: "End precedes start" });
  });
export type Query = z.infer<typeof querySchema>;
export function parseQuery(params: URLSearchParams) {
  return querySchema.parse(Object.fromEntries(params));
}
