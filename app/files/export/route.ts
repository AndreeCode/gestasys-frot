import type { NextRequest } from "next/server";

import { forwardDownload } from "@/lib/api/download";

const ALLOWED = ["q", "health_facility_id", "status", "risk_level", "delimiter"];

export async function GET(request: NextRequest) {
  const params = new URLSearchParams();
  for (const key of ALLOWED) {
    const value = request.nextUrl.searchParams.get(key);
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return forwardDownload(`/pregnancies/export${query ? `?${query}` : ""}`);
}
