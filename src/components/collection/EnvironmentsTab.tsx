import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, Upload, Send } from "lucide-react";
import { toast } from "sonner";
import {
  deleteEnvironment,
  listEnvironments,
  pushEnvironmentsToPostman,
  uploadEnvironmentFile,
} from "@/lib/environments.functions";

export function EnvironmentsTab({
  projectSlug,
  collectionSlug,
  postmanReady,
}: {
  projectSlug: string;
  collectionSlug: string;
  postmanReady: boolean;
}) {
  const qc = useQueryClient();
  const list = useServerFn(listEnvironments);
  const upload = useServerFn(uploadEnvironmentFile);
  const del = useServerFn(deleteEnvironment);
  const pushPm = useServerFn(pushEnvironmentsToPostman);
  const queryKey = ["environments", projectSlug, collectionSlug];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => list({ data: { projectSlug, collectionSlug } }),
  });

  const fileRef = useRef<HTMLInputElement>(null);

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      const buf = await file.arrayBuffer();
      let bin = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
      const contentBase64 = btoa(bin);
      return upload({
        data: { projectSlug, collectionSlug, filename: file.name, contentBase64 },
      });
    },
    onSuccess: async (env) => {
      await qc.invalidateQueries({ queryKey });
      toast.success(`Loaded env "${env.name}"`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { projectSlug, collectionSlug, id } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [pushing, setPushing] = useState(false);
  const pushMut = useMutation({
    mutationFn: () => pushPm({ data: { projectSlug, collectionSlug } }),
    onMutate: () => setPushing(true),
    onSettled: () => setPushing(false),
    onSuccess: async (r) => {
      await qc.invalidateQueries({ queryKey });
      toast.success(`Pushed ${r.pushed} environment(s) to Postman`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-medium">Environments</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Pulled from Apidog on every sync. You can also upload a Postman environment file
                (.postman_environment.json). Push sends them as separate Postman environments and
                also injects variables into the collection.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadMut.mutate(f);
                  e.target.value = "";
                }}
              />
              <Button
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={uploadMut.isPending}
              >
                <Upload className="mr-1.5 h-4 w-4" />
                {uploadMut.isPending ? "Uploading…" : "Upload env file"}
              </Button>
              <Button
                onClick={() => pushMut.mutate()}
                disabled={!postmanReady || pushing || !(data?.length ?? 0)}
                title={!postmanReady ? "Configure Postman API key first" : ""}
              >
                <Send className={`mr-1.5 h-4 w-4 ${pushing ? "animate-pulse" : ""}`} />
                {pushing ? "Pushing…" : "Push envs to Postman"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No environments yet. Pull from Apidog or upload a Postman env file.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((env) => (
            <Card key={env.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{env.name}</p>
                      <Badge variant="outline" className="font-mono text-[10px] uppercase">
                        {env.source}
                      </Badge>
                      {env.postmanEnvUid && (
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          postman
                        </Badge>
                      )}
                    </div>
                    {env.baseUrl && (
                      <p className="mt-1 font-mono text-xs text-muted-foreground truncate">
                        {env.baseUrl}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => delMut.mutate(env.id)}
                    disabled={delMut.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {Object.keys(env.variables).length > 0 && (
                  <div className="rounded border border-border/60 bg-muted/30 p-2 max-h-40 overflow-auto">
                    <table className="w-full text-xs font-mono">
                      <tbody>
                        {Object.entries(env.variables).map(([k, v]) => (
                          <tr key={k} className="border-b border-border/40 last:border-0">
                            <td className="py-1 pr-3 text-muted-foreground align-top">{k}</td>
                            <td className="py-1 break-all">{v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
