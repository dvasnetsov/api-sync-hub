import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  updateCollectionSettings,
  type ApidogOverwriteBehavior,
  type ApidogServerDTO,
  type ExportFormat,
  type OasVersion,
} from "@/lib/specs.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function SettingsTab({
  projectSlug,
  collectionSlug,
  initialSourceProjectId,
  initialSourceModuleId,
  sourceTokenConfigured,
  initialPublishProjectId,
  publishTokenConfigured,
  initialOasVersion,
  initialExportFormat,
  initialEndpointBehavior,
  initialSchemaBehavior,
  initialUpdateFolderOfChangedEndpoint,
  initialDeleteUnmatchedResources,
  initialTargetEndpointFolderId,
  initialTargetSchemaFolderId,
  initialModuleId,
  initialSyncMarkdowns,
  initialSyncEnvironments,
  initialServers,
  initialServerUrls,
  specServersCount,
}: {
  projectSlug: string;
  collectionSlug: string;
  initialSourceProjectId: string;
  initialSourceModuleId: number | null;
  sourceTokenConfigured: boolean;
  initialPublishProjectId: string;
  publishTokenConfigured: boolean;
  initialOasVersion: OasVersion;
  initialExportFormat: ExportFormat;
  initialEndpointBehavior: ApidogOverwriteBehavior;
  initialSchemaBehavior: ApidogOverwriteBehavior;
  initialUpdateFolderOfChangedEndpoint: boolean;
  initialDeleteUnmatchedResources: boolean;
  initialTargetEndpointFolderId: number | null;
  initialTargetSchemaFolderId: number | null;
  initialModuleId: number | null;
  initialSyncMarkdowns: boolean;
  initialSyncEnvironments: boolean;
  initialServers: ApidogServerDTO[];
  initialServerUrls: string[];
  specServersCount: number | null;
}) {
  const qc = useQueryClient();
  const update = useServerFn(updateCollectionSettings);
  const [sourceProjectId, setSourceProjectId] = useState(initialSourceProjectId);
  const [sourceModuleId, setSourceModuleId] = useState(initialSourceModuleId?.toString() ?? "");
  const [sourceToken, setSourceToken] = useState("");
  const [publishProjectId, setPublishProjectId] = useState(initialPublishProjectId);
  const [publishToken, setPublishToken] = useState("");
  const [oas, setOas] = useState<OasVersion>(initialOasVersion);
  const [fmt, setFmt] = useState<ExportFormat>(initialExportFormat);
  const [endpointBehavior, setEndpointBehavior] =
    useState<ApidogOverwriteBehavior>(initialEndpointBehavior);
  const [schemaBehavior, setSchemaBehavior] =
    useState<ApidogOverwriteBehavior>(initialSchemaBehavior);
  const [updateFolder, setUpdateFolder] = useState(initialUpdateFolderOfChangedEndpoint);
  const [deleteMissing, setDeleteMissing] = useState(initialDeleteUnmatchedResources);
  const [endpointFolderId, setEndpointFolderId] = useState(
    initialTargetEndpointFolderId?.toString() ?? "",
  );
  const [schemaFolderId, setSchemaFolderId] = useState(
    initialTargetSchemaFolderId?.toString() ?? "",
  );
  const [moduleId, setModuleId] = useState(initialModuleId?.toString() ?? "");
  const [syncMarkdowns, setSyncMarkdowns] = useState(initialSyncMarkdowns);
  const [syncEnvironments, setSyncEnvironments] = useState(initialSyncEnvironments);
  const [serverUrls, setServerUrls] = useState<string[]>(initialServerUrls);

  const sourceConnected = sourceProjectId.trim() && (sourceTokenConfigured || sourceToken.trim());
  const publishConnected =
    publishProjectId.trim() && (publishTokenConfigured || publishToken.trim());

  const m = useMutation({
    mutationFn: () =>
      update({
        data: {
          projectSlug,
          collectionSlug,
          apidogSourceProjectId: sourceProjectId.trim() || null,
          apidogSourceModuleId: parseOptionalPositiveInt(sourceModuleId),
          apidogSourceToken: sourceToken.length > 0 ? sourceToken : undefined,
          apidogPublishProjectId: publishProjectId.trim() || null,
          apidogPublishToken: publishToken.length > 0 ? publishToken : undefined,
          oasVersion: oas,
          exportFormat: fmt,
          apidogEndpointOverwriteBehavior: endpointBehavior,
          apidogSchemaOverwriteBehavior: schemaBehavior,
          apidogUpdateFolderOfChangedEndpoint: updateFolder,
          apidogDeleteUnmatchedResources: deleteMissing,
          apidogTargetEndpointFolderId: parseOptionalPositiveInt(endpointFolderId),
          apidogTargetSchemaFolderId: parseOptionalPositiveInt(schemaFolderId),
          apidogModuleId: parseOptionalPositiveInt(moduleId),
          apidogSyncMarkdowns: syncMarkdowns,
          apidogSyncEnvironments: syncEnvironments,
          apidogEnvironmentIds: [],
          apidogServerUrls: serverUrls,
        },
      }),
    onSuccess: async () => {
      setSourceToken("");
      setPublishToken("");
      await qc.invalidateQueries({ queryKey: ["collection", projectSlug, collectionSlug] });
      await qc.invalidateQueries({ queryKey: ["project", projectSlug] });
      toast.success("Apidog settings saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    m.mutate();
  };

  return (
    <TooltipProvider delayDuration={150}>
      <Card>
        <form onSubmit={save}>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="font-serif text-2xl">Source and publish settings</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Pull can come from one Apidog project, while publish/push can go to another
                completely separate project.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge label="Source" connected={!!sourceConnected} detail={sourceProjectId} />
              <StatusBadge
                label="Publish"
                connected={!!publishConnected}
                detail={publishProjectId}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-6 border-t pt-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <section className="space-y-5 rounded-lg border bg-muted/20 p-5">
                <div>
                  <h3 className="font-serif text-xl">Pull source</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    From which Apidog project SpecBridge pulls the enriched OpenAPI spec and
                    markdown pages.
                  </p>
                </div>
                <Field
                  id="sourceProjectId"
                  label="Apidog Project ID"
                  help="The source Apidog project where managers maintain the enriched spec and docs."
                >
                  <Input
                    id="sourceProjectId"
                    value={sourceProjectId}
                    onChange={(e) => setSourceProjectId(e.target.value)}
                    placeholder="623481"
                    className="mt-1.5 font-mono"
                  />
                </Field>
                <Field
                  id="sourceToken"
                  label="Personal Access Token"
                  help="Token used for pulling OpenAPI and listing markdown pages from the source project."
                >
                  <Input
                    id="sourceToken"
                    value={sourceToken}
                    onChange={(e) => setSourceToken(e.target.value)}
                    placeholder={
                      sourceTokenConfigured ? "•••••••• (saved, type to replace)" : "apd_live_…"
                    }
                    type="password"
                    className="mt-1.5 font-mono"
                  />
                </Field>
                <Field
                  id="sourceModuleId"
                  label="Source module ID"
                  help="Optional. If filled, SpecBridge pulls only that module from the source Apidog project when the API supports module filtering."
                >
                  <Input
                    id="sourceModuleId"
                    value={sourceModuleId}
                    onChange={(e) => setSourceModuleId(e.target.value.replace(/[^\d]/g, ""))}
                    placeholder="Optional"
                    className="mt-1.5 font-mono"
                    inputMode="numeric"
                  />
                </Field>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    id="oasVersion"
                    label="OAS Version"
                    help="Which OpenAPI version to request from Apidog."
                  >
                    <Select value={oas} onValueChange={(v) => setOas(v as OasVersion)}>
                      <SelectTrigger id="oasVersion" className="mt-1.5 font-mono">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3.1">OpenAPI 3.1</SelectItem>
                        <SelectItem value="3.0">OpenAPI 3.0</SelectItem>
                        <SelectItem value="2.0">Swagger 2.0</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <ToggleRow
                    id="syncMarkdowns"
                    label="Sync markdown pages"
                    help="SpecBridge pulls markdown pages through the separate Apidog markdown API and pushes them back separately, because OpenAPI import/export does not include those pages."
                    checked={syncMarkdowns}
                    onCheckedChange={setSyncMarkdowns}
                  />
                </div>
              </section>

              <section className="space-y-5 rounded-lg border bg-muted/20 p-5">
                <div>
                  <h3 className="font-serif text-xl">Publish destination</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Where SpecBridge pushes the current published spec and markdown pages after they
                    are prepared.
                  </p>
                </div>
                <Field
                  id="publishProjectId"
                  label="Apidog Project ID"
                  help="Optional separate target Apidog project. It can be completely independent from the pull source project."
                >
                  <Input
                    id="publishProjectId"
                    value={publishProjectId}
                    onChange={(e) => setPublishProjectId(e.target.value)}
                    placeholder="781245"
                    className="mt-1.5 font-mono"
                  />
                </Field>
                <Field
                  id="publishToken"
                  label="Personal Access Token"
                  help="Token used only for pushing the published result into the destination Apidog project."
                >
                  <Input
                    id="publishToken"
                    value={publishToken}
                    onChange={(e) => setPublishToken(e.target.value)}
                    placeholder={
                      publishTokenConfigured ? "•••••••• (saved, type to replace)" : "apd_live_…"
                    }
                    type="password"
                    className="mt-1.5 font-mono"
                  />
                </Field>
                <Field
                  id="exportFormat"
                  label="Public spec format"
                  help="Which permanent public file SpecBridge publishes for this collection."
                >
                  <Select value={fmt} onValueChange={(v) => setFmt(v as ExportFormat)}>
                    <SelectTrigger id="exportFormat" className="mt-1.5 font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">JSON · openapi.json</SelectItem>
                      <SelectItem value="yaml">YAML · openapi.yaml</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </section>
            </div>

            <section className="space-y-5 rounded-lg border bg-muted/20 p-5">
              <div>
                <h3 className="font-serif text-xl">Push rules</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  These rules apply when the current public file is pushed into the publish
                  destination project.
                </p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  id="endpointBehavior"
                  label="Endpoint conflicts"
                  help="How matching endpoints with the same method and path should be handled in the destination project."
                >
                  <Select
                    value={endpointBehavior}
                    onValueChange={(v) => setEndpointBehavior(v as ApidogOverwriteBehavior)}
                  >
                    <SelectTrigger id="endpointBehavior" className="mt-1.5 font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OVERWRITE_EXISTING">Overwrite existing</SelectItem>
                      <SelectItem value="AUTO_MERGE">Auto merge</SelectItem>
                      <SelectItem value="KEEP_EXISTING">Keep existing</SelectItem>
                      <SelectItem value="CREATE_NEW">Create new</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field
                  id="schemaBehavior"
                  label="Schema conflicts"
                  help="How matching schemas/components should be handled in the destination project."
                >
                  <Select
                    value={schemaBehavior}
                    onValueChange={(v) => setSchemaBehavior(v as ApidogOverwriteBehavior)}
                  >
                    <SelectTrigger id="schemaBehavior" className="mt-1.5 font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OVERWRITE_EXISTING">Overwrite existing</SelectItem>
                      <SelectItem value="AUTO_MERGE">Auto merge</SelectItem>
                      <SelectItem value="KEEP_EXISTING">Keep existing</SelectItem>
                      <SelectItem value="CREATE_NEW">Create new</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="grid gap-5 sm:grid-cols-3">
                <Field
                  id="moduleId"
                  label="Target module ID"
                  help="Optional destination module in Apidog. Useful when several collections publish into one project."
                >
                  <Input
                    id="moduleId"
                    value={moduleId}
                    onChange={(e) => setModuleId(e.target.value.replace(/[^\d]/g, ""))}
                    placeholder="Optional"
                    className="mt-1.5 font-mono"
                    inputMode="numeric"
                  />
                </Field>
                <Field
                  id="endpointFolderId"
                  label="Endpoint folder ID"
                  help="Optional destination folder for imported endpoints."
                >
                  <Input
                    id="endpointFolderId"
                    value={endpointFolderId}
                    onChange={(e) => setEndpointFolderId(e.target.value.replace(/[^\d]/g, ""))}
                    placeholder="Optional"
                    className="mt-1.5 font-mono"
                    inputMode="numeric"
                  />
                </Field>
                <Field
                  id="schemaFolderId"
                  label="Schema folder ID"
                  help="Optional destination folder for schemas and components."
                >
                  <Input
                    id="schemaFolderId"
                    value={schemaFolderId}
                    onChange={(e) => setSchemaFolderId(e.target.value.replace(/[^\d]/g, ""))}
                    placeholder="Optional"
                    className="mt-1.5 font-mono"
                    inputMode="numeric"
                  />
                </Field>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">
                  If several collections publish into one destination project, set separate modules
                  or folders. Otherwise endpoints with identical method and path may overwrite each
                  other.
                </p>
                <div className="mt-4 space-y-4">
                  <ToggleRow
                    id="updateFolder"
                    label="Update endpoint folder"
                    help="Move matched endpoints to the folder structure coming from the pushed spec."
                    checked={updateFolder}
                    onCheckedChange={setUpdateFolder}
                  />
                  <ToggleRow
                    id="deleteMissing"
                    label="Delete resources missing from spec"
                    help="Remove destination resources that are absent from the pushed spec. Use only for strict mirroring."
                    checked={deleteMissing}
                    onCheckedChange={setDeleteMissing}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-5 rounded-lg border bg-muted/20 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="font-serif text-xl">Environments</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Select servers from the latest pull to keep in the spec when pushing into the
                    publish project.
                  </p>
                </div>
                <ToggleRow
                  id="syncEnvironments"
                  label="Sync environments"
                  help="When enabled, SpecBridge keeps only selected OpenAPI servers in the push payload."
                  checked={syncEnvironments}
                  onCheckedChange={setSyncEnvironments}
                />
              </div>
              <ServerPicker
                servers={initialServers}
                selectedUrls={serverUrls}
                disabled={!syncEnvironments}
                onToggle={(url, checked) =>
                  setServerUrls((current) =>
                    checked
                      ? [...new Set([...current, url])]
                      : current.filter((value) => value !== url),
                  )
                }
              />
              {specServersCount === 0 && (
                <Alert className="border-warning/40 bg-warning/10">
                  <AlertTitle>Servers not found in spec.</AlertTitle>
                  <AlertDescription>
                    No servers found. Add environments in your Apidog source project: Settings →
                    Environments → add base URL.
                  </AlertDescription>
                </Alert>
              )}
            </section>
          </CardContent>
          <CardFooter className="justify-end border-t bg-muted/40 px-6 py-4">
            <Button type="submit" disabled={m.isPending}>
              {m.isPending ? "Saving…" : "Save settings"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </TooltipProvider>
  );
}

function parseOptionalPositiveInt(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function ServerPicker({
  servers,
  selectedUrls,
  disabled,
  onToggle,
}: {
  servers: ApidogServerDTO[];
  selectedUrls: string[];
  disabled: boolean;
  onToggle: (url: string, checked: boolean) => void;
}) {
  if (servers.length === 0) {
    return (
      <div className="rounded-md border bg-background px-4 py-3 text-sm text-muted-foreground">
        Run pull after adding environments in Apidog to choose servers for push.
      </div>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {servers.map((server) => {
        const checked = selectedUrls.includes(server.url);
        const variableCount = Object.keys(server.variables).length;
        return (
          <label
            key={server.url}
            className={cn(
              "flex min-h-16 items-start gap-3 rounded-md border bg-background px-3 py-2 text-sm",
              disabled ? "opacity-60" : "cursor-pointer hover:bg-muted/40",
            )}
          >
            <Checkbox
              checked={checked}
              disabled={disabled}
              onCheckedChange={(value) => onToggle(server.url, value === true)}
              className="mt-1"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{server.description || server.url}</span>
              <span className="block truncate font-mono text-[11px] text-muted-foreground">
                {server.url}
              </span>
              {variableCount > 0 && (
                <span className="block text-[11px] text-muted-foreground">
                  {variableCount} variable{variableCount === 1 ? "" : "s"}
                </span>
              )}
            </span>
          </label>
        );
      })}
    </div>
  );
}

function StatusBadge({
  label,
  connected,
  detail,
}: {
  label: string;
  connected: boolean;
  detail: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-2 rounded-full px-3 py-1 font-mono text-[11px] font-normal",
        connected
          ? "border-success/40 bg-success/10 text-success"
          : "border-border bg-muted text-muted-foreground",
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", connected ? "bg-success" : "bg-muted-foreground")}
      />
      {connected ? `${label} #${detail}` : `${label} not connected`}
    </Badge>
  );
}

function ToggleRow({
  id,
  label,
  help,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  help: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border bg-background px-4 py-3">
      <div className="space-y-1">
        <Label htmlFor={id} className="text-sm">
          {label}
        </Label>
        <p className="text-sm text-muted-foreground">{help}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function Field({
  id,
  label,
  help,
  children,
}: {
  id: string;
  label: string;
  help: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <Label htmlFor={id} className="font-mono text-[11px] uppercase tracking-wider">
          {label}
        </Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="grid h-4 w-4 place-items-center rounded-full border font-mono text-[9px] text-muted-foreground hover:bg-muted"
              aria-label="Where to find this"
            >
              ?
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            {help}
          </TooltipContent>
        </Tooltip>
      </div>
      {children}
    </div>
  );
}
