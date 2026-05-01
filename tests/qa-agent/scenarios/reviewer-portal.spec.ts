import { checkPage, ScenarioCtx } from './_shared';

export const meta = { name: 'reviewer-portal', persona: 'reviewer' as const };
export async function run(ctx: ScenarioCtx) {
  await checkPage(ctx, 'reviewer', {
    name: meta.name, path: '/reviewer/portal', spec: 'F1/F7/E2', persona: 'reviewer',
    expectsText: ['case|review|assigned'],
    forbidsText: ['\\$NaN', 'undefined'],
  });
}
