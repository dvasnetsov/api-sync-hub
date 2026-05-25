import { EmptyState } from "@/components/EmptyState";
import { formatBytes, formatRelative } from "@/lib/format";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, History, XCircle } from "lucide-react";
import type { SyncEntryDTO } from "@/lib/specs.functions";

export function HistoryTab({ history }: { history: SyncEntryDTO[] }) {
  if (history.length === 0) {
    return (
      <EmptyState
        icon={<History className="h-8 w-8" />}
        title="No sync history yet"
        description="Once you sync from Apidog or upload a spec, every event will be logged here."
      />
    );
  }
  return (
    <ol className="relative space-y-0 border-l pl-6">
      {history.map((h) => (
        <li key={h.id} className="relative pb-6">
          <span
            className={`absolute -left-[27px] top-1.5 grid h-4 w-4 place-items-center rounded-full border bg-background ${
              h.status === "success"
                ? "border-success"
                : h.status === "error"
                  ? "border-destructive"
                  : "border-warning"
            }`}
          >
            {h.status === "success" && <CheckCircle2 className="h-3 w-3 text-success" />}
            {h.status === "error" && <XCircle className="h-3 w-3 text-destructive" />}
            {h.status === "in_progress" && (
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warning" />
            )}
          </span>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-serif text-lg">
              {h.status === "success"
                ? `Synced ${h.endpoints} endpoints`
                : h.status === "error"
                  ? "Sync failed"
                  : "Sync in progress"}
            </p>
            <p className="font-mono text-xs text-muted-foreground">{formatRelative(h.at)}</p>
          </div>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
            source · {h.source} {h.sizeBytes ? `· ${formatBytes(h.sizeBytes)}` : ""}
          </p>
          {h.message && (
            <Alert variant="destructive" className="mt-2 py-2">
              <AlertDescription className="font-mono text-xs">{h.message}</AlertDescription>
            </Alert>
          )}
        </li>
      ))}
    </ol>
  );
}
