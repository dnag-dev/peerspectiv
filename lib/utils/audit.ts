import { db } from '@/lib/db';
import { auditLogs } from '@/lib/db/schema';

export async function auditLog(params: {
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  request?: Request;
}) {
  await db.insert(auditLogs).values({
    userId: params.userId,
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    ipAddress: params.request?.headers.get('x-forwarded-for') ?? null,
    metadata: params.metadata ?? {},
  });
}
