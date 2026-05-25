import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusPillStatus = "idle" | "success" | "error" | "in_progress";

const cfg: Record<StatusPillStatus, { label: string; dot: string; cls: string }> = {
  success: {
    label: "Live",
    dot: "bg-success",
    cls: "border-success/40 bg-success/10 text-success",
  },
  error: {
    label: "Failed",
    dot: "bg-destructive",
    cls: "border-destructive/40 bg-destructive/10 text-destructive",
  },
  in_progress: {
    label: "Syncing",
    dot: "bg-warning animate-pulse",
    cls: "border-warning/50 bg-warning/10 text-warning",
  },
  idle: {
    label: "No spec",
    dot: "bg-muted-foreground",
    cls: "border-border bg-card text-muted-foreground",
  },
};

export function StatusPill({ status }: { status?: StatusPillStatus }) {
  const c = cfg[status ?? "idle"];
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] font-normal uppercase tracking-wider",
        c.cls,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
      {c.label}
    </Badge>
  );
}
