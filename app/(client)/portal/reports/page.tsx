import { getDemoCompany } from "@/lib/portal/queries";
import { ClientPortalReportsView } from "./ClientPortalReportsView";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";

export default async function PortalReportsPage() {
  noStore();
  const company = await getDemoCompany();
  return <ClientPortalReportsView companyId={company.id} companyName={company.name} />;
}
