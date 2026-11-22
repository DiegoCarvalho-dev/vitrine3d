import { cn } from "cn";

import { INTEREST_LABEL, type InterestLevel } from "@/lib/leads/interest";

// Warm colors only for the thermometer; green/yellow/gray stay reserved for
// UNIT availability. Always a word + the reasons (never color alone).
const STYLE: Record<InterestLevel, string> = {
  quente: "border-orange-700 bg-orange-700 text-white",
  morno: "border-orange-300 bg-orange-50 text-orange-950",
  frio: "border-border bg-background text-muted-foreground",
};

export function InterestBadge({ level }: { level: InterestLevel }) {
  return (
    <span
      data-testid="interest-badge"
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        STYLE[level],
      )}
    >
      {INTEREST_LABEL[level]}
    </span>
  );
}
