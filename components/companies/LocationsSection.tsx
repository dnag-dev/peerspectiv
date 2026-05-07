"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MapPin, Plus, Pencil, Trash2, X, Check } from "lucide-react";

interface Clinic {
  id: string;
  companyId: string;
  name: string;
  city: string | null;
  state: string | null;
  isActive: boolean | null;
}

interface Props {
  companyId: string;
}

export function LocationsSection({ companyId }: Props) {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [savingNew, setSavingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clinics?company_id=${companyId}`);
      if (!res.ok) throw new Error("Failed to load locations");
      const data = await res.json();
      setClinics(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load locations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  async function handleCreate() {
    if (!newName.trim()) {
      setError("Name is required");
      return;
    }
    setSavingNew(true);
    setError(null);
    try {
      const res = await fetch("/api/clinics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          name: newName,
          city: newCity,
          state: newState,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to add location");
      }
      setNewName("");
      setNewCity("");
      setNewState("");
      setAdding(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add location");
    } finally {
      setSavingNew(false);
    }
  }

  async function handleToggleActive(c: Clinic) {
    try {
      const res = await fetch(`/api/clinics/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !c.isActive }),
      });
      if (!res.ok) throw new Error("Failed to update");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    }
  }

  function startEdit(c: Clinic) {
    setEditingId(c.id);
    setEditName(c.name);
    setEditCity(c.city || "");
    setEditState(c.state || "");
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) {
      setError("Name is required");
      return;
    }
    try {
      const res = await fetch(`/api/clinics/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, city: editCity, state: editState }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setEditingId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this location?")) return;
    try {
      const res = await fetch(`/api/clinics/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="h-5 w-5" />
          Locations
          <Badge variant="secondary" className="ml-2">
            {clinics.length}
          </Badge>
        </CardTitle>
        {!adding && (
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add location
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {error && <p className="mb-3 text-sm text-status-danger-dot">{error}</p>}

        {adding && (
          <div className="mb-4 rounded-lg border border-border-subtle bg-ink-50/50 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="new_name">Name *</Label>
                <Input
                  id="new_name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Main clinic"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new_city">City</Label>
                <Input
                  id="new_city"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  placeholder="Boston"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new_state">State</Label>
                <Input
                  id="new_state"
                  value={newState}
                  onChange={(e) => setNewState(e.target.value)}
                  placeholder="MA"
                />
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAdding(false);
                  setNewName("");
                  setNewCity("");
                  setNewState("");
                  setError(null);
                }}
                disabled={savingNew}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreate} disabled={savingNew}>
                {savingNew ? "Adding..." : "Add location"}
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : clinics.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <MapPin className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <h3 className="text-base font-medium">No locations yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add clinic locations to track cases by site.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>City</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clinics.map((c) => {
                const isEditing = editingId === c.id;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {isEditing ? (
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                      ) : (
                        c.name
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editCity}
                          onChange={(e) => setEditCity(e.target.value)}
                        />
                      ) : (
                        c.city || "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editState}
                          onChange={(e) => setEditState(e.target.value)}
                        />
                      ) : (
                        c.state || "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(c)}
                        className={`inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          c.isActive ? "bg-cobalt-600" : "bg-ink-300"
                        }`}
                        aria-label={c.isActive ? "Deactivate" : "Activate"}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            c.isActive ? "translate-x-4" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => saveEdit(c.id)}
                            title="Save"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingId(null)}
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(c)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(c.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-status-danger-dot" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
