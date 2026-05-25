import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  updateCollectionMarkdowns,
  type ManualMarkdown,
} from "@/lib/specs.functions";

type Draft = { name: string; content: string; folderId: string };

export function MarkdownsTab({
  projectSlug,
  collectionSlug,
  initial,
}: {
  projectSlug: string;
  collectionSlug: string;
  initial: ManualMarkdown[];
}) {
  const qc = useQueryClient();
  const save = useServerFn(updateCollectionMarkdowns);
  const [drafts, setDrafts] = useState<Draft[]>(() =>
    initial.length
      ? initial.map((m) => ({
          name: m.name,
          content: m.content,
          folderId: m.folderId ? String(m.folderId) : "",
        }))
      : [],
  );

  const m = useMutation({
    mutationFn: () =>
      save({
        data: {
          projectSlug,
          collectionSlug,
          markdowns: drafts
            .map((d) => ({
              name: d.name.trim(),
              content: d.content,
              folderId: d.folderId.trim() ? Number(d.folderId) : null,
            }))
            .filter((d) => d.name.length > 0),
        },
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["collection", projectSlug, collectionSlug] });
      toast.success("Markdown pages saved — they'll sync to Apidog on next push");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = (idx: number, patch: Partial<Draft>) =>
    setDrafts((arr) => arr.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  const add = () =>
    setDrafts((arr) => [...arr, { name: "", content: "", folderId: "" }]);
  const remove = (idx: number) => setDrafts((arr) => arr.filter((_, i) => i !== idx));

  return (
    <div className="space-y-6">
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          Markdown pages are stored here and synced to Apidog on every <strong>Push</strong>.
          Matching is by <code className="font-mono text-xs">name</code>: same name → updated,
          new name → created. Pages defined inline in the OpenAPI spec under{" "}
          <code className="font-mono text-xs">x-apidog-markdowns</code> are merged in too
          (manual entries here override them).
        </AlertDescription>
      </Alert>

      {drafts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-serif text-lg">No markdown pages yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add a getting-started guide, changelog, or any long-form doc.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={add}>
              <Plus className="mr-1.5 h-4 w-4" /> Add page
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {drafts.map((d, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="font-serif text-lg">
                  {d.name.trim() || "Untitled page"}
                </CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(i)}
                  aria-label="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 border-t pt-4">
                <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
                  <div>
                    <Label htmlFor={`md-name-${i}`} className="font-mono text-[11px] uppercase tracking-wider">
                      Title
                    </Label>
                    <Input
                      id={`md-name-${i}`}
                      value={d.name}
                      onChange={(e) => update(i, { name: e.target.value })}
                      placeholder="Getting started"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`md-fid-${i}`} className="font-mono text-[11px] uppercase tracking-wider">
                      Folder ID (optional)
                    </Label>
                    <Input
                      id={`md-fid-${i}`}
                      value={d.folderId}
                      onChange={(e) => update(i, { folderId: e.target.value.replace(/[^\d]/g, "") })}
                      placeholder="0 = root"
                      className="mt-1.5 font-mono"
                      inputMode="numeric"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor={`md-c-${i}`} className="font-mono text-[11px] uppercase tracking-wider">
                    Markdown
                  </Label>
                  <Textarea
                    id={`md-c-${i}`}
                    value={d.content}
                    onChange={(e) => update(i, { content: e.target.value })}
                    placeholder="# Introduction&#10;&#10;Write your docs here…"
                    className="mt-1.5 min-h-[180px] font-mono text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardFooter className="flex items-center justify-between gap-3 py-4">
          <Button type="button" variant="outline" onClick={add}>
            <Plus className="mr-1.5 h-4 w-4" /> Add page
          </Button>
          <Button type="button" onClick={() => m.mutate()} disabled={m.isPending}>
            {m.isPending ? "Saving…" : "Save markdown pages"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
