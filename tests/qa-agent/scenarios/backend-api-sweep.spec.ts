import { ScenarioCtx } from './_shared';
import { ApiClient } from '../api-client';

const ENDPOINTS = [
  { path: '/api/health', spec: 'infra' },
  { path: '/api/companies', spec: 'A1' },
  { path: '/api/clinics', spec: 'A1' },
  { path: '/api/providers', spec: 'A2/A3' },
  { path: '/api/reviewers', spec: 'B1' },
  { path: '/api/batches', spec: 'M1/D4' },
  { path: '/api/cases', spec: 'C/F' },
  { path: '/api/invoices', spec: 'G1/G2' },
  { path: '/api/payouts', spec: 'H1/H2' },
  { path: '/api/reports', spec: 'I' },
  { path: '/api/reassignments', spec: 'E3' },
  { path: '/api/prospects', spec: 'B7' },
  { path: '/api/quality', spec: 'I5/I6' },
  { path: '/api/corrective', spec: 'J4' },
  { path: '/api/feedback', spec: 'J3' },
  { path: '/api/company-forms', spec: 'C' },
  { path: '/api/contracts', spec: 'B7' },
  { path: '/api/notifications', spec: 'cross' },
  { path: '/api/tags', spec: 'admin' },
];

export const meta = { name: 'backend-api-sweep', persona: 'backend' as const };
export async function run(ctx: ScenarioCtx) {
  const api = new ApiClient();
  await api.loginAs('admin');
  for (const e of ENDPOINTS) {
    const r = await api.get(e.path).catch((err) => ({ status: 0, ok: false, json: null, text: String(err) }));
    if (r.status === 0) {
      ctx.logger.log({ spec_section: e.spec, severity: 'high', category: 'functional', title: `GET ${e.path} threw`, description: String(r.text).slice(0, 200) });
    } else if (r.status === 404) {
      ctx.logger.log({ spec_section: e.spec, severity: 'low', category: 'not-yet-built', title: `GET ${e.path} 404`, description: 'Endpoint missing or not implemented as GET.' });
    } else if (r.status === 401 || r.status === 403) {
      ctx.logger.log({ spec_section: e.spec, severity: 'medium', category: 'security', title: `GET ${e.path} ${r.status}`, description: 'Admin persona could not access endpoint — check role gating.' });
    } else if (r.status >= 500) {
      ctx.logger.log({ spec_section: e.spec, severity: 'critical', category: 'functional', title: `GET ${e.path} ${r.status}`, description: String(r.text).slice(0, 300) });
    }
  }
}
