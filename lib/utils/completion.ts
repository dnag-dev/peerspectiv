export function calculateProjectedCompletion(
  cases: Array<{ due_date: string | null; status: string }>
): Date | null {
  const active = cases.filter(c => !['completed', 'archived'].includes(c.status) && c.due_date);
  if (!active.length) return null;
  return new Date(Math.max(...active.map(c => new Date(c.due_date!).getTime())));
}
