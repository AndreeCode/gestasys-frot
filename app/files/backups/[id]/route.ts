import type { NextRequest } from "next/server";

import { forwardDownload } from "@/lib/api/download";

export async function GET(_request: NextRequest, ctx: RouteContext<"/files/backups/[id]">) {
  const { id } = await ctx.params;
  return forwardDownload(`/backups/${encodeURIComponent(id)}/file`);
}
