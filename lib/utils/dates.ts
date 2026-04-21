import { formatDistanceToNow, format, addDays, isPast, differenceInDays } from 'date-fns';

export function dueIn(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isPast(d)) return 'Past due';
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'MMM d, yyyy');
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'MMM d, yyyy h:mm a');
}

export function addBusinessDays(days: number): Date {
  return addDays(new Date(), days);
}

export function daysUntilDue(date: string | Date): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  return differenceInDays(d, new Date());
}
