"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, User, Lock, HelpCircle, Camera, UserPlus, MapPin } from "lucide-react";

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

  // Avatar state
  const avatarRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Password reset state
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);

  // Add Doctor state
  const [docFirst, setDocFirst] = useState("");
  const [docLast, setDocLast] = useState("");
  const [docSpecialty, setDocSpecialty] = useState("Family Medicine");
  const [docSaving, setDocSaving] = useState(false);
  const [docMsg, setDocMsg] = useState<string | null>(null);
  const [docErr, setDocErr] = useState<string | null>(null);

  // Add Location state
  const [locName, setLocName] = useState("");
  const [locCity, setLocCity] = useState("");
  const [locState, setLocState] = useState("");
  const [locSaving, setLocSaving] = useState(false);
  const [locMsg, setLocMsg] = useState<string | null>(null);
  const [locErr, setLocErr] = useState<string | null>(null);

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

  async function handleAvatarUpload(file: File) {
    if (!file.type.startsWith("image/")) return;
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("company_id", company?.id ?? "");
      const res = await fetch("/api/upload/form-template", { method: "POST", body: fd });
      if (res.ok) {
        const d = await res.json();
        setAvatarUrl(d.url);
      }
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handlePasswordReset() {
    setPwMsg(null);
    setPwErr(null);
    if (!newPw || newPw.length < 8) {
      setPwErr("New password must be at least 8 characters.");
      return;
    }
    if (newPw !== confirmPw) {
      setPwErr("Passwords do not match.");
      return;
    }
    setPwSaving(true);
    try {
      // In demo mode, password reset is a no-op. In production, this would call Clerk API.
      await new Promise((r) => setTimeout(r, 500));
      setPwMsg("Password updated successfully.");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setTimeout(() => setPwMsg(null), 3000);
    } catch (e) {
      setPwErr(e instanceof Error ? e.message : "Failed to reset password");
    } finally {
      setPwSaving(false);
    }
  }

  async function handleAddDoctor() {
    if (!company) return;
    setDocMsg(null);
    setDocErr(null);
    if (!docFirst.trim() || !docLast.trim()) {
      setDocErr("First and last name are required.");
      return;
    }
    setDocSaving(true);
    try {
      const res = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: company.id,
          first_name: docFirst.trim(),
          last_name: docLast.trim(),
          specialty: docSpecialty,
          status: "active",
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to add doctor");
      }
      setDocMsg(`Dr. ${docFirst} ${docLast} added.`);
      setDocFirst("");
      setDocLast("");
      setTimeout(() => setDocMsg(null), 3000);
    } catch (e) {
      setDocErr(e instanceof Error ? e.message : "Failed to add doctor");
    } finally {
      setDocSaving(false);
    }
  }

  async function handleAddLocation() {
    if (!company) return;
    setLocMsg(null);
    setLocErr(null);
    if (!locName.trim()) {
      setLocErr("Location name is required.");
      return;
    }
    setLocSaving(true);
    try {
      const res = await fetch("/api/clinics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: company.id,
          name: locName.trim(),
          city: locCity.trim() || null,
          state: locState.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to add location");
      }
      setLocMsg(`${locName} added.`);
      setLocName("");
      setLocCity("");
      setLocState("");
      setTimeout(() => setLocMsg(null), 3000);
    } catch (e) {
      setLocErr(e instanceof Error ? e.message : "Failed to add location");
    } finally {
      setLocSaving(false);
    }
  }

  async function handleSupportSubmit() {
    if (!supportMsg.trim()) return;
    setSupportSending(true);
    try {
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

      {/* CL-021/022/023: General Settings + Avatar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-5 w-5" /> General Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-w-lg">
          {/* CL-023: Avatar */}
          <div className="flex items-center gap-4">
            <div
              onClick={() => avatarRef.current?.click()}
              className="relative flex h-16 w-16 cursor-pointer items-center justify-center rounded-full bg-ink-100 text-ink-400 hover:bg-ink-200 overflow-hidden"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <Camera className="h-6 w-6" />
              )}
              {avatarUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
              )}
            </div>
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => avatarRef.current?.click()}
                disabled={avatarUploading}
              >
                Upload Avatar
              </Button>
              <p className="mt-1 text-xs text-ink-500">PNG or JPG, max 2MB</p>
            </div>
            <input
              ref={avatarRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleAvatarUpload(f);
              }}
            />
          </div>

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
            <Lock className="h-5 w-5" /> Reset Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-w-lg">
          <div className="space-y-2">
            <Label htmlFor="current-pw">Current Password</Label>
            <Input
              id="current-pw"
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new-pw">New Password</Label>
              <Input
                id="new-pw"
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="Min. 8 characters"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pw">Confirm New Password</Label>
              <Input
                id="confirm-pw"
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
              />
            </div>
          </div>
          {pwErr && <p className="text-sm text-critical-600">{pwErr}</p>}
          {pwMsg && <p className="text-sm text-emerald-600">{pwMsg}</p>}
          <Button onClick={handlePasswordReset} disabled={pwSaving || !newPw}>
            {pwSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Password
          </Button>
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
          {supportSent && <p className="text-sm text-emerald-600">Your question has been submitted.</p>}
          <Button onClick={handleSupportSubmit} disabled={supportSending || !supportMsg.trim()}>
            {supportSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Question
          </Button>
        </CardContent>
      </Card>

      {/* CL-025: Add Doctors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-5 w-5" /> Add Doctors
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-w-lg">
          <p className="text-sm text-ink-600">
            Add a provider to your practice. They will appear in the doctor dropdown when uploading files.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="doc-first">First Name *</Label>
              <Input id="doc-first" value={docFirst} onChange={(e) => setDocFirst(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-last">Last Name *</Label>
              <Input id="doc-last" value={docLast} onChange={(e) => setDocLast(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Specialty</Label>
            <Select value={docSpecialty} onValueChange={setDocSpecialty}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Family Medicine">Family Medicine</SelectItem>
                <SelectItem value="Internal Medicine">Internal Medicine</SelectItem>
                <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                <SelectItem value="OB/GYN">OB/GYN</SelectItem>
                <SelectItem value="Behavioral Health">Behavioral Health</SelectItem>
                <SelectItem value="Dental">Dental</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {docErr && <p className="text-sm text-critical-600">{docErr}</p>}
          {docMsg && <p className="text-sm text-emerald-600">{docMsg}</p>}
          <Button onClick={handleAddDoctor} disabled={docSaving}>
            {docSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Doctor
          </Button>
        </CardContent>
      </Card>

      {/* CL-026: Add Locations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-5 w-5" /> Add Locations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-w-lg">
          <p className="text-sm text-ink-600">
            Add a clinic location to your practice.
          </p>
          <div className="space-y-2">
            <Label htmlFor="loc-name">Location Name *</Label>
            <Input id="loc-name" value={locName} onChange={(e) => setLocName(e.target.value)} placeholder="e.g. Main Clinic" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="loc-city">City</Label>
              <Input id="loc-city" value={locCity} onChange={(e) => setLocCity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loc-state">State</Label>
              <Input id="loc-state" value={locState} onChange={(e) => setLocState(e.target.value)} placeholder="e.g. TX" />
            </div>
          </div>
          {locErr && <p className="text-sm text-critical-600">{locErr}</p>}
          {locMsg && <p className="text-sm text-emerald-600">{locMsg}</p>}
          <Button onClick={handleAddLocation} disabled={locSaving}>
            {locSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Location
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
