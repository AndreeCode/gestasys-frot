import { forwardDownload } from "@/lib/api/download";

export async function GET() {
  return forwardDownload("/pregnancies/import/template");
}
