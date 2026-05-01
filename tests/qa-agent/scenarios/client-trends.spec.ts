import { checkPage, ScenarioCtx } from './_shared';

export const meta = { name: 'client-trends', persona: 'client' as const };
export async function run(ctx: ScenarioCtx) {
  await checkPage(ctx, 'client', {
    name: meta.name, path: '/portal/trends', spec: 'I3/I7', persona: 'client',
    expectsText: ['trend|quarter|specialt'],
    forbidsText: ['\\$NaN', '1\\/1\\/1970'],
  });
}
