import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, FileText, Globe2 } from "lucide-react";
import { formatBytes, formatRelative } from "@/lib/format";
import { toast } from "sonner";

type UrlRow = {
  label: string;
  url: string;
  available: boolean;
  meta?: string;
  hint?: string;
};

export function PublishCard({
  specUrl,
  specFormat,
  hasSpec,
  bundleUrl,
  bundleUploadedAt,
  bundleSizeBytes,
}: {
  specUrl: string;
  specFormat: "json" | "yaml";
  hasSpec: boolean;
  bundleUrl: string;
  bundleUploadedAt: string | null;
  bundleSizeBytes: number;
}) {
  const copy = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  const rows: UrlRow[] = [
    {
      label: `OpenAPI spec · openapi.${specFormat}`,
      url: specUrl,
      available: hasSpec,
      hint: "Use in Postman, Stoplight, MCP tools, docs generators",
      meta: hasSpec ? "Live" : "No spec uploaded yet",
    },
    {
      label: "Markdown bundle · bundle.md",
      url: bundleUrl,
      available: !!bundleUploadedAt,
      hint: "Collected markdown pages published by SpecBridge as a single readable .md bundle",
      meta: bundleUploadedAt
        ? `${formatBytes(bundleSizeBytes)} · uploaded ${formatRelative(bundleUploadedAt)}`
        : "Upload .md to enable",
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 border-b py-3">
        <div className="flex items-center gap-2">
          <Globe2 className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">Public URLs</CardTitle>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Permanent · never change
        </span>
      </CardHeader>
      <CardContent className="space-y-4 p-5">
        {rows.map((row) => (
          <UrlRowView key={row.label} row={row} onCopy={copy} />
        ))}
      </CardContent>
    </Card>
  );
}

function UrlRowView({
  row,
  onCopy,
}: {
  row: UrlRow;
  onCopy: (value: string, label: string) => void;
}) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">{row.label}</span>
        </div>
        <Badge variant={row.available ? "secondary" : "outline"} className="font-mono text-[10px]">
          {row.meta}
        </Badge>
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <code className="flex-1 overflow-x-auto rounded border bg-background px-2 py-1.5 font-mono text-xs">
          {row.url}
        </code>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onCopy(row.url, row.label)}
          aria-label="Copy URL"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          asChild
          aria-label="Open URL"
        >
          <a href={row.url} target="_blank" rel="noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
      {row.hint && <p className="mt-1.5 text-xs text-muted-foreground">{row.hint}</p>}
    </div>
  );
}
