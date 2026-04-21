"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EditCompanyDialog } from "./EditCompanyDialog";
import { Pencil, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Company } from "@/types";

interface CompanyHeaderProps {
  company: Company;
}

export function CompanyHeader({ company }: CompanyHeaderProps) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/companies" className="flex items-center gap-1 hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Companies
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{company.name}</h1>
            <Badge variant={company.status === "active" ? "success" : "secondary"}>
              {company.status}
            </Badge>
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            {company.contact_person && <span>Contact: {company.contact_person}</span>}
            {company.contact_email && <span>{company.contact_email}</span>}
            {company.contact_phone && <span>{company.contact_phone}</span>}
          </div>
        </div>
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit Company
        </Button>
      </div>

      <EditCompanyDialog company={company} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}
