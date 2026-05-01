/**
 * Issue logger — writes incrementally to issues.json so a crash leaves partial output.
 * Generates report.md on flush().
 */
import fs from 'fs';
import path from 'path';
import { ISSUES_DIR, ISSUES_JSON, REPORT_MD, RUN_ID, SCREENSHOTS_DIR } from './config';

export type Severity = 'blocker' | 'critical' | 'high' | 'medium' | 'low' | 'info';
export type Category =
  | 'functional'
  | 'data-integrity'
  | 'visual'
  | 'copy'
  | 'perf'
  | 'a11y'
  | 'security'
  | 'not-yet-built';
export type PersonaTag = 'admin' | 'client' | 'reviewer' | 'public' | 'backend' | 'cross';

export interface Issue {
  id: string;
  scenario: string;
  spec_section: string;
  persona: PersonaTag;
  severity: Severity;
  category: Category;
  title: string;
  description: string;
  url?: string;
  steps_to_reproduce?: string[];
  expected?: string;
  actual?: string;
  screenshot?: string;
  console_errors?: string[];
  network_failures?: string[];
  db_assertion?: string;
  timestamp: string;
}

let counter = 0;
let issues: Issue[] = [];

function ensureDirs() {
  if (!fs.existsSync(ISSUES_DIR)) fs.mkdirSync(ISSUES_DIR, { recursive: true });
  if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

export function nextIssueId(): string {
  counter += 1;
  return `${RUN_ID}-${String(counter).padStart(3, '0')}`;
}

export class IssueLogger {
  scenario: string;
  persona: PersonaTag;
  consoleErrors: string[] = [];
  networkFailures: string[] = [];

  constructor(scenario: string, persona: PersonaTag) {
    this.scenario = scenario;
    this.persona = persona;
    ensureDirs();
  }

  attachConsoleError(msg: string) {
    this.consoleErrors.push(msg);
    if (this.consoleErrors.length > 50) this.consoleErrors.shift();
  }
  attachNetworkFailure(msg: string) {
    this.networkFailures.push(msg);
    if (this.networkFailures.length > 50) this.networkFailures.shift();
  }
  resetHarvest() {
    this.consoleErrors = [];
    this.networkFailures = [];
  }

  log(partial: Omit<Issue, 'id' | 'scenario' | 'persona' | 'timestamp'> & { persona?: PersonaTag }) {
    const issue: Issue = {
      id: nextIssueId(),
      scenario: this.scenario,
      persona: partial.persona || this.persona,
      timestamp: new Date().toISOString(),
      console_errors: partial.console_errors || (this.consoleErrors.length ? [...this.consoleErrors] : undefined),
      network_failures: partial.network_failures || (this.networkFailures.length ? [...this.networkFailures] : undefined),
      ...partial,
    } as Issue;
    issues.push(issue);
    persist();
    // eslint-disable-next-line no-console
    console.log(`  [${issue.severity}] ${issue.id} ${issue.title}`);
    return issue;
  }
}

function persist() {
  ensureDirs();
  fs.writeFileSync(ISSUES_JSON, JSON.stringify(issues, null, 2));
}

export function getIssues(): Issue[] {
  return issues;
}

const SEV_ORDER: Severity[] = ['blocker', 'critical', 'high', 'medium', 'low', 'info'];

export function buildReport(meta: { harnessNotes?: string[]; scenariosRun: number; scenariosSkipped: string[]; durationMs: number }): string {
  const counts: Record<string, number> = {};
  for (const s of SEV_ORDER) counts[s] = 0;
  const byCat: Record<string, number> = {};
  const byPersona: Record<string, number> = {};
  for (const i of issues) {
    counts[i.severity] = (counts[i.severity] || 0) + 1;
    byCat[i.category] = (byCat[i.category] || 0) + 1;
    byPersona[i.persona] = (byPersona[i.persona] || 0) + 1;
  }

  const lines: string[] = [];
  lines.push(`# Peerspectiv QA Report — ${RUN_ID}`);
  lines.push('');
  lines.push(`Run duration: ${(meta.durationMs / 1000).toFixed(1)}s · Scenarios run: ${meta.scenariosRun} · Total issues: ${issues.length}`);
  lines.push('');
  if (meta.harnessNotes && meta.harnessNotes.length) {
    lines.push('## Harness');
    for (const n of meta.harnessNotes) lines.push(`- ${n}`);
    lines.push('');
  }
  lines.push('## Triage Summary');
  lines.push('');
  lines.push('| Severity | Count |');
  lines.push('| --- | --- |');
  for (const s of SEV_ORDER) lines.push(`| ${s} | ${counts[s]} |`);
  lines.push('');
  lines.push('| Category | Count |');
  lines.push('| --- | --- |');
  for (const k of Object.keys(byCat).sort()) lines.push(`| ${k} | ${byCat[k]} |`);
  lines.push('');
  lines.push('| Persona | Count |');
  lines.push('| --- | --- |');
  for (const k of Object.keys(byPersona).sort()) lines.push(`| ${k} | ${byPersona[k]} |`);
  lines.push('');
  if (meta.scenariosSkipped.length) {
    lines.push('## Skipped scenarios');
    for (const n of meta.scenariosSkipped) lines.push(`- ${n}`);
    lines.push('');
  }
  lines.push('## Issues');
  // Group by severity DESC then persona
  const sorted = [...issues].sort((a, b) => {
    const sa = SEV_ORDER.indexOf(a.severity);
    const sb = SEV_ORDER.indexOf(b.severity);
    if (sa !== sb) return sa - sb;
    return a.persona.localeCompare(b.persona);
  });
  let prevSev = '';
  for (const i of sorted) {
    if (i.severity !== prevSev) {
      lines.push('');
      lines.push(`### ${i.severity.toUpperCase()}`);
      prevSev = i.severity;
    }
    lines.push('');
    lines.push(`#### ${i.id} — ${i.title}`);
    lines.push(`- **Persona:** ${i.persona}`);
    lines.push(`- **Scenario:** ${i.scenario}`);
    lines.push(`- **Spec:** ${i.spec_section}`);
    lines.push(`- **Category:** ${i.category}`);
    if (i.url) lines.push(`- **URL:** ${i.url}`);
    if (i.expected) lines.push(`- **Expected:** ${i.expected}`);
    if (i.actual) lines.push(`- **Actual:** ${i.actual}`);
    if (i.steps_to_reproduce && i.steps_to_reproduce.length) {
      lines.push(`- **Steps:**`);
      i.steps_to_reproduce.forEach((s, idx) => lines.push(`  ${idx + 1}. ${s}`));
    }
    if (i.description) {
      lines.push(`- **Notes:** ${i.description}`);
    }
    if (i.screenshot) lines.push(`- **Screenshot:** ${i.screenshot}`);
    if (i.console_errors && i.console_errors.length) lines.push(`- **Console:** ${i.console_errors.slice(0, 5).join(' | ')}`);
    if (i.network_failures && i.network_failures.length) lines.push(`- **Network:** ${i.network_failures.slice(0, 5).join(' | ')}`);
    if (i.db_assertion) lines.push(`- **DB:** ${i.db_assertion}`);
  }
  return lines.join('\n');
}

export function writeReport(content: string) {
  ensureDirs();
  fs.writeFileSync(REPORT_MD, content);
}

export function shotPath(scenario: string, label: string): string {
  ensureDirs();
  return path.join(SCREENSHOTS_DIR, `${scenario}__${label}.png`.replace(/[^\w.-]+/g, '_'));
}
