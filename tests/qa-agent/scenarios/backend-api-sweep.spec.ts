/**
 * Backend API sweep — hits ~40 endpoints with valid + invalid + missing-auth.
 */
import { ScenarioCtx } from './_shared';
import { ApiClient } from '../api-client';

export const meta = { name: 'backend-api-sweep', persona: 'backend' as const };

interface Probe {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  spec: string;
  body?: any;
  authRole?: 'admin' | 'client' | 'reviewer' | null;
  expect: number[]; // acceptable statuses
  perfMs?: number;
}

const probes: Probe[] = [
  // Public
  { method: 'GET', path: '/api/health', spec: 'L', authRole: null, expect: [200] },
  // Authenticated reads / writes
  { method: 'GET', path: '/api/notifications', spec: 'L', authRole: 'admin', expect: [200, 401] },
  { method: 'POST', path: '/api/cases', spec: 'L', authRole: 'admin', body: {}, expect: [200, 400, 401, 422] },
  { method: 'GET', path: '/api/cases', spec: 'L', authRole: 'admin', expect: [200, 401] },
  { method: 'POST', path: '/api/companies', spec: 'A1', authRole: 'admin', body: {}, expect: [200, 400, 422, 401] },
  { method: 'POST', path: '/api/providers', spec: 'A2', authRole: 'admin', body: {}, expect: [200, 400, 422, 401] },
  { method: 'POST', path: '/api/providers/import', spec: 'A2', authRole: 'admin', body: {}, expect: [200, 400, 422, 401, 404] },
  { method: 'POST', path: '/api/providers/bulk-create', spec: 'A2', authRole: 'admin', body: {}, expect: [200, 400, 422, 401, 404] },
  { method: 'POST', path: '/api/peers', spec: 'B1', authRole: 'admin', body: {}, expect: [200, 400, 422, 401] },
  { method: 'GET', path: '/api/clinics', spec: 'A3', authRole: 'admin', expect: [200, 401] },
  { method: 'GET', path: '/api/clinics', spec: 'A3', authRole: null, expect: [401, 403, 200] },
  { method: 'POST', path: '/api/batches', spec: 'A4', authRole: 'admin', body: {}, expect: [200, 400, 422, 401] },
  { method: 'POST', path: '/api/upload/chart', spec: 'A4', authRole: 'admin', body: {}, expect: [400, 422, 401, 404] },
  { method: 'POST', path: '/api/upload/chart-extract', spec: 'A4', authRole: 'admin', body: {}, expect: [400, 422, 401, 404] },
  { method: 'POST', path: '/api/upload/form-template', spec: 'D1', authRole: 'admin', body: {}, expect: [400, 422, 401, 404] },
  { method: 'POST', path: '/api/clients/onboard', spec: 'A1', authRole: 'admin', body: {}, expect: [200, 400, 422, 401, 404] },
  { method: 'POST', path: '/api/assign/suggest', spec: 'B3', authRole: 'admin', body: {}, expect: [200, 400, 422, 401, 404] },
  { method: 'POST', path: '/api/assign/approve', spec: 'B3', authRole: 'admin', body: {}, expect: [200, 400, 422, 401, 404] },
  { method: 'GET', path: '/api/payouts', spec: 'H', authRole: 'admin', expect: [200, 401] },
  { method: 'GET', path: '/api/payouts/current-period', spec: 'H', authRole: 'admin', expect: [200, 401, 404] },
  { method: 'POST', path: '/api/payouts/approve-all', spec: 'H', authRole: 'admin', body: {}, expect: [200, 400, 401, 404] },
  { method: 'POST', path: '/api/reports/generate', spec: 'F', authRole: 'admin', body: {}, expect: [200, 400, 422, 401, 404] },
  { method: 'GET', path: '/api/reports/data', spec: 'F', authRole: 'admin', expect: [200, 401, 404] },
  { method: 'POST', path: '/api/reports/peer-scorecard', spec: 'F', authRole: 'admin', body: {}, expect: [200, 400, 422, 401, 404] },
  { method: 'POST', path: '/api/reports/quality-certificate', spec: 'F', authRole: 'admin', body: {}, expect: [200, 400, 422, 401, 404] },
  { method: 'POST', path: '/api/reports/export-all', spec: 'F', authRole: 'admin', body: {}, expect: [200, 400, 422, 401, 404] },
  { method: 'POST', path: '/api/peer/submit', spec: 'C3', authRole: 'reviewer', body: {}, expect: [200, 400, 422, 401, 404] },
  { method: 'POST', path: '/api/peer/ai-suggest-narrative', spec: 'C3', authRole: 'reviewer', body: {}, expect: [200, 400, 422, 401, 404], perfMs: 30000 },
  { method: 'POST', path: '/api/company-forms/create', spec: 'D1', authRole: 'admin', body: {}, expect: [200, 400, 422, 401, 404] },
  { method: 'POST', path: '/api/ash', spec: 'I', authRole: 'admin', body: { messages: [{ role: 'user', content: 'ping' }] }, expect: [200, 400, 422, 401, 404], perfMs: 30000 },
  { method: 'POST', path: '/api/demo/login', spec: 'auth', authRole: null, body: { role: 'admin' }, expect: [200] },
  { method: 'POST', path: '/api/onboard/peer', spec: 'B6', authRole: null, body: {}, expect: [200, 400, 422, 401, 404] },
  { method: 'POST', path: '/api/feedback', spec: 'K9', authRole: 'client', body: {}, expect: [200, 400, 422, 401, 404] },
  { method: 'GET', path: '/api/reassignments', spec: 'E1', authRole: 'admin', expect: [200, 401] },
  { method: 'POST', path: '/api/reassignments', spec: 'E1', authRole: 'reviewer', body: {}, expect: [200, 400, 422, 401] },
  // Crons (Bearer)
  { method: 'GET', path: '/api/cron/cycle-reminders', spec: 'M', authRole: null, expect: [200, 401, 403] },
  { method: 'GET', path: '/api/cron/peer-efficiency', spec: 'M', authRole: null, expect: [200, 401, 403] },
  { method: 'GET', path: '/api/cron/credential-expiry-warnings', spec: 'M', authRole: null, expect: [200, 401, 403] },
  { method: 'GET', path: '/api/cron/cycle-completion', spec: 'M', authRole: null, expect: [200, 401, 403] },
  // Webhooks
  { method: 'POST', path: '/api/webhooks/docusign', spec: 'N', authRole: null, body: {}, expect: [200, 400, 401, 403] },
  { method: 'POST', path: '/api/webhooks/aautipay', spec: 'N', authRole: null, body: {}, expect: [200, 400, 401, 403] },
];

export async function run(ctx: ScenarioCtx) {
  const log = ctx.logger;
  // One client per role (reused for cookie persistence)
  const clients: Record<string, ApiClient> = { none: new ApiClient(), admin: new ApiClient(), client: new ApiClient(), peer: new ApiClient() };
  for (const k of Object.keys(clients)) clients[k].cookies.set('site_gate', '1');
  await clients.admin.loginAs('admin');
  await clients.client.loginAs('client');
  await clients.reviewer.loginAs('reviewer');

  for (const p of probes) {
    const cli = p.authRole ? clients[p.authRole] : clients.none;
    const t0 = Date.now();
    let res;
    try {
      res = await cli.request(p.method, p.path, p.body);
    } catch (e: any) {
      log.log({ spec_section: p.spec, severity: 'high', category: 'functional', title: `${p.method} ${p.path} threw`, description: e?.message || String(e) });
      continue;
    }
    const dt = Date.now() - t0;
    if (!p.expect.includes(res.status)) {
      const sev = res.status >= 500 ? 'critical' : 'medium';
      log.log({ spec_section: p.spec, severity: sev, category: 'functional', title: `${p.method} ${p.path} returned ${res.status} (expected ${p.expect.join('|')})`, description: res.text.slice(0, 300) });
    }
    const limit = p.perfMs || 2000;
    if (dt > limit && res.status < 400) {
      log.log({ spec_section: p.spec, severity: 'low', category: 'perf', title: `${p.method} ${p.path} slow: ${dt}ms`, description: `Limit ${limit}ms` });
    }
    // Body shape sanity
    if (res.status >= 200 && res.status < 300 && res.text && res.json === null) {
      // Some endpoints (downloads) return non-JSON; only flag if text looks like HTML error
      if (res.text.startsWith('<!DOCTYPE')) {
        log.log({ spec_section: p.spec, severity: 'medium', category: 'functional', title: `${p.method} ${p.path} returned HTML on 2xx`, description: 'Likely auth redirect leaking through.' });
      }
    }
  }

  // Missing-auth sample: hit a few admin-only endpoints with no cookie
  const noAuth = new ApiClient();
  noAuth.cookies.set('site_gate', '1');
  const protectedPaths = ['/api/payouts', '/api/reassignments', '/api/notifications'];
  for (const p of protectedPaths) {
    const r = await noAuth.get(p);
    if (r.status >= 200 && r.status < 300) {
      log.log({ spec_section: 'L', severity: 'high', category: 'security', title: `GET ${p} without auth returned ${r.status}`, description: 'Protected endpoint accessible without cookie.' });
    }
  }
}
