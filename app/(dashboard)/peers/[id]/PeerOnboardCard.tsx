"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, ShieldCheck, AlertTriangle, Loader2 } from "lucide-react";

interface Props {
  peerId: string;
  paymentReady: boolean | null;
  beneficiaryStatus: string | null;
  bankStatus: string | null;
  w9Status: string | null;
  defaults?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  };
}

export function PeerOnboardCard({
  peerId,
  paymentReady,
  beneficiaryStatus,
  bankStatus,
  w9Status,
  defaults,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<
    | null
    | { aautipay: "submitted"; beneficiaryStatus: string }
    | { aautipay: "failed"; message: string }
  >(null);

  const [form, setForm] = useState({
    first_name: defaults?.firstName ?? "",
    last_name: defaults?.lastName ?? "",
    email: defaults?.email ?? "",
    mobile: "",
    dob: "",
    ssn_last_4: "",
    address: "",
    city: "",
    state: "",
    postal_code: "",
    bank_name: "",
    account_number: "",
    bank_code: "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/peers/${peerId}/onboard-aautipay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Failed (${res.status})`);
      setResult(json);
      setOpen(false);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  const statusBadge = paymentReady ? (
    <Badge className="border-0 bg-mint-100 text-cobalt-700">
      <ShieldCheck className="mr-1 h-3 w-3" /> Payment Ready
    </Badge>
  ) : beneficiaryStatus ? (
    <Badge className="border-0 bg-amber-100 text-amber-700">
      Pending Aautipay verification
    </Badge>
  ) : w9Status === "collected_pending_aautipay" ? (
    <Badge className="border-0 bg-critical-100 text-critical-700">
      <AlertTriangle className="mr-1 h-3 w-3" /> Aautipay submission failed
    </Badge>
  ) : (
    <Badge className="border-0 bg-ink-100 text-ink-700">Not onboarded</Badge>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Aautipay Onboarding
          </span>
          {statusBadge}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
          <div>
            <div className="text-muted-foreground">W-9</div>
            <div className="font-medium">{w9Status ?? "not_collected"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Beneficiary</div>
            <div className="font-medium">{beneficiaryStatus ?? "—"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Bank</div>
            <div className="font-medium">{bankStatus ?? "—"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Payments</div>
            <div className="font-medium">
              {paymentReady ? "enabled" : "disabled"}
            </div>
          </div>
        </div>

        {result?.aautipay === "submitted" && (
          <div className="rounded-md border border-mint-200 bg-mint-50 p-3 text-xs text-mint-800">
            Submitted to Aautipay. Status: {result.beneficiaryStatus}
          </div>
        )}
        {result?.aautipay === "failed" && (
          <div className="rounded-md border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800">
            {result.message}
          </div>
        )}

        {!open ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(true)}
            disabled={isPending}
          >
            {beneficiaryStatus || w9Status === "collected_pending_aautipay"
              ? "Resubmit KYC + Bank"
              : "Start Onboarding"}
          </Button>
        ) : (
          <form
            onSubmit={submit}
            className="space-y-4 rounded-md border border-ink-200 p-4"
          >
            <div>
              <p className="mb-2 text-eyebrow text-ink-500">PERSONAL</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input label="First name" value={form.first_name} onChange={set("first_name")} required />
                <Input label="Last name" value={form.last_name} onChange={set("last_name")} required />
                <Input label="Email" type="email" value={form.email} onChange={set("email")} required />
                <Input label="Mobile (e.g. 5551234567)" value={form.mobile} onChange={set("mobile")} required />
                <Input label="Date of birth (YYYY-MM-DD)" value={form.dob} onChange={set("dob")} />
                <Input label="SSN last 4" value={form.ssn_last_4} onChange={set("ssn_last_4")} maxLength={4} />
              </div>
            </div>

            <div>
              <p className="mb-2 text-eyebrow text-ink-500">ADDRESS</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input label="Street address" value={form.address} onChange={set("address")} required />
                <Input label="City" value={form.city} onChange={set("city")} required />
                <Input label="State (2-letter)" value={form.state} onChange={set("state")} maxLength={2} required />
                <Input label="Postal code" value={form.postal_code} onChange={set("postal_code")} required />
              </div>
            </div>

            <div>
              <p className="mb-2 text-eyebrow text-ink-500">BANK</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input label="Bank name" value={form.bank_name} onChange={set("bank_name")} required />
                <Input label="Routing # (bank code)" value={form.bank_code} onChange={set("bank_code")} required />
                <Input label="Account #" value={form.account_number} onChange={set("account_number")} required />
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-critical-100 bg-critical-50 p-2 text-xs text-critical-700">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-cobalt-600 hover:bg-cobalt-700"
              >
                {submitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                Submit
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function Input({
  label,
  ...rest
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-700">{label}</span>
      <input
        {...rest}
        className="w-full rounded-md border border-ink-200 bg-paper-surface px-2.5 py-1.5 text-sm outline-none focus:border-cobalt-700 focus:ring-1 focus:ring-cobalt-200"
      />
    </label>
  );
}
