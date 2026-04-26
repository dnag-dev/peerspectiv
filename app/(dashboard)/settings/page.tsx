import { db } from '@/lib/db';
import { globalSettings } from '@/lib/db/schema';
import { SettingsView } from './SettingsView';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const rows = await db.select().from(globalSettings);
  return <SettingsView initialSettings={rows} />;
}
