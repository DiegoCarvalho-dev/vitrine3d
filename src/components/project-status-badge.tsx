import { cn } from "cn";

import { PROJECT_STATUS_LABEL } from "@/lib/validacoes/empreendimento";

type Status = keyof typeof PROJECT_STATUS_LABEL;

// Green/yellow/gray are reserved for UNIT availability (3D and legends), so the
// project status uses the brand color and neutrals instead.
const STYLE: Record<Status, string> = {
  publicado: "border-primary bg-primary text-primary-foreground",
  rascunho: "border-border bg-muted text-foreground",
  arquivado: "border-border bg-background text-muted-foreground",
};

export function ProjectStatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        STYLE[status],
      )}
    >
      {PROJECT_STATUS_LABEL[status]}
    </span>
  );
}
