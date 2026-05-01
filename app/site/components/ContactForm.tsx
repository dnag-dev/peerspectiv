"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { contact } from "../lib/copy";

export function ContactForm() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") || ""),
      email: String(fd.get("email") || ""),
      org: String(fd.get("org") || ""),
      role: String(fd.get("role") || ""),
      message: String(fd.get("message") || ""),
    };
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      setDone(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl rounded-lg border border-cobalt-200 bg-cobalt-50 p-6 text-center">
        <p className="text-base text-ink-800">{contact.form.success}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto grid max-w-xl gap-4 rounded-lg border border-ink-100 bg-paper-surface p-6"
    >
      <Field name="name" label={contact.form.nameLabel} required />
      <Field name="email" label={contact.form.emailLabel} type="email" required />
      <Field name="org" label={contact.form.orgLabel} />
      <Field name="role" label={contact.form.roleLabel} />
      <div>
        <label className="block text-sm font-medium text-ink-800">
          {contact.form.messageLabel}
        </label>
        <textarea
          name="message"
          rows={4}
          className="mt-1 w-full rounded-md border border-ink-200 bg-paper-surface px-3 py-2 text-sm text-ink-900 focus:border-cobalt-700 focus:outline-none focus:ring-1 focus:ring-cobalt-200"
        />
      </div>
      {err && <p className="text-sm text-critical-700">{contact.form.error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-cobalt-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-cobalt-700 disabled:opacity-60"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {contact.form.submit}
      </button>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-ink-800">
        {label}
        {required && <span className="text-critical-600"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        className="mt-1 w-full rounded-md border border-ink-200 bg-paper-surface px-3 py-2 text-sm text-ink-900 focus:border-cobalt-700 focus:outline-none focus:ring-1 focus:ring-cobalt-200"
      />
    </div>
  );
}
