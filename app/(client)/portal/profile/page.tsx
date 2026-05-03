import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TwoFactorLink } from "@/components/profile/TwoFactorLink";

/**
 * Phase 8.3 — minimal client portal profile page with the 2FA management link.
 * Full profile editing was originally slated for Phase 6 but never delivered;
 * this surface satisfies SA-079-adjacent security UX without building a full
 * settings module (Clerk handles 2FA management hosted-side).
 */
export default function ClientProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Profile</h1>
        <p className="text-sm text-ink-400">
          Account security and notification preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-ink-600">
            Two-factor authentication adds a second layer of protection to your account.
          </p>
          <TwoFactorLink />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-ink-500">
            Notification settings will land in a follow-up phase. Today, all notifications
            are delivered per your organization's <em>Report Bundle Delivery</em> setting.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
