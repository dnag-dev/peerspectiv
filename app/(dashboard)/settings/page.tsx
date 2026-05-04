import { db } from '@/lib/db';
import { globalSettings } from '@/lib/db/schema';
import { SettingsView } from './SettingsView';
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  noStore();
  const rows = await db.select().from(globalSettings);
  return <SettingsView initialSettings={rows} />;
}
