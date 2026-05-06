"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Upload, Download } from "lucide-react";

function downloadTemplate() {
  const header = "first_name,last_name,specialty,npi,email";
  const sample1 = "John,Smith,Family Medicine,1234567890,john.smith@clinic.com";
  const sample2 = "Jane,Doe,Internal Medicine,0987654321,jane.doe@clinic.com";
  const csv = [header, sample1, sample2].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "provider_import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

interface Candidate {
  first_name: string | null;
  last_name: string | null;
  specialty: string | null;
  npi: string | null;
  email: string | null;
}

interface Props {
  companyId: string;
}

export function ImportProvidersDialog({ companyId }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [inserting, setInserting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [selected, setSelected] = useState<boolean[]>([]);

  function reset() {
    setError(null);
    setCandidates(null);
    setSelected([]);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("company_id", companyId);
      const res = await fetch("/api/providers/import", { method: "POST", body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || "Failed to parse file");
      }
      const list: Candidate[] = body.candidates || [];
      setCandidates(list);
      setSelected(list.map(() => true));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleInsert() {
    if (!candidates) return;
    const chosen = candidates.filter((_, i) => selected[i]);
    if (chosen.length === 0) {
      setError("Select at least one provider to insert");
      return;
    }
    setInserting(true);
    setError(null);
    try {
      const res = await fetch("/api/providers/bulk-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: companyId, providers: chosen }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to insert providers");
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Insert failed");
    } finally {
      setInserting(false);
    }
  }

  function toggle(i: number) {
    setSelected((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  }

  function toggleAll() {
    const allOn = selected.every(Boolean);
    setSelected(selected.map(() => !allOn));
  }

  const selectedCount = selected.filter(Boolean).length;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Upload className="mr-2 h-4 w-4" />
        Import providers
      </Button>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Import providers</DialogTitle>
          <DialogDescription>
            Upload a CSV, TSV, or PDF roster. We&apos;ll extract providers and let you confirm before inserting.
          </DialogDescription>
        </DialogHeader>

        {!candidates && (
          <div className="space-y-3 py-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.tsv,.pdf"
              onChange={handleFileChange}
              disabled={uploading}
              className="block w-full text-sm text-ink-700 file:mr-4 file:rounded-md file:border-0 file:bg-cobalt-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-cobalt-700"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={downloadTemplate}
                className="inline-flex items-center gap-1 text-xs text-cobalt-700 hover:underline"
              >
                <Download className="h-3 w-3" />
                Download CSV template
              </button>
              <span className="text-xs text-ink-400">
                Columns: first_name, last_name, specialty, npi, email
              </span>
            </div>
            {uploading && <p className="text-sm text-muted-foreground">Parsing file...</p>}
          </div>
        )}

        {candidates && candidates.length === 0 && (
          <p className="py-4 text-sm text-muted-foreground">
            No providers were found in the uploaded file.
          </p>
        )}

        {candidates && candidates.length > 0 && (
          <div className="max-h-[400px] overflow-y-auto rounded-md border border-ink-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-ink-50">
                <tr className="border-b border-ink-200">
                  <th className="w-10 px-2 py-2 text-left">
                    <input
                      type="checkbox"
                      checked={selected.every(Boolean)}
                      onChange={toggleAll}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="px-2 py-2 text-left font-medium">First</th>
                  <th className="px-2 py-2 text-left font-medium">Last</th>
                  <th className="px-2 py-2 text-left font-medium">Specialty</th>
                  <th className="px-2 py-2 text-left font-medium">NPI</th>
                  <th className="px-2 py-2 text-left font-medium">Email</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c, i) => (
                  <tr key={i} className="border-b border-ink-100 last:border-0">
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={!!selected[i]}
                        onChange={() => toggle(i)}
                        aria-label={`Select row ${i + 1}`}
                      />
                    </td>
                    <td className="px-2 py-2">{c.first_name || "-"}</td>
                    <td className="px-2 py-2">{c.last_name || "-"}</td>
                    <td className="px-2 py-2">{c.specialty || "-"}</td>
                    <td className="px-2 py-2">{c.npi || "-"}</td>
                    <td className="px-2 py-2">{c.email || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {error && <p className="text-sm text-critical-600">{error}</p>}

        <DialogFooter>
          {candidates && (
            <Button
              variant="outline"
              onClick={() => reset()}
              disabled={inserting}
            >
              Choose another file
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false);
              reset();
            }}
            disabled={uploading || inserting}
          >
            Cancel
          </Button>
          {candidates && candidates.length > 0 && (
            <Button onClick={handleInsert} disabled={inserting || selectedCount === 0}>
              {inserting ? "Inserting..." : `Insert ${selectedCount} provider${selectedCount === 1 ? "" : "s"}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
