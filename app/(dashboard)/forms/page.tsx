import { db } from '@/lib/db';
import { companyForms, companies } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { FormsView } from './FormsView';

export const dynamic = 'force-dynamic';

export default async function FormsPage() {
  const rows = await db
    .select({
      id: companyForms.id,
      companyId: companyForms.companyId,
      companyName: companies.name,
      specialty: companyForms.specialty,
      formName: companyForms.formName,
      formFields: companyForms.formFields,
      isActive: companyForms.isActive,
      approvedBy: companyForms.approvedBy,
      approvedAt: companyForms.approvedAt,
      createdAt: companyForms.createdAt,
      templatePdfUrl: companyForms.templatePdfUrl,
      templatePdfName: companyForms.templatePdfName,
      scoringSystem: companyForms.scoringSystem,
    })
    .from(companyForms)
    .leftJoin(companies, eq(companies.id, companyForms.companyId))
    .orderBy(asc(companies.name), asc(companyForms.specialty));

  const companyList = await db
    .select({ id: companies.id, name: companies.name })
    .from(companies)
    .orderBy(asc(companies.name));

  return <FormsView forms={rows} companies={companyList} />;
}
