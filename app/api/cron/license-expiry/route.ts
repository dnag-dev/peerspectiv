import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  peers,
  peerSpecialties,
  reviewCases,
  licenseNotificationLog,
  auditLogs,
} from '@/lib/db/schema';
import { and, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import { sendEmail } from '@/lib/email/notifications';
import { transitionPeer, PeerStateTransitionError } from '@/lib/peers/state-machine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Phase 4 — license expiry cron.
 *
 *  - Notifies the credentialing inbox at 14, 7, 3, 1 days before expiry.
 *  - On post-expiry pass (day_until ≤ 0 and status still 'active'):
 *      * transitionPeer → license_expired
 *      * find every assigned/in_progress case, attempt reassignment to
 *        another active peer with matching specialty + capacity.
 *      * cases that can't be reassigned have peer_id cleared with a
 *        "Needs Reassignment — original peer license expired" note.
 *  - One admin summary email is sent per run with counts.
 *
 *  Replaces the older /api/cron/credential-expiry-warnings cron.
 */
const NOTIFY_THRESHOLDS = [14, 7, 3, 1] as const;
const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL || process.env.CREDENTIALING_EMAIL || 'admin@peerspectiv.com';
const CREDENTIALING_EMAIL =
  process.env.CREDENTIALING_EMAIL || 'credentialing@peerspectiv.com';

function daysBetween(today: Date, target: Date): number {
  const ms = target.getTime() - today.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayIso = today.toISOString().slice(0, 10);

  const watchPeers = await db
    .select({
      id: peers.id,
      fullName: peers.fullName,
      email: peers.email,
      status: peers.status,
      credentialValidUntil: peers.credentialValidUntil,
    })
    .from(peers)
    .where(
      and(
        eq(peers.status, 'active'),
        isNotNull(peers.credentialValidUntil)
      )
    );

  let notified = 0;
  let expired = 0;
  let reassigned = 0;
  let flagged = 0;

  for (const peer of watchPeers) {
    const expiryStr = String(peer.credentialValidUntil).slice(0, 10);
    const expiryDate = new Date(expiryStr + 'T00:00:00Z');
    const daysUntil = daysBetween(today, expiryDate);

    // ─── Pre-expiry notifications ──────────────────────────────────
    if (daysUntil > 0 && (NOTIFY_THRESHOLDS as readonly number[]).includes(daysUntil)) {
      const threshold = `pre_expiry_${daysUntil}`;
      const existing = await db
        .select({ id: licenseNotificationLog.id })
        .from(licenseNotificationLog)
        .where(
          and(
            eq(licenseNotificationLog.peerId, peer.id),
            eq(licenseNotificationLog.threshold, threshold),
            eq(licenseNotificationLog.licenseExpiryDate, expiryStr)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        const subject = `License expires in ${daysUntil} days: ${peer.fullName}`;
        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color:#0F2044;">${subject}</h2>
            <p><strong>${peer.fullName}</strong> (${peer.email ?? '—'}) — license valid until <strong>${expiryStr}</strong>.</p>
            <p>Please renew this peer's license before it lapses.</p>
          </div>
        `;
        const result = await sendEmail({ to: CREDENTIALING_EMAIL, subject, html });
        await db.insert(licenseNotificationLog).values({
          peerId: peer.id,
          threshold,
          licenseExpiryDate: expiryStr,
          sentTo: CREDENTIALING_EMAIL,
          emailId: (result as { id?: string } | undefined)?.id ?? null,
        });
        notified++;
      }
      continue;
    }

    // ─── Post-expiry: transition + reassign ─────────────────────────
    if (daysUntil > 0) continue;

    // Already-logged post_expiry? Skip transition but still process orphan cases.
    const postLogged = await db
      .select({ id: licenseNotificationLog.id })
      .from(licenseNotificationLog)
      .where(
        and(
          eq(licenseNotificationLog.peerId, peer.id),
          eq(licenseNotificationLog.threshold, 'post_expiry'),
          eq(licenseNotificationLog.licenseExpiryDate, expiryStr)
        )
      )
      .limit(1);

    try {
      await transitionPeer(peer.id, 'license_expired', 'system', 'license expired');
      expired++;
    } catch (err) {
      if (!(err instanceof PeerStateTransitionError)) throw err;
      // Already license_expired — fine, fall through to reassignment sweep.
    }

    // Find active/in-progress cases assigned to this peer
    const peerCases = await db
      .select({
        id: reviewCases.id,
        specialtyRequired: reviewCases.specialtyRequired,
        status: reviewCases.status,
      })
      .from(reviewCases)
      .where(
        and(
          eq(reviewCases.peerId, peer.id),
          inArray(reviewCases.status, ['assigned', 'in_progress'])
        )
      );

    for (const c of peerCases) {
      const specialty = c.specialtyRequired ?? null;
      let pickedId: string | null = null;

      if (specialty) {
        // Candidate peers: state=active, specialty match, capacity available.
        const candidates = await db
          .select({
            id: peers.id,
            activeCasesCount: peers.activeCasesCount,
            maxCaseLoad: peers.maxCaseLoad,
          })
          .from(peers)
          .where(
            and(
              eq(peers.status, 'active'),
              eq(peers.availabilityStatus, 'available'),
              sql`exists (select 1 from peer_specialties ps where ps.peer_id = ${peers.id} and ps.specialty = ${specialty})`
            )
          );
        const eligible = candidates
          .filter((p) => Number(p.activeCasesCount ?? 0) < Number(p.maxCaseLoad ?? 75))
          .sort((a, b) => Number(a.activeCasesCount ?? 0) - Number(b.activeCasesCount ?? 0));
        pickedId = eligible[0]?.id ?? null;
      }

      if (pickedId) {
        await db
          .update(reviewCases)
          .set({ peerId: pickedId, updatedAt: new Date() })
          .where(eq(reviewCases.id, c.id));
        await db.insert(auditLogs).values({
          action: 'case_reassigned_license_expiry',
          resourceType: 'review_case',
          resourceId: c.id,
          metadata: { from_peer: peer.id, to_peer: pickedId, expiry: expiryStr },
        });
        reassigned++;
      } else {
        await db
          .update(reviewCases)
          .set({
            peerId: null,
            notes: 'Needs Reassignment — original peer license expired',
            updatedAt: new Date(),
          })
          .where(eq(reviewCases.id, c.id));
        await db.insert(auditLogs).values({
          action: 'case_flagged_license_expiry',
          resourceType: 'review_case',
          resourceId: c.id,
          metadata: { from_peer: peer.id, expiry: expiryStr },
        });
        flagged++;
      }
    }

    if (postLogged.length === 0) {
      const subject = `License EXPIRED: ${peer.fullName}`;
      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color:#0F2044;">${subject}</h2>
          <p><strong>${peer.fullName}</strong> (${peer.email ?? '—'}) — license expired on <strong>${expiryStr}</strong>.</p>
          <p>Peer is now in license_expired status. Cases were reassigned where possible.</p>
        </div>
      `;
      const result = await sendEmail({ to: CREDENTIALING_EMAIL, subject, html });
      await db.insert(licenseNotificationLog).values({
        peerId: peer.id,
        threshold: 'post_expiry',
        licenseExpiryDate: expiryStr,
        sentTo: CREDENTIALING_EMAIL,
        emailId: (result as { id?: string } | undefined)?.id ?? null,
      });
    }
  }

  // Admin summary (one per run, only if anything happened)
  if (expired + reassigned + flagged > 0) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color:#0F2044;">License expiry sweep — ${todayIso}</h2>
        <ul>
          <li>Notifications sent: <strong>${notified}</strong></li>
          <li>Peers transitioned to license_expired: <strong>${expired}</strong></li>
          <li>Cases reassigned: <strong>${reassigned}</strong></li>
          <li>Cases flagged for manual reassignment: <strong>${flagged}</strong></li>
        </ul>
      </div>
    `;
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `Peer license expiry — ${expired} expired, ${reassigned} reassigned, ${flagged} flagged`,
      html,
    });
  }

  return NextResponse.json({ notified, expired, reassigned, flagged });
}
