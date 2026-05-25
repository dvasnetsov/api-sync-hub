export type ExportFormat = "json" | "yaml";

export function specPublicUrl(
  projectSlug: string,
  collectionSlug: string,
  format: ExportFormat,
): string {
  const ext = format === "yaml" ? "yaml" : "json";
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : "";
  return `${base}/api/public/specs/${projectSlug}/${collectionSlug}/openapi.${ext}`;
}

export function formatBytes(b: number): string {
  if (!b) return "0 B";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

export function formatRelative(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.max(1, Math.floor(diff))}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
