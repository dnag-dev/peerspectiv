import { getDemoCompany } from "@/lib/portal/queries";
import { ClientPortalReportsView } from "./ClientPortalReportsView";

export const dynamic = "force-dynamic";

export default async function PortalReportsPage() {
  const company = await getDemoCompany();
  return <ClientPortalReportsView companyId={company.id} companyName={company.name} />;
}
