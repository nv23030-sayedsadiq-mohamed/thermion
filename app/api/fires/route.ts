import { handle } from "@/lib/firms/handler";
export const runtime = "nodejs";
export const maxDuration = 60;
export const GET = (request: Request) => handle(request);
