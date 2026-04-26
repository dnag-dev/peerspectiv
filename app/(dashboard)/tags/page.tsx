import { db } from '@/lib/db';
import { tags } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { TagsView } from './TagsView';

export const dynamic = 'force-dynamic';

export default async function TagsPage() {
  const rows = await db
    .select()
    .from(tags)
    .orderBy(desc(tags.usageCount), desc(tags.createdAt));
  return <TagsView initialTags={rows} />;
}
