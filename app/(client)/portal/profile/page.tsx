"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, User, Lock, HelpCircle } from "lucide-react";

interface CompanyProfile {
  id: string;
  name: string;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
}

export default function ClientProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<CompanyProfile | null>(null);

  // General Settings state
  const [practiceName, setPracticeName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  // Support question state
  const [supportMsg, setSupportMsg] = useState("");
  const [supportSending, setSupportSending] = useState(false);
  const [supportSent, setSupportSent] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/companies/me");
        if (!res.ok) return;
        const data = await res.json();
        setCompany(data);
        setPracticeName(data.name ?? "");
        setContactEmail(data.contact_email ?? "");
        setContactPerson(data.contact_person ?? "");
        setContactPhone(data.contact_phone ?? "");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSaveGeneral() {
    if (!company) return;
    setSaving(true);
    setSaveMsg(null);
    setSaveErr(null);

    if (!practiceName.trim()) {
      setSaveErr("Practice name is required.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/companies/${company.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: practiceName.trim(),
          contact_email: contactEmail.trim() || null,
          contact_person: contactPerson.trim() || null,
          contact_phone: contactPhone.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save");
      }
      setSaveMsg("Profile updated.");
      setTimeout(() => setSaveMsg(null), 2000);
      router.refresh();
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleSupportSubmit() {
    if (!supportMsg.trim()) return;
    setSupportSending(true);
    try {
      // Submit support question via feedback endpoint
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: company?.id,
          open_feedback: supportMsg.trim(),
          type: "support_question",
        }),
      });
      setSupportSent(true);
      setSupportMsg("");
      setTimeout(() => setSupportSent(false), 3000);
    } finally {
      setSupportSending(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Profile</h1>
        <Card>
          <CardContent className="py-12 text-center text-ink-500">Loading...</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Profile</h1>
        <p className="text-sm text-ink-400">
          Manage your practice information and account settings.
        </p>
      </div>

      {/* CL-021/022: General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-5 w-5" /> General Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-w-lg">
          <div className="space-y-2">
            <Label htmlFor="practice-name">Name of Practice *</Label>
            <Input
              id="practice-name"
              value={practiceName}
              onChange={(e) => setPracticeName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-person">Main Contact Name</Label>
            <Input
              id="contact-person"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact-email">Main Contact Email</Label>
              <Input
                id="contact-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-phone">Phone</Label>
              <Input
                id="contact-phone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>
          </div>
          {saveErr && <p className="text-sm text-critical-600">{saveErr}</p>}
          {saveMsg && <p className="text-sm text-emerald-600">{saveMsg}</p>}
          <Button onClick={handleSaveGeneral} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* CL-024: Reset Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-5 w-5" /> Account Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-ink-600">
            Password management and two-factor authentication are handled through your authentication provider.
          </p>
          <p className="text-xs text-ink-500">
            Contact your administrator if you need to reset your password.
          </p>
        </CardContent>
      </Card>

      {/* CL-027: Support Questions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HelpCircle className="h-5 w-5" /> Support Questions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-w-lg">
          <p className="text-sm text-ink-600">
            Have a question? Send us a message and our team will get back to you.
          </p>
          <Textarea
            value={supportMsg}
            onChange={(e) => setSupportMsg(e.target.value)}
            placeholder="Type your question here..."
            rows={4}
          />
          {supportSent && <p className="text-sm text-emerald-600">Your question has been submitted. We'll get back to you soon.</p>}
          <Button onClick={handleSupportSubmit} disabled={supportSending || !supportMsg.trim()}>
            {supportSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Question
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
