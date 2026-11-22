import { cn } from "cn";

import { LEAD_STATUS_LABEL, type LeadStatus } from "@/lib/leads/status";

// The brand color and neutrals only: green/yellow/gray are reserved for UNIT
// availability (see ProjectStatusBadge).
const STYLE: Record<LeadStatus, string> = {
  novo: "border-primary bg-primary text-primary-foreground",
  em_contato: "border-primary bg-background text-foreground",
  visita_agendada: "border-primary bg-background text-foreground",
  ganho: "border-border bg-muted text-foreground",
  perdido: "border-border bg-background text-muted-foreground",
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        STYLE[status],
      )}
    >
      {LEAD_STATUS_LABEL[status]}
    </span>
  );
}
