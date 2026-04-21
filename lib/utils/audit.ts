import { supabaseAdmin } from '@/lib/supabase/server';

export async function auditLog(params: {
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  request?: Request;
}) {
  await supabaseAdmin.from('audit_logs').insert({
    user_id: params.userId,
    action: params.action,
    resource_type: params.resourceType,
    resource_id: params.resourceId,
    ip_address: params.request?.headers.get('x-forwarded-for') ?? null,
    metadata: params.metadata ?? {},
  });
}
