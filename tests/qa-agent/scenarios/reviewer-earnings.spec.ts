import { checkPage, ScenarioCtx } from './_shared';

export const meta = { name: 'reviewer-earnings', persona: 'reviewer' as const };
export async function run(ctx: ScenarioCtx) {
  await checkPage(ctx, 'reviewer', {
    name: meta.name, path: '/reviewer/earnings', spec: 'F7', persona: 'reviewer',
    expectsText: ['earning|payout|hour|case'],
    forbidsText: ['\\$NaN'],
  });
}
