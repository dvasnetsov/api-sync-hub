import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StatusPill } from "@/components/StatusPill";
import { UploadCard } from "@/components/collection/UploadCard";
import { PublishCard } from "@/components/collection/PublishCard";
import { PostmanCard } from "@/components/collection/PostmanCard";
import { WorkflowSteps } from "@/components/collection/WorkflowSteps";
import { HistoryTab } from "@/components/collection/HistoryTab";
import { SettingsTab } from "@/components/collection/SettingsTab";
import { EnvironmentsTab } from "@/components/collection/EnvironmentsTab";
import { formatBytes, formatRelative, specPublicUrl } from "@/lib/format";
import { getCollection, pushToApidog, syncFromApidog } from "@/lib/specs.functions";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpFromLine,
  Copy,
  History,
  Loader2,
  Settings2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_app/projects/$slug/$collection")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.collection} · ${params.slug} — SpecBridge` },
      { name: "description", content: `OpenAPI collection ${params.collection}.` },
    ],
  }),
  component: CollectionDetail,
});

function CollectionDetail() {
  const { slug, collection } = Route.useParams();
  const qc = useQueryClient();
  const get = useServerFn(getCollection);
  const sync = useServerFn(syncFromApidog);
  const push = useServerFn(pushToApidog);
  const queryKey = ["collection", slug, collection];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => get({ data: { projectSlug: slug, collectionSlug: collection } }),
    refetchInterval: (q) =>
      q.state.data?.collection.lastSyncStatus === "in_progress" ? 2000 : false,
  });

  const syncMut = useMutation({
    mutationFn: () => sync({ data: { projectSlug: slug, collectionSlug: collection } }),
    onMutate: () => {
      qc.setQueryData(queryKey, (prev: typeof data) =>
        prev
          ? { ...prev, collection: { ...prev.collection, lastSyncStatus: "in_progress" as const } }
          : prev,
      );
    },
    onSuccess: async (r) => {
      await qc.invalidateQueries({ queryKey });
      await qc.invalidateQueries({ queryKey: ["project", slug] });
      toast.success(`Pulled ${r.entry.endpoints} endpoints from Apidog`);
    },
    onError: async (e: Error) => {
      await qc.invalidateQueries({ queryKey });
      toast.error(e.message);
    },
  });

  const [pushOpen, setPushOpen] = useState(false);
  const pushMut = useMutation({
    mutationFn: () =>
      push({
        data: {
          projectSlug: slug,
          collectionSlug: collection,
          publicUrl:
            typeof window !== "undefined"
              ? `${window.location.origin}/api/public/specs/${slug}/${collection}/openapi.${data?.collection.exportFormat ?? "json"}`
              : undefined,
        },
      }),
    onSuccess: async (r) => {
      await qc.invalidateQueries({ queryKey });
      const counters = r.counters ?? {};
      const created = Number(counters.endpointCreated ?? 0);
      const updated = Number(counters.endpointUpdated ?? 0);
      const parts = [
        created ? `${created} created` : null,
        updated ? `${updated} updated` : null,
      ].filter(Boolean);
      toast.success(
        `Pushed to Apidog — ${parts.join(", ") || `${r.endpoints} endpoints`}`,
        r.warnings?.length ? { description: r.warnings.slice(0, 2).join("; ") } : undefined,
      );
      setPushOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [tab, setTab] = useState<"overview" | "environments" | "history" | "settings">("overview");

  if (isLoading) {
    return (
      <main className="mx-auto flex max-w-7xl justify-center px-6 py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    );
  }
  if (!data) throw notFound();

  const { project, collection: c, history } = data;
  const url = specPublicUrl(project.slug, c.slug, c.exportFormat);
  const bundleUrl = url.replace(/openapi\.(json|yaml)$/, "bundle.md");
  const syncing = c.lastSyncStatus === "in_progress" || syncMut.isPending;
  const pullReady = !!c.apidogSourceProjectId && c.apidogSourceTokenConfigured;
  const publishReady = !!c.apidogPublishProjectId && c.apidogPublishTokenConfigured;
  const hasSpec = c.lastSyncStatus === "success" && !!c.lastSyncAt;

  const triggerSync = () => {
    if (!pullReady) {
      toast.error("Configure the pull source in Settings first");
      setTab("settings");
      return;
    }
    syncMut.mutate();
  };

  const triggerPush = () => {
    if (!publishReady) {
      toast.error("Configure the publish destination in Settings first");
      setTab("settings");
      return;
    }
    if (!hasSpec) {
      toast.error("No spec to push — pull from Apidog or upload a file first");
      return;
    }
    setPushOpen(true);
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(url);
    toast.success("Public URL copied");
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <Link
        to="/projects/$slug"
        params={{ slug: project.slug }}
        className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> {project.name}
      </Link>

      <header className="mt-6 flex flex-wrap items-start justify-between gap-6 border-b pb-8">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Collection
            </p>
            <StatusPill status={c.lastSyncStatus} />
          </div>
          <h1 className="mt-2 font-serif text-5xl">{c.name}</h1>
          {c.description && (
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{c.description}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={copyUrl}>
            <Copy className="mr-1.5 h-4 w-4" /> Copy URL
          </Button>
          <Button
            variant="outline"
            onClick={triggerPush}
            disabled={pushMut.isPending || !hasSpec || !publishReady}
          >
            <ArrowUpFromLine
              className={`mr-1.5 h-4 w-4 ${pushMut.isPending ? "animate-pulse" : ""}`}
            />
            {pushMut.isPending ? "Pushing…" : "Push to Apidog"}
          </Button>
          <Button onClick={triggerSync} disabled={syncing}>
            <ArrowDownToLine className={`mr-1.5 h-4 w-4 ${syncing ? "animate-pulse" : ""}`} />
            {syncing ? "Pulling…" : "Pull from Apidog"}
          </Button>
        </div>
      </header>

      {(!pullReady || !publishReady) && (
        <Alert className="mt-4 border-warning/40 bg-warning/5">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>
              {!pullReady && !publishReady
                ? "Pull source and publish destination are not configured for this collection."
                : !pullReady
                  ? "Pull source is not configured for this collection."
                  : "Publish destination is not configured for this collection."}
            </span>
            <Button size="sm" variant="outline" onClick={() => setTab("settings")}>
              Open settings
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <AlertDialog open={pushOpen} onOpenChange={setPushOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Push spec to Apidog?</AlertDialogTitle>
            <AlertDialogDescription>
              Apidog will import this spec into publish project{" "}
              <span className="font-mono text-foreground">#{c.apidogPublishProjectId}</span> using
              your current settings: endpoints{" "}
              <span className="font-mono text-foreground">{c.apidogEndpointOverwriteBehavior}</span>
              , schemas{" "}
              <span className="font-mono text-foreground">{c.apidogSchemaOverwriteBehavior}</span>
              {c.apidogDeleteUnmatchedResources
                ? ", deleting resources that are missing from the spec."
                : ", keeping resources that are missing from the spec."}{" "}
              {c.apidogTargetEndpointFolderId || c.apidogModuleId
                ? "The import will be routed to the configured Apidog folder/module."
                : "Without a target folder or module, different collections in one destination Apidog project can affect each other when method and path match."}{" "}
              {c.apidogSourceModuleId
                ? `Pull is limited to source module #${c.apidogSourceModuleId}. `
                : ""}
              {c.apidogSyncMarkdowns
                ? `Markdown pages will also be synced (${c.markdowns.length} pulled/manual pages + any x-apidog-markdowns in the spec).`
                : "Markdown pages are not synced — enable it in Settings if you need them."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pushMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                pushMut.mutate();
              }}
              disabled={pushMut.isPending}
            >
              {pushMut.isPending ? "Pushing…" : "Push now"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mt-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <BigStat label="Endpoints" value={c.endpoints ? c.endpoints.toString() : "—"} />
        <BigStat label="Spec size" value={formatBytes(c.sizeBytes)} />
        <BigStat label="Last pull" value={c.lastSyncAt ? formatRelative(c.lastSyncAt) : "Never"} />
        <BigStat
          label="Bundle .md"
          value={c.bundleMdUploadedAt ? formatBytes(c.bundleMdSizeBytes) : "—"}
          mono
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mt-10">
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="environments" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Environments
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <History className="h-3.5 w-3.5" /> Sync history
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings2 className="h-3.5 w-3.5" /> Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <WorkflowSteps />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-6">
              <SectionIntro
                eyebrow="Pull"
                title="Откуда тянем"
                body="Здесь указан исходный Apidog-проект, из которого забираем обогащенную OpenAPI-спецификацию и markdown-страницы."
              />
              <SourceDestinationCard
                title="Source Apidog"
                projectId={c.apidogSourceProjectId}
                tokenConfigured={c.apidogSourceTokenConfigured}
                actionLabel={syncing ? "Pulling…" : "Pull now"}
                onAction={triggerSync}
                disabled={!pullReady || syncing}
                note={
                  c.apidogSyncMarkdowns
                    ? `Markdown pages pull through the dedicated Apidog markdown API${c.apidogSourceModuleId ? ` for module #${c.apidogSourceModuleId}` : ""}.`
                    : "Markdown sync is disabled for this collection."
                }
              />
              <UploadCard projectSlug={project.slug} collectionSlug={c.slug} />
            </div>

            <div className="space-y-6">
              <SectionIntro
                eyebrow="Publish"
                title="Куда публикуем"
                body="Здесь — публичные URL и отдельный проект назначения, куда при необходимости пушится уже опубликованная версия."
              />
              <PublishCard
                specUrl={url}
                specFormat={c.exportFormat}
                hasSpec={hasSpec}
                bundleUrl={bundleUrl}
                bundleUploadedAt={c.bundleMdUploadedAt}
                bundleSizeBytes={c.bundleMdSizeBytes}
              />
              <SourceDestinationCard
                title="Publish Apidog"
                projectId={c.apidogPublishProjectId}
                tokenConfigured={c.apidogPublishTokenConfigured}
                actionLabel={pushMut.isPending ? "Pushing…" : "Push now"}
                onAction={triggerPush}
                disabled={!publishReady || !hasSpec || pushMut.isPending}
                note="This publish destination can be fully independent from the pull source project."
              />
              <PostmanCard
                projectSlug={project.slug}
                collectionSlug={c.slug}
                hasSpec={hasSpec}
                apiKeyConfigured={c.postmanApiKeyConfigured}
                collectionId={c.postmanCollectionId}
                workspaceId={c.postmanWorkspaceId}
                autoPublish={c.postmanAutoPublish}
                lastStatus={c.postmanLastPublishStatus}
                lastAt={c.postmanLastPublishAt}
                lastMessage={c.postmanLastPublishMessage}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <HistoryTab history={history} />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <SettingsTab
            projectSlug={project.slug}
            collectionSlug={c.slug}
            initialSourceProjectId={c.apidogSourceProjectId ?? ""}
            initialSourceModuleId={c.apidogSourceModuleId}
            sourceTokenConfigured={c.apidogSourceTokenConfigured}
            initialPublishProjectId={c.apidogPublishProjectId ?? ""}
            publishTokenConfigured={c.apidogPublishTokenConfigured}
            initialOasVersion={c.oasVersion}
            initialExportFormat={c.exportFormat}
            initialEndpointBehavior={c.apidogEndpointOverwriteBehavior}
            initialSchemaBehavior={c.apidogSchemaOverwriteBehavior}
            initialUpdateFolderOfChangedEndpoint={c.apidogUpdateFolderOfChangedEndpoint}
            initialDeleteUnmatchedResources={c.apidogDeleteUnmatchedResources}
            initialTargetEndpointFolderId={c.apidogTargetEndpointFolderId}
            initialTargetSchemaFolderId={c.apidogTargetSchemaFolderId}
            initialModuleId={c.apidogModuleId}
            initialSyncMarkdowns={c.apidogSyncMarkdowns}
            initialSyncEnvironments={c.apidogSyncEnvironments}
            initialServers={c.apidogServers}
            initialServerUrls={c.apidogServerUrls}
            specServersCount={c.specServersCount}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}

function SectionIntro({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
        {eyebrow}
      </p>
      <h2 className="mt-2 font-serif text-3xl">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function SourceDestinationCard({
  title,
  projectId,
  tokenConfigured,
  actionLabel,
  onAction,
  disabled,
  note,
}: {
  title: string;
  projectId: string | null;
  tokenConfigured: boolean;
  actionLabel: string;
  onAction: () => void;
  disabled: boolean;
  note: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-medium">{title}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {projectId ? `Project #${projectId}` : "Not configured"}
            </p>
          </div>
          <StatusPill status={projectId && tokenConfigured ? "success" : "idle"} />
        </div>
        <p className="text-sm text-muted-foreground">{note}</p>
        <Button onClick={onAction} disabled={disabled} className="w-full sm:w-auto">
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

function BigStat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <p className={`mt-1 ${mono ? "font-mono text-lg" : "font-serif text-3xl"}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
