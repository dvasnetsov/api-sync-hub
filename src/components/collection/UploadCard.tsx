import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { uploadSpec } from "@/lib/specs.functions";
import { formatBytes } from "@/lib/format";
import { FileText, Loader2, RefreshCw, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunk)) as unknown as number[],
    );
  }
  return btoa(binary);
}

export function UploadCard({
  projectSlug,
  collectionSlug,
}: {
  projectSlug: string;
  collectionSlug: string;
}) {
  const qc = useQueryClient();
  const upload = useServerFn(uploadSpec);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const stageFile = (files: FileList | null) => {
    if (!files?.length) return;
    const f = files[0];
    if (!/\.(json|ya?ml|md)$/i.test(f.name)) {
      toast.error("Only .json, .yaml, .yml or .md accepted");
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      toast.error("File too large (max 15 MB)");
      return;
    }
    setFile(f);
  };

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const b64 = arrayBufferToBase64(buf);
      await upload({
        data: { projectSlug, collectionSlug, filename: file.name, contentBase64: b64 },
      });
      await qc.invalidateQueries({ queryKey: ["collection", projectSlug, collectionSlug] });
      await qc.invalidateQueries({ queryKey: ["project", projectSlug] });
      toast.success(`Published ${file.name}`);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 border-b py-3">
        <CardTitle className="text-sm font-medium">Upload published file</CardTitle>
        <span className="text-xs text-muted-foreground">OpenAPI or Apidog markdown export</span>
      </CardHeader>
      <CardContent className="p-0">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            stageFile(e.dataTransfer.files);
          }}
          className={cn(
            "flex flex-col items-center justify-center border-b border-dashed p-8 text-center transition-colors",
            drag ? "border-foreground bg-muted" : "border-border bg-card",
          )}
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
        >
          {file ? (
            <div className="flex w-full max-w-sm items-center gap-3 rounded-md border bg-background px-3 py-2.5 text-left">
              <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-sm">{file.name}</p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {formatBytes(file.size)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setFile(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
                disabled={busy}
                aria-label="Remove file"
                className="h-7 w-7"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <Upload className="h-7 w-7 text-muted-foreground" />
              <h3 className="mt-3 font-serif text-xl">Drop the file you publish</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                .json, .yaml, .yml or .md — up to 15 MB
              </p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".json,.yaml,.yml,.md"
            className="hidden"
            onChange={(e) => stageFile(e.target.files)}
          />
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-2 bg-muted/40 px-4 py-3">
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {file ? "Choose different…" : "Choose file"}
        </Button>
        <Button onClick={submit} disabled={!file || busy} size="sm">
          {busy ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Publishing…
            </>
          ) : (
            <>
              <RefreshCw className="mr-1.5 h-4 w-4" /> Publish to URL
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
