import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Layers } from "lucide-react";
import type { Batch } from "@/types";

export const dynamic = 'force-dynamic';

interface BatchWithCompany extends Batch {
  company_name: string | null;
}

function BatchStatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
        variants[status] || variants.pending
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}

async function getBatches(): Promise<BatchWithCompany[]> {
  const { data, error } = await supabaseAdmin
    .from("batches")
    .select("*, company:companies(name)")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((batch: any) => ({
    ...batch,
    company_name: (batch.companies as { name: string } | null)?.name ?? null,
    companies: undefined,
  }));
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function BatchesPage() {
  const batches = await getBatches();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Batches</h1>
        <p className="text-muted-foreground">
          View and manage uploaded case batches.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-5 w-5" />
            All Batches
            <Badge variant="secondary" className="ml-2">
              {batches.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {batches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Layers className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">No batches yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Batches appear here when cases are uploaded.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Upload Date</TableHead>
                  <TableHead className="text-center">Total Cases</TableHead>
                  <TableHead className="text-center">Assigned</TableHead>
                  <TableHead className="text-center">Completed</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/batches/${batch.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {batch.batch_name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {batch.company_name || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(batch.date_uploaded)}
                    </TableCell>
                    <TableCell className="text-center">{batch.total_cases}</TableCell>
                    <TableCell className="text-center">{batch.assigned_cases}</TableCell>
                    <TableCell className="text-center">{batch.completed_cases}</TableCell>
                    <TableCell>
                      <BatchStatusBadge status={batch.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
