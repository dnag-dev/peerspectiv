"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface Props {
  /** Currently selected specialty names. */
  value: string[];
  /** Called whenever the selection changes. */
  onChange: (next: string[]) => void;
  /** Optional id for the trigger select (form labels). */
  id?: string;
  disabled?: boolean;
}

/**
 * Phase 2 — admin/credentialer multi-specialty picker. Reads the active
 * taxonomy from /api/specialties; renders selected items as removable chips.
 */
export function SpecialtyMultiSelect({ value, onChange, id, disabled }: Props) {
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/specialties");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load specialties");
        if (!cancelled) {
          setOptions(((json.data ?? []) as { name: string }[]).map((r) => r.name));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function add(specialty: string) {
    if (!specialty || value.includes(specialty)) return;
    onChange([...value, specialty]);
  }

  function remove(specialty: string) {
    onChange(value.filter((s) => s !== specialty));
  }

  const remaining = options.filter((o) => !value.includes(o));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-[28px]" data-testid="specialty-chips">
        {value.length === 0 && (
          <span className="text-xs text-ink-400">No specialties selected</span>
        )}
        {value.map((s) => (
          <span
            key={s}
            className="inline-flex items-center gap-1 rounded-full bg-cobalt-50 px-2 py-0.5 text-xs text-cobalt-700"
          >
            {s}
            {!disabled && (
              <button
                type="button"
                onClick={() => remove(s)}
                aria-label={`Remove ${s}`}
                className="hover:text-cobalt-900"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
      </div>

      {!disabled && (
        <select
          id={id}
          value=""
          disabled={loading || remaining.length === 0}
          onChange={(e) => {
            if (e.target.value) add(e.target.value);
            e.target.value = "";
          }}
          className="w-full rounded-md border border-ink-300 px-2 py-1.5 text-sm bg-white"
        >
          <option value="">
            {loading
              ? "Loading…"
              : remaining.length === 0
                ? "All specialties selected"
                : "Add a specialty…"}
          </option>
          {remaining.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      )}

      {error && <p className="text-xs text-critical-700">{error}</p>}
    </div>
  );
}
