/**
 * QA Harness runner. Orchestrates all scenarios, manages the dev server,
 * writes incrementally to issues.json, then renders report.md and the root
 * QA_RESULTS_{run-id}.md summary.
 *
 * Run with: npx tsx tests/qa-agent/runner.ts
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { chromium } from '@playwright/test';
import {
  BASE_URL, REPO_ROOT, ROOT_RESULTS_MD, RUN_ID, SCENARIO_TIMEOUT_MS, TOTAL_BUDGET_MS,
  ISSUES_DIR, REPORT_MD,
} from './config';
import { IssueLogger, buildReport, getIssues, writeReport } from './issue-logger';
import { count } from './db-helpers';

const SCENARIO_FILES = [
  // Admin
  'admin-companies.spec',
  'admin-providers.spec',
  'admin-reviewers.spec',
  'admin-credentials.spec',
  'admin-batches.spec',
  'admin-assign.spec',
  'admin-forms.spec',
  'admin-invoices.spec',
  'admin-payouts.spec',
  'admin-reports.spec',
  'admin-command.spec',
  'admin-reassignments.spec',
  'admin-prospects.spec',
  // Reviewer
  'reviewer-portal.spec',
  'reviewer-case-detail.spec',
  'reviewer-submit.spec',
  'reviewer-earnings.spec',
  'reviewer-reassign-request.spec',
  // Client
  'client-dashboard.spec',
  'client-submit.spec',
  'client-reviews.spec',
  'client-trends.spec',
  'client-quality.spec',
  'client-providers.spec',
  'client-corrective.spec',
  'client-export.spec',
  'client-feedback.spec',
  // Cross
  'cross-admin-approve-reviewer-sees.spec',
  'cross-reviewer-submits-client-sees.spec',
  'cross-client-submits-admin-sees.spec',
  'cross-credentialing-blocks-assignment.spec',
  'cross-cap-respected.spec',
  'cross-reassign-request-loop.spec',
  // Backend
  'backend-api-sweep.spec',
  'backend-data-integrity.spec',
];

async function isServerUp(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/login`, { method: 'GET' });
    return res.status < 500;
  } catch {
    return false;
  }
}

async function startDevServer(): Promise<{ proc: any; started: boolean }> {
  if (await isServerUp()) return { proc: null, started: false };
  console.log('Starting dev server with E2E_AUTH_BYPASS=1...');
  const proc = spawn('npm', ['run', 'dev'], {
    cwd: REPO_ROOT,
    env: { ...process.env, E2E_AUTH_BYPASS: '1', DEMO_AUTH: '1' },
    stdio: 'pipe',
    detached: false,
  });
  proc.stdout?.on('data', (d) => process.stdout.write(`[dev] ${d}`));
  proc.stderr?.on('data', (d) => process.stderr.write(`[dev:err] ${d}`));
  // Wait up to 60s
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500));
    if (await isServerUp()) {
      console.log('Dev server is up.');
      return { proc, started: true };
    }
  }
  throw new Error('Dev server did not come up within 60s');
}

async function selfTest(logger: IssueLogger): Promise<{ passed: boolean; notes: string[] }> {
  const notes: string[] = [];
  let allPassed = true;
  // 1. /login reachable
  try {
    const r = await fetch(`${BASE_URL}/login`);
    if (r.status >= 500) { notes.push(`/login returned ${r.status}`); allPassed = false; }
  } catch (e: any) { notes.push(`/login fetch failed: ${e.message}`); allPassed = false; }
  // 2. demo login works
  try {
    const r = await fetch(`${BASE_URL}/api/demo/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ role: 'admin' }) });
    if (!r.ok) { notes.push(`POST /api/demo/login → ${r.status}`); allPassed = false; }
  } catch (e: any) { notes.push(`demo login fetch failed: ${e.message}`); allPassed = false; }
  // 3. Playwright launches
  try {
    const b = await chromium.launch();
    await b.close();
  } catch (e: any) { notes.push(`Playwright launch failed: ${e.message}`); allPassed = false; }
  // 4. DB reachable (optional)
  const c = await count('companies').catch(() => null);
  if (c === null) notes.push('DB not reachable from harness (fine — DB-driven checks will skip).');
  else notes.push(`companies count = ${c}`);
  // 5. Issues dir writable
  try {
    fs.mkdirSync(ISSUES_DIR, { recursive: true });
    fs.writeFileSync(path.join(ISSUES_DIR, '.write-test'), 'ok');
    fs.unlinkSync(path.join(ISSUES_DIR, '.write-test'));
  } catch (e: any) { notes.push(`Issues dir not writable: ${e.message}`); allPassed = false; }
  return { passed: allPassed, notes };
}

async function runScenario(name: string, browser: any, startedAt: number): Promise<void> {
  const elapsed = Date.now() - startedAt;
  if (elapsed > TOTAL_BUDGET_MS) {
    console.log(`  budget exceeded — skipping ${name}`);
    return;
  }
  console.log(`▶ ${name}`);
  const mod = await import(`./scenarios/${name}`);
  const persona = mod.meta?.persona || 'admin';
  const logger = new IssueLogger(name, persona);
  const t0 = Date.now();
  const timeoutPromise = new Promise<void>((resolve) => {
    setTimeout(() => {
      logger.log({
        spec_section: 'harness',
        severity: 'high',
        category: 'perf',
        title: `Scenario "${name}" hit 90s timeout`,
        description: 'Scenario was force-stopped by harness.',
      });
      resolve();
    }, SCENARIO_TIMEOUT_MS);
  });
  try {
    await Promise.race([
      mod.run({ logger, browser }).catch((e: any) => {
        logger.log({
          spec_section: 'harness',
          severity: 'high',
          category: 'functional',
          title: `Scenario "${name}" threw`,
          description: e?.stack || e?.message || String(e),
        });
      }),
      timeoutPromise,
    ]);
  } catch (e: any) {
    logger.log({
      spec_section: 'harness',
      severity: 'high',
      category: 'functional',
      title: `Scenario "${name}" outer throw`,
      description: e?.message || String(e),
    });
  }
  console.log(`  done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

async function main() {
  const startedAt = Date.now();
  console.log(`QA Harness — run ${RUN_ID}`);
  console.log(`Issues dir: ${ISSUES_DIR}`);

  const dev = await startDevServer();
  const cleanup = () => {
    if (dev.started && dev.proc) {
      try { dev.proc.kill('SIGTERM'); } catch {}
    }
  };
  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(130); });

  // Maybe reseed
  const cnt = await count('companies').catch(() => null);
  const harnessNotes: string[] = [];
  if (cnt !== null && cnt < 5) {
    harnessNotes.push(`companies count = ${cnt} (< 5); recommend running npm run db:reseed-real`);
  }

  // Self-test
  const selfLogger = new IssueLogger('harness-selftest', 'backend');
  const st = await selfTest(selfLogger);
  if (!st.passed) {
    harnessNotes.push('Self-test reported failures (running sweep best-effort):');
    for (const n of st.notes) harnessNotes.push(`  - ${n}`);
  } else {
    harnessNotes.push('Self-test: passed.');
    for (const n of st.notes) harnessNotes.push(`  - ${n}`);
  }

  const browser = await chromium.launch();
  const skipped: string[] = [];
  let ran = 0;
  try {
    for (const name of SCENARIO_FILES) {
      if (Date.now() - startedAt > TOTAL_BUDGET_MS) {
        skipped.push(name);
        continue;
      }
      try {
        await runScenario(name, browser, startedAt);
        ran += 1;
      } catch (e: any) {
        console.error(`  scenario crashed: ${e.message}`);
      }
    }
  } finally {
    await browser.close().catch(() => {});
  }

  const durationMs = Date.now() - startedAt;
  const report = buildReport({
    harnessNotes,
    scenariosRun: ran,
    scenariosSkipped: skipped,
    durationMs,
  });
  writeReport(report);
  fs.writeFileSync(ROOT_RESULTS_MD, report);

  // Stdout summary
  const issues = getIssues();
  const counts: Record<string, number> = {};
  for (const i of issues) counts[i.severity] = (counts[i.severity] || 0) + 1;
  console.log('\n' + '='.repeat(50));
  console.log(`QA Harness complete — ${RUN_ID}`);
  console.log(`Duration: ${(durationMs / 1000).toFixed(1)}s · Scenarios run: ${ran} · Issues: ${issues.length}`);
  console.log('Severity breakdown:', counts);
  console.log(`Report: ${REPORT_MD}`);
  console.log(`Root summary: ${ROOT_RESULTS_MD}`);

  cleanup();
  const blockerOrCritical = (counts['blocker'] || 0) + (counts['critical'] || 0);
  process.exit(blockerOrCritical > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('Runner crashed:', e);
  process.exit(2);
});
