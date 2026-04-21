// Peerspectiv contract templates — plain text, template-literal interpolation.
// Returns strings only. Used by the contracts generation pipeline.

export interface ServiceAgreementParams {
  companyName: string;
  contactName: string;
  address: string;
  city: string;
  state: string;
  reviewCycle: string; // e.g. 'quarterly' | 'annual'
  estimatedProviders: number;
  effectiveDate: string; // ISO date
}

export interface BAAParams {
  companyName: string;
  contactName: string;
  effectiveDate: string; // ISO date
}

export function generateServiceAgreementText(
  params: ServiceAgreementParams
): string {
  const {
    companyName,
    contactName,
    address,
    city,
    state,
    reviewCycle,
    estimatedProviders,
    effectiveDate,
  } = params;

  return `PEER REVIEW SERVICES AGREEMENT

This Peer Review Services Agreement ("Agreement") is entered into as of ${effectiveDate} ("Effective Date") by and between Peerspectiv LLC ("Peerspectiv"), a Texas limited liability company, and ${companyName} ("Client"), with its principal place of business at ${address}, ${city}, ${state}.

1. SERVICES. Peerspectiv shall provide independent, board-certified medical peer review services to Client on a ${reviewCycle} basis, covering approximately ${estimatedProviders} providers per cycle. Services include chart selection coordination, AI-assisted pre-analysis, independent reviewer assignment, structured scoring against FQHC quality criteria, corrective-action recommendations, and compliance reporting suitable for HRSA, UDS, and accreditation submission.

2. TURNAROUND. Peerspectiv shall deliver completed peer review packets within ten (10) business days of chart receipt for each case, barring material deficiencies in submitted documentation. Cycle-level compliance reports shall be delivered within fifteen (15) business days of cycle close.

3. CONFIDENTIALITY. Each party shall hold in strict confidence all non-public information of the other, including Protected Health Information ("PHI") as defined under HIPAA. PHI is governed by the Business Associate Agreement executed concurrently herewith, which is incorporated by reference. Confidentiality obligations survive termination of this Agreement.

4. FEES. Fees are billed per completed review at the per-review rate set forth in the accompanying pricing schedule. Invoices are issued monthly, net thirty (30) days. Late balances accrue interest at 1.5% per month.

5. TERM AND TERMINATION. This Agreement commences on the Effective Date and continues for an initial twelve (12) month term, automatically renewing for successive one-year terms unless either party gives sixty (60) days' written notice of non-renewal. Either party may terminate for material breach upon thirty (30) days' written notice and opportunity to cure.

6. LIMITATION OF LIABILITY. Peerspectiv's aggregate liability shall not exceed fees paid by Client in the twelve months preceding the claim. Peer review determinations are advisory; clinical and credentialing decisions remain the sole responsibility of Client.

7. GOVERNING LAW. This Agreement is governed by the laws of the State of Texas, without regard to conflicts of law principles.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the Effective Date.

CLIENT: ${companyName}
By: ___________________________   Date: __________
Name: ${contactName}
Title: __________________________

PEERSPECTIV LLC
By: ___________________________   Date: __________
Name: Ashton Nagalla
Title: Founder & Managing Member
`;
}

export function generateBAAText(params: BAAParams): string {
  const { companyName, contactName, effectiveDate } = params;

  return `BUSINESS ASSOCIATE AGREEMENT

This Business Associate Agreement ("BAA") is entered into as of ${effectiveDate} ("Effective Date") by and between ${companyName} ("Covered Entity") and Peerspectiv LLC ("Business Associate") pursuant to the Health Insurance Portability and Accountability Act of 1996 ("HIPAA"), the HITECH Act, and the implementing regulations at 45 CFR Parts 160 and 164, including the requirements of 45 CFR 164.504(e).

1. PERMITTED USES AND DISCLOSURES. Business Associate may use and disclose Protected Health Information ("PHI") received from, or created or received on behalf of, Covered Entity solely to perform peer review services under the Peer Review Services Agreement and as Required by Law. Business Associate shall not use or disclose PHI in any manner that would violate Subpart E of 45 CFR Part 164 if done by Covered Entity, except that Business Associate may use PHI for its proper management and administration and to provide data aggregation services as permitted under 45 CFR 164.504(e)(2)(i)(B).

2. SAFEGUARDS. Business Associate shall implement administrative, physical, and technical safeguards required by Subpart C of 45 CFR Part 164 to prevent use or disclosure of PHI other than as provided in this BAA. Safeguards include encryption in transit (TLS 1.2+) and at rest (AES-256), role-based access controls, audit logging, multi-factor authentication for administrative access, and annual HIPAA workforce training.

3. DATA RETENTION. Business Associate shall delete original patient chart files (PDFs and extracted text) within thirty (30) days of completion of the associated peer review. De-identified analytical data and structured review findings required for Client's regulatory and compliance reporting shall be retained for seven (7) years in accordance with HRSA, CMS, and Texas Medical Board retention requirements. Chart files are deleted automatically by scheduled job; retention records are maintained in the audit log.

4. BREACH NOTIFICATION. Business Associate shall report to Covered Entity any use or disclosure of PHI not permitted by this BAA, any Security Incident of which it becomes aware, and any Breach of Unsecured PHI as required by 45 CFR 164.410, without unreasonable delay and in no case later than five (5) business days after discovery. The report shall include identification of each individual whose Unsecured PHI was involved, a description of the Breach, and mitigation steps taken.

5. SUBCONTRACTORS. Business Associate shall ensure any subcontractor that creates, receives, maintains, or transmits PHI on its behalf agrees in writing to the same restrictions and conditions that apply to Business Associate. Current subcontractors with access to PHI include: Supabase (database and file storage, HIPAA BAA executed), Vercel (application hosting, HIPAA BAA executed), and Anthropic (AI inference for chart analysis, HIPAA BAA executed via Zero Data Retention endpoint). Business Associate shall notify Covered Entity of any material change to this subcontractor list.

6. TERM AND TERMINATION. This BAA is effective as of the Effective Date and terminates upon termination of the underlying Peer Review Services Agreement. Upon termination, Business Associate shall return or destroy all PHI received from Covered Entity that it still maintains, or, if such return or destruction is infeasible, extend the protections of this BAA to the retained PHI.

7. INDIVIDUAL RIGHTS. Business Associate shall make PHI available to Covered Entity as necessary to respond to individuals' requests for access (45 CFR 164.524), amendment (45 CFR 164.526), and accounting of disclosures (45 CFR 164.528) within fifteen (15) business days of Covered Entity's request.

IN WITNESS WHEREOF, the parties have executed this BAA as of the Effective Date.

COVERED ENTITY: ${companyName}
By: ___________________________   Date: __________
Name: ${contactName}
Title: __________________________

BUSINESS ASSOCIATE: Peerspectiv LLC
By: ___________________________   Date: __________
Name: Ashton Nagalla
Title: Founder & HIPAA Security Officer
`;
}
