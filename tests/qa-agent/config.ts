/**
 * QA Harness configuration. Centralized so scenarios don't hardcode values.
 */
import path from 'path';

export const BASE_URL = process.env.QA_BASE_URL || 'http://localhost:3000';

export type Role = 'admin' | 'client' | 'reviewer';

export const PERSONAS: Record<Role, { email: string; name: string; landing: string }> = {
  admin: { email: 'admin@peerspectiv.com', name: 'Ashton Williams', landing: '/dashboard' },
  client: { email: 'kelli@horizonhealth.org', name: 'Kelli Ramirez', landing: '/portal' },
  peer: { email: 'rjohnson@peerspectiv.com', name: 'Dr. Richard Johnson', landing: '/reviewer/portal' },
};

export const RUN_ID = (() => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
})();

export const REPO_ROOT = path.resolve(__dirname, '..', '..');
export const QA_ROOT = path.resolve(__dirname);
export const ISSUES_DIR = path.join(QA_ROOT, 'issues', RUN_ID);
export const SCREENSHOTS_DIR = path.join(ISSUES_DIR, 'screenshots');
export const ISSUES_JSON = path.join(ISSUES_DIR, 'issues.json');
export const REPORT_MD = path.join(ISSUES_DIR, 'report.md');
export const ROOT_RESULTS_MD = path.join(REPO_ROOT, `QA_RESULTS_${RUN_ID}.md`);

// Dev-server first-compile of a route can be 5-15s on cold start; many of
// the persona-driven scenarios visit several routes. 90s was too tight and
// triggered timeouts on 20/35 scenarios. 180s gives breathing room while
// still surfacing genuine hangs.
export const SCENARIO_TIMEOUT_MS = 180_000;
export const TOTAL_BUDGET_MS = 30 * 60_000;
