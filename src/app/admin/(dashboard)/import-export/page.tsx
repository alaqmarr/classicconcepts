import { getLiveBundleSummary } from "@/lib/data-import-export";
import { ImportExportManager } from "./ImportExportManager";

export const dynamic = "force-dynamic";

export default async function AdminImportExportPage() {
  const summary = await getLiveBundleSummary();
  return <ImportExportManager initialSummary={summary} />;
}
