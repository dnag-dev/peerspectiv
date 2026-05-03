import Link from "next/link";
import { db, toSnake } from "@/lib/db";
import { peers, peerSpecialties } from "@/lib/db/schema";
import { asc, eq, sql } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Download, Mail, ShieldCheck, Stethoscope } from "lucide-react";
import { MyReviewsTab } from "@/components/peer/MyReviewsTab";
import { MyScorecardTab } from "@/components/peer/MyScorecardTab";
import { TwoFactorLink } from "@/components/profile/TwoFactorLink";

export const dynamic = "force-dynamic";

// Phase 2 demo: until session-aware peer auth lands, surface the demo peer
// (rjohnson) so the profile page exercises real DB data end-to-end.
const DEMO_PEER_EMAIL = "rjohnson@peerspectiv.com";

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function PeerProfilePage() {
  // Find demo peer (or first available if missing).
  const found = await db
    .select()
    .from(peers)
    .where(eq(peers.email, DEMO_PEER_EMAIL))
    .limit(1);
  const peer = found[0] ?? (await db.select().from(peers).limit(1))[0];

  if (!peer) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-ink-900">Profile</h1>
        <p className="mt-2 text-sm text-ink-500">No peer record found.</p>
      </div>
    );
  }

  // Specialties from join table (PR-031).
  const specs = await db
    .select({ specialty: peerSpecialties.specialty, verifiedStatus: peerSpecialties.verifiedStatus })
    .from(peerSpecialties)
    .where(eq(peerSpecialties.peerId, peer.id))
    .orderBy(asc(peerSpecialties.specialty));

  // PR-034: non-dismissible banner if expiry < 60 days.
  const expiryDate = peer.credentialValidUntil
    ? new Date(peer.credentialValidUntil)
    : null;
  const daysToExpiry = expiryDate
    ? Math.ceil((expiryDate.getTime() - Date.now()) / 86_400_000)
    : null;
  const expiryWarning =
    daysToExpiry != null && daysToExpiry < 60 ? daysToExpiry : null;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Profile</h1>
        <p className="text-sm text-ink-500">
          Your contact, specialties, license, reviews, and scorecard
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="reviews">My Reviews</TabsTrigger>
          <TabsTrigger value="scorecard">My Scorecard</TabsTrigger>
        </TabsList>

        <TabsContent value="reviews">
          <MyReviewsTab peerId={peer.id} />
        </TabsContent>

        <TabsContent value="scorecard">
          <MyScorecardTab peerId={peer.id} />
        </TabsContent>

        <TabsContent value="profile" className="space-y-6">

      {expiryWarning != null && (
        <div
          data-testid="license-expiry-warning"
          className="rounded-lg border-2 border-critical-600 bg-critical-50 p-4 flex items-start gap-3"
        >
          <AlertTriangle className="h-5 w-5 text-critical-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-critical-700">
            <p className="font-semibold">License expiring soon</p>
            <p className="mt-1">
              {expiryWarning < 0
                ? `Your license expired ${Math.abs(expiryWarning)} day${Math.abs(expiryWarning) === 1 ? "" : "s"} ago.`
                : `Your license expires in ${expiryWarning} day${expiryWarning === 1 ? "" : "s"} (${formatDate(peer.credentialValidUntil)}).`}{" "}
              Contact your credentialer to renew before continuing reviews.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="text-eyebrow text-ink-500">Name</div>
            <div className="text-sm text-ink-900">{peer.fullName ?? "—"}</div>
          </div>
          <div>
            <div className="text-eyebrow text-ink-500">Email</div>
            <div className="flex items-center gap-2 text-sm text-ink-900">
              <Mail className="h-3.5 w-3.5 text-ink-400" /> {peer.email ?? "—"}
            </div>
          </div>
          <div className="pt-2">
            <div className="text-eyebrow text-ink-500 mb-1">Account Security</div>
            <TwoFactorLink />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-cobalt-600" /> Specialties
          </CardTitle>
        </CardHeader>
        <CardContent>
          {specs.length === 0 ? (
            <p className="text-sm text-ink-500">
              No specialties on file. Contact your credentialer to add one.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2" data-testid="profile-specialty-chips">
              {specs.map((s) => (
                <Badge
                  key={s.specialty}
                  variant="secondary"
                  className="bg-cobalt-50 text-cobalt-700"
                >
                  {s.specialty}
                  {s.verifiedStatus !== "verified" && (
                    <span className="ml-1 text-[10px] uppercase opacity-70">
                      {s.verifiedStatus}
                    </span>
                  )}
                </Badge>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-ink-500">
            Specialties are managed by Peerspectiv credentialing — contact your
            admin to request changes.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">License</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-eyebrow text-ink-500">License #</div>
            <div className="text-ink-900">{peer.licenseNumber ?? "—"}</div>
          </div>
          <div>
            <div className="text-eyebrow text-ink-500">State</div>
            <div className="text-ink-900">{peer.licenseState ?? "—"}</div>
          </div>
          <div>
            <div className="text-eyebrow text-ink-500">Board Certification</div>
            <div className="text-ink-900">{peer.boardCertification ?? "—"}</div>
          </div>
          <div>
            <div className="text-eyebrow text-ink-500">Valid Until</div>
            <div className="text-ink-900">
              {formatDate(peer.credentialValidUntil)}
            </div>
          </div>
          <div className="col-span-2">
            <div className="text-eyebrow text-ink-500">License Document</div>
            {peer.licenseFileUrl ? (
              <Link
                href={peer.licenseFileUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-sm text-cobalt-600 underline hover:text-cobalt-700"
              >
                <Download className="h-3.5 w-3.5" /> Download
              </Link>
            ) : (
              <div className="text-sm text-ink-500">No file uploaded</div>
            )}
          </div>
          <p className="col-span-2 text-xs text-ink-500">
            License details are read-only here. Contact credentialing to update.
          </p>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
