import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { StatusPill } from "@/components/StatusPill";
import { publishToPostman, updatePostmanSettings } from "@/lib/publish.functions";
import { formatRelative } from "@/lib/format";
import { toast } from "sonner";
import { Send } from "lucide-react";
import type { SyncStatus } from "@/lib/specs.functions";

export function PostmanCard({
  projectSlug,
  collectionSlug,
  hasSpec,
  apiKeyConfigured,
  collectionId,
  workspaceId,
  autoPublish,
  lastStatus,
  lastAt,
  lastMessage,
}: {
  projectSlug: string;
  collectionSlug: string;
  hasSpec: boolean;
  apiKeyConfigured: boolean;
  collectionId: string | null;
  workspaceId: string | null;
  autoPublish: boolean;
  lastStatus: SyncStatus;
  lastAt: string | null;
  lastMessage: string | null;
}) {
  const qc = useQueryClient();
  const save = useServerFn(updatePostmanSettings);
  const pub = useServerFn(publishToPostman);
  const [apiKey, setApiKey] = useState("");
  const [colId, setColId] = useState(collectionId ?? "");
  const [wsId, setWsId] = useState(workspaceId ?? "");
  const [auto, setAuto] = useState(autoPublish);

  // Re-sync local state when the DB values change (e.g. after publish auto-saved them).
  useEffect(() => setColId(collectionId ?? ""), [collectionId]);
  useEffect(() => setWsId(workspaceId ?? ""), [workspaceId]);
  useEffect(() => setAuto(autoPublish), [autoPublish]);

  const saveMut = useMutation({
    mutationFn: () =>
      save({
        data: {
          projectSlug,
          collectionSlug,
          apiKey: apiKey.length ? apiKey : undefined,
          collectionId: colId.trim() || null,
          workspaceId: wsId.trim() || null,
          autoPublish: auto,
        },
      }),
    onSuccess: async () => {
      setApiKey("");
      await qc.invalidateQueries({ queryKey: ["collection", projectSlug, collectionSlug] });
      toast.success("Postman settings saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pubMut = useMutation({
    mutationFn: () =>
      pub({
        data: {
          projectSlug,
          collectionSlug,
          apiKeyOverride: apiKey.length > 0 ? apiKey : undefined,
          collectionIdOverride: colId,
          workspaceIdOverride: wsId,
        },
      }),
    onSuccess: async (r) => {
      setApiKey("");
      await qc.invalidateQueries({ queryKey: ["collection", projectSlug, collectionSlug] });
      toast.success(r.message ?? "Published to Postman");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ready = apiKeyConfigured || apiKey.length > 0;

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-medium">Postman</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {collectionId ? `Collection #${collectionId}` : "Will create new collection on first publish"}
            </p>
          </div>
          <StatusPill status={lastStatus} />
        </div>
        {lastAt && (
          <p className="text-xs text-muted-foreground">
            Last publish {formatRelative(lastAt)}
            {lastMessage ? ` · ${lastMessage.slice(0, 120)}` : ""}
          </p>
        )}

        <div className="space-y-3 border-t pt-4">
          <div>
            <Label htmlFor="pm-key" className="font-mono text-[11px] uppercase tracking-wider">
              Postman API key
            </Label>
            <Input
              id="pm-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={apiKeyConfigured ? "•••••••• (saved)" : "PMAK-…"}
              className="mt-1.5 font-mono"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="pm-col" className="font-mono text-[11px] uppercase tracking-wider">
                Collection ID (optional)
              </Label>
              <Input
                id="pm-col"
                value={colId}
                onChange={(e) => setColId(e.target.value)}
                placeholder="leave blank to auto-create"
                className="mt-1.5 font-mono"
              />
            </div>
            <div>
              <Label htmlFor="pm-ws" className="font-mono text-[11px] uppercase tracking-wider">
                Workspace ID (optional)
              </Label>
              <Input
                id="pm-ws"
                value={wsId}
                onChange={(e) => setWsId(e.target.value)}
                placeholder="for create"
                className="mt-1.5 font-mono"
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border bg-muted/30 p-3">
            <div>
              <p className="text-sm font-medium">Auto-publish after pull</p>
              <p className="text-xs text-muted-foreground">Push to Postman whenever a new spec arrives.</p>
            </div>
            <Switch checked={auto} onCheckedChange={setAuto} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            {saveMut.isPending ? "Saving…" : "Save"}
          </Button>
          <Button
            onClick={() => pubMut.mutate()}
            disabled={pubMut.isPending || !hasSpec || !ready}
          >
            <Send className="mr-1.5 h-4 w-4" />
            {pubMut.isPending ? "Publishing…" : "Publish to Postman"}
          </Button>
        </div>
        {!hasSpec && (
          <p className="text-xs text-muted-foreground">Pull or upload a spec first.</p>
        )}
        {!ready && (
          <p className="text-xs text-muted-foreground">Save an API key to enable publishing.</p>
        )}
      </CardContent>
    </Card>
  );
}
