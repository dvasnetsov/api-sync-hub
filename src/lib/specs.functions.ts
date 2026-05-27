import { createServerFn } from "@tanstack/react-start";

import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import {
  assertProjectAccess,
  assertProjectOwner,
  getUserContext,
  type UserContext,
} from "@/lib/access.server";

// ============= Shared DTO types (client-safe) =============
export type OasVersion = "3.1" | "3.0" | "2.0";
export type ExportFormat = "json" | "yaml";
export type SyncStatus = "idle" | "in_progress" | "success" | "error";
export type SyncSource = "apidog" | "upload" | "manual";
export type ApidogOverwriteBehavior =
  | "OVERWRITE_EXISTING"
  | "AUTO_MERGE"
  | "KEEP_EXISTING"
  | "CREATE_NEW";

export type SyncEntryDTO = {
  id: string;
  at: string;
  status: SyncStatus;
  source: SyncSource;
  endpoints: number;
  sizeBytes: number;
  message: string | null;
};

export type ManualMarkdown = {
  name: string;
  content: string;
  folderId?: number | null;
};

export type ApidogServerDTO = {
  url: string;
  description: string | null;
  variables: Record<string, Json | undefined>;
};

export type CollectionDTO = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  apidogSourceProjectId: string | null;
  apidogSourceModuleId: number | null;
  apidogSourceTokenConfigured: boolean;
  apidogPublishProjectId: string | null;
  apidogPublishTokenConfigured: boolean;
  oasVersion: OasVersion;
  exportFormat: ExportFormat;
  endpoints: number;
  sizeBytes: number;
  lastSyncAt: string | null;
  lastSyncStatus: SyncStatus;
  apidogEndpointOverwriteBehavior: ApidogOverwriteBehavior;
  apidogSchemaOverwriteBehavior: ApidogOverwriteBehavior;
  apidogUpdateFolderOfChangedEndpoint: boolean;
  apidogDeleteUnmatchedResources: boolean;
  apidogTargetEndpointFolderId: number | null;
  apidogTargetSchemaFolderId: number | null;
  apidogModuleId: number | null;
  apidogSyncMarkdowns: boolean;
  apidogSyncEnvironments: boolean;
  apidogEnvironmentIds: number[];
  apidogServers: ApidogServerDTO[];
  apidogServerUrls: string[];
  apidogAutoPublish: boolean;
  apidogLastPublishAt: string | null;
  apidogLastPublishStatus: SyncStatus;
  apidogLastPublishMessage: string | null;
  postmanApiKeyConfigured: boolean;
  postmanCollectionId: string | null;
  postmanWorkspaceId: string | null;
  postmanAutoPublish: boolean;
  postmanLastPublishAt: string | null;
  postmanLastPublishStatus: SyncStatus;
  postmanLastPublishMessage: string | null;
  markdowns: ManualMarkdown[];
  bundleMdUploadedAt: string | null;
  bundleMdSizeBytes: number;
  specServersCount: number | null;
};

export type ProjectDTO = {
  id: string;
  slug: string;
  name: string;
  createdAt: string;
};

export type ProjectListItemDTO = ProjectDTO & {
  collectionsCount: number;
  liveCount: number;
};

export type ProjectDetailDTO = ProjectDTO & {
  collections: CollectionDTO[];
};

export type CollectionDetailDTO = {
  project: ProjectDTO;
  collection: CollectionDTO;
  history: SyncEntryDTO[];
};

// ============= helpers =============
function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "item"
  );
}

type CollectionRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  apidog_source_project_id: string | null;
  apidog_source_module_id: number | null;
  apidog_source_token: string | null;
  apidog_publish_project_id: string | null;
  apidog_publish_token: string | null;
  apidog_project_id: string | null;
  apidog_token: string | null;
  oas_version: OasVersion;
  export_format: ExportFormat;
  endpoints: number;
  size_bytes: number;
  last_sync_at: string | null;
  last_sync_status: SyncStatus;
  apidog_endpoint_overwrite_behavior: ApidogOverwriteBehavior;
  apidog_schema_overwrite_behavior: ApidogOverwriteBehavior;
  apidog_update_folder_of_changed_endpoint: boolean;
  apidog_delete_unmatched_resources: boolean;
  apidog_target_endpoint_folder_id: number | null;
  apidog_target_schema_folder_id: number | null;
  apidog_module_id: number | null;
  apidog_sync_markdowns: boolean;
  apidog_sync_environments: boolean;
  apidog_environment_ids: number[] | null;
  apidog_servers: unknown;
  apidog_server_urls: string[] | null;
  apidog_auto_publish: boolean;
  apidog_last_publish_at: string | null;
  apidog_last_publish_status: SyncStatus;
  apidog_last_publish_message: string | null;
  postman_api_key: string | null;
  postman_collection_id: string | null;
  postman_workspace_id: string | null;
  postman_auto_publish: boolean;
  postman_last_publish_at: string | null;
  postman_last_publish_status: SyncStatus;
  postman_last_publish_message: string | null;
  markdowns: unknown;
  bundle_md_uploaded_at: string | null;
  bundle_md_size_bytes: number;
};

function normalizeMarkdowns(raw: unknown): ManualMarkdown[] {
  if (!Array.isArray(raw)) return [];
  const out: ManualMarkdown[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const name = typeof r.name === "string" ? r.name.trim() : "";
    const content = typeof r.content === "string" ? r.content : "";
    if (!name) continue;
    const folderIdRaw = r.folderId ?? r.folder_id;
    const folderId =
      typeof folderIdRaw === "number" && Number.isFinite(folderIdRaw) && folderIdRaw > 0
        ? Math.trunc(folderIdRaw)
        : null;
    out.push({ name, content, folderId });
  }
  return out;
}

function normalizeStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((value) => (typeof value === "string" ? value.trim() : "")).filter(Boolean);
}

function toJsonValue(value: unknown): Json | undefined {
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (Array.isArray(value)) {
    return value.map(toJsonValue).filter((item): item is Json => item !== undefined);
  }
  if (value && typeof value === "object") {
    const out: Record<string, Json | undefined> = {};
    for (const [key, nested] of Object.entries(value)) out[key] = toJsonValue(nested);
    return out;
  }
  return undefined;
}

function normalizeJsonObject(raw: unknown): Record<string, Json | undefined> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const normalized = toJsonValue(raw);
  return normalized && typeof normalized === "object" && !Array.isArray(normalized)
    ? normalized
    : {};
}

function normalizeVariableMap(raw: unknown): Record<string, Json | undefined> {
  const out: Record<string, Json | undefined> = {};
  if (!raw) return out;
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const record = item as Record<string, unknown>;
      const key = getStringField(record, ["key", "name", "variable", "variableName"]);
      if (!key) continue;
      const value =
        record.currentValue ??
        record.localValue ??
        record.initialValue ??
        record.defaultValue ??
        record.value ??
        "";
      out[key] = toJsonValue(value) ?? "";
    }
    return out;
  }
  if (typeof raw !== "object") return out;
  const record = raw as Record<string, unknown>;
  for (const key of ["variables", "envVariables", "environmentVariables", "values"]) {
    if (Array.isArray(record[key])) Object.assign(out, normalizeVariableMap(record[key]));
  }
  for (const [key, value] of Object.entries(record)) {
    if (["variables", "envVariables", "environmentVariables", "values"].includes(key)) continue;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = value as Record<string, unknown>;
      const nestedValue =
        nested.currentValue ?? nested.localValue ?? nested.initialValue ?? nested.defaultValue ?? nested.value;
      out[key] = toJsonValue(nestedValue ?? value) ?? "";
    } else {
      out[key] = toJsonValue(value) ?? "";
    }
  }
  return out;
}

function toOpenApiServerVariables(
  variables: Record<string, Json | undefined>,
): Record<string, Json | undefined> {
  const out: Record<string, Json | undefined> = {};
  for (const [key, value] of Object.entries(variables)) {
    if (value && typeof value === "object" && !Array.isArray(value) && "default" in value) {
      out[key] = value;
    } else if (value !== undefined) {
      out[key] = { default: String(value ?? "") };
    }
  }
  return out;
}

function normalizeApidogServers(raw: unknown): ApidogServerDTO[] {
  if (!Array.isArray(raw)) return [];
  const out: ApidogServerDTO[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const url = typeof record.url === "string" ? record.url.trim() : "";
    if (!url) continue;
    const description =
      typeof record.description === "string" && record.description.trim()
        ? record.description.trim()
        : null;
    const variables = normalizeJsonObject(record.variables);
    out.push({ url, description, variables });
  }
  return out;
}

function getStringField(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function getObjectField(record: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  for (const key of keys) {
    const value = record[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }
  return {};
}

function getNumberField(record: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return Math.trunc(value);
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number.parseInt(value.trim(), 10);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  }
  return null;
}

function getArrayRows(payload: unknown, keys: string[]): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value;
  }
  const data = record.data;
  if (data && typeof data === "object") {
    return getArrayRows(data, keys);
  }
  return [];
}

type ApidogEnvironmentExportData = {
  ids: number[];
  servers: ApidogServerDTO[];
};

function normalizeEnvironmentForExport(row: unknown): {
  id: number | null;
  server: ApidogServerDTO | null;
} {
  if (!row || typeof row !== "object") return { id: null, server: null };
  const record = row as Record<string, unknown>;
  const id = getNumberField(record, ["id", "environmentId", "envId", "environment_id"]);
  const name = getStringField(record, ["name", "title", "envName", "environmentName"]);
  const directUrl = getStringField(record, [
    "url",
    "baseUrl",
    "baseURL",
    "base_url",
    "serverUrl",
    "serverURL",
    "host",
  ]);
  const nestedServers = normalizeApidogServers(record.servers);
  const url = directUrl || nestedServers[0]?.url || "";
  const server = url
    ? {
        url,
        description: name || nestedServers[0]?.description || null,
        variables: {
          ...normalizeVariableMap(record.variables),
          ...normalizeVariableMap(record.envVariables),
          ...normalizeVariableMap(record.environmentVariables),
          ...normalizeVariableMap(record.values),
          ...nestedServers[0]?.variables,
        },
      }
    : null;
  return { id, server };
}

async function fetchEnvironmentExportDataFromApidog({
  projectId,
  token,
}: {
  projectId: string;
  token: string;
}): Promise<ApidogEnvironmentExportData> {
  // Apidog has shipped the environments listing under several paths over time.
  // We try them in order — first match with a parseable body wins.
  const candidates = [
    `https://api.apidog.com/v1/projects/${encodeURIComponent(projectId)}/environments`,
    `https://api.apidog.com/api/v1/projects/${encodeURIComponent(projectId)}/environments`,
    `https://api.apidog.com/v1/projects/${encodeURIComponent(projectId)}/environments?detail=true`,
  ];
  const headers = {
    Authorization: `Bearer ${token}`,
    "X-Apidog-Api-Version": "2024-03-28",
    Accept: "application/json",
  };
  for (const url of candidates) {
    try {
      const res = await fetch(url, { method: "GET", headers });
      if (!res.ok) {
        console.warn(`[pull] envs ${url} → ${res.status}`);
        continue;
      }
      const payload = await res.json().catch(() => ({}));
      const normalized = getArrayRows(payload, [
        "data",
        "items",
        "list",
        "environments",
        "records",
      ]).map(normalizeEnvironmentForExport);
      const ids = [
        ...new Set(normalized.map((item) => item.id).filter((id): id is number => !!id)),
      ];
      const servers = normalized
        .map((item) => item.server)
        .filter((server): server is ApidogServerDTO => !!server);
      if (ids.length > 0 || servers.length > 0) {
        console.log(`[pull] envs from ${url}: ${ids.length} ids, ${servers.length} servers`);
        return { ids, servers };
      }
    } catch (e) {
      console.warn(`[pull] envs ${url} failed`, e);
    }
  }
  // Fallback: probe IDs 1..30 via export-openapi to discover envs Apidog has
  // (imitates "select all" in the Export UI). Cheap because we just need
  // Apidog to echo back whatever IDs it accepts via servers.
  console.warn("[pull] no env list endpoint worked, falling back to probe range 1..100");
  return { ids: Array.from({ length: 100 }, (_, i) => i + 1), servers: [] };
}

function mergeServers(...groups: ApidogServerDTO[][]): ApidogServerDTO[] {
  const byUrl = new Map<string, ApidogServerDTO>();
  for (const group of groups) {
    for (const server of group) {
      if (!byUrl.has(server.url)) byUrl.set(server.url, server);
    }
  }
  return [...byUrl.values()];
}

function toCollectionDTO(row: CollectionRow): CollectionDTO {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    apidogSourceProjectId: row.apidog_source_project_id ?? row.apidog_project_id,
    apidogSourceModuleId: row.apidog_source_module_id,
    apidogSourceTokenConfigured: !!(row.apidog_source_token ?? row.apidog_token),
    apidogPublishProjectId: row.apidog_publish_project_id ?? row.apidog_project_id,
    apidogPublishTokenConfigured: !!(row.apidog_publish_token ?? row.apidog_token),
    oasVersion: row.oas_version,
    exportFormat: row.export_format,
    endpoints: row.endpoints,
    sizeBytes: Number(row.size_bytes),
    lastSyncAt: row.last_sync_at,
    lastSyncStatus: row.last_sync_status,
    apidogEndpointOverwriteBehavior: row.apidog_endpoint_overwrite_behavior,
    apidogSchemaOverwriteBehavior: row.apidog_schema_overwrite_behavior,
    apidogUpdateFolderOfChangedEndpoint: row.apidog_update_folder_of_changed_endpoint,
    apidogDeleteUnmatchedResources: row.apidog_delete_unmatched_resources,
    apidogTargetEndpointFolderId: row.apidog_target_endpoint_folder_id,
    apidogTargetSchemaFolderId: row.apidog_target_schema_folder_id,
    apidogModuleId: row.apidog_module_id,
    apidogSyncMarkdowns: row.apidog_sync_markdowns,
    apidogSyncEnvironments: row.apidog_sync_environments,
    apidogEnvironmentIds: Array.isArray(row.apidog_environment_ids)
      ? row.apidog_environment_ids.map(Number).filter((id) => Number.isFinite(id) && id > 0)
      : [],
    apidogServers: normalizeApidogServers(row.apidog_servers),
    apidogServerUrls: normalizeStringArray(row.apidog_server_urls),
    apidogAutoPublish: row.apidog_auto_publish,
    apidogLastPublishAt: row.apidog_last_publish_at,
    apidogLastPublishStatus: row.apidog_last_publish_status,
    apidogLastPublishMessage: row.apidog_last_publish_message,
    postmanApiKeyConfigured: !!row.postman_api_key,
    postmanCollectionId: row.postman_collection_id,
    postmanWorkspaceId: row.postman_workspace_id,
    postmanAutoPublish: row.postman_auto_publish,
    postmanLastPublishAt: row.postman_last_publish_at,
    postmanLastPublishStatus: row.postman_last_publish_status,
    postmanLastPublishMessage: row.postman_last_publish_message,
    markdowns: normalizeMarkdowns(row.markdowns),
    bundleMdUploadedAt: row.bundle_md_uploaded_at,
    bundleMdSizeBytes: Number(row.bundle_md_size_bytes ?? 0),
    specServersCount: null,
  };
}

function storagePath(projectSlug: string, collectionSlug: string, fmt: ExportFormat): string {
  return `${projectSlug}/${collectionSlug}/openapi.${fmt}`;
}

const COLLECTION_SELECT =
  "id, slug, name, description, apidog_source_project_id, apidog_source_module_id, apidog_source_token, apidog_publish_project_id, apidog_publish_token, apidog_project_id, apidog_token, oas_version, export_format, endpoints, size_bytes, last_sync_at, last_sync_status, apidog_endpoint_overwrite_behavior, apidog_schema_overwrite_behavior, apidog_update_folder_of_changed_endpoint, apidog_delete_unmatched_resources, apidog_target_endpoint_folder_id, apidog_target_schema_folder_id, apidog_module_id, apidog_sync_markdowns, apidog_sync_environments, apidog_environment_ids, apidog_servers, apidog_server_urls, apidog_auto_publish, apidog_last_publish_at, apidog_last_publish_status, apidog_last_publish_message, postman_api_key, postman_collection_id, postman_workspace_id, postman_auto_publish, postman_last_publish_at, postman_last_publish_status, postman_last_publish_message, markdowns, bundle_md_uploaded_at, bundle_md_size_bytes";

// ============= server fns =============

export const listProjects = createServerFn({ method: "GET" }).handler(
  async (): Promise<ProjectListItemDTO[]> => {
    const { data: projects, error } = await supabaseAdmin
      .from("projects")
      .select("id, slug, name, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const ids = (projects ?? []).map((p) => p.id);
    let counts: Record<string, { total: number; live: number }> = {};
    if (ids.length) {
      const { data: cols } = await supabaseAdmin
        .from("collections")
        .select("project_id, last_sync_status")
        .in("project_id", ids);
      for (const c of cols ?? []) {
        const k = c.project_id as string;
        counts[k] ??= { total: 0, live: 0 };
        counts[k].total += 1;
        if (c.last_sync_status === "success") counts[k].live += 1;
      }
    }
    return (projects ?? []).map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      createdAt: p.created_at,
      collectionsCount: counts[p.id]?.total ?? 0,
      liveCount: counts[p.id]?.live ?? 0,
    }));
  },
);

export const createProject = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        name: z.string().trim().min(1).max(100),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<ProjectDTO> => {
    const base = slugify(data.name);
    let slug = base;
    for (let i = 2; i < 50; i++) {
      const { data: existing } = await supabaseAdmin
        .from("projects")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!existing) break;
      slug = `${base}-${i}`;
    }
    const { data: row, error } = await supabaseAdmin
      .from("projects")
      .insert({ name: data.name, slug })
      .select("id, slug, name, created_at")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id, slug: row.slug, name: row.name, createdAt: row.created_at };
  });

export const deleteProject = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ slug: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("projects").delete().eq("slug", data.slug);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getProject = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: z.string().min(1) }).parse(d))
  .handler(async ({ data }): Promise<ProjectDetailDTO | null> => {
    const { data: project } = await supabaseAdmin
      .from("projects")
      .select("id, slug, name, created_at")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!project) return null;
    const { data: cols } = await supabaseAdmin
      .from("collections")
      .select(COLLECTION_SELECT)
      .eq("project_id", project.id)
      .order("created_at", { ascending: true });
    return {
      id: project.id,
      slug: project.slug,
      name: project.name,
      createdAt: project.created_at,
      collections: (cols ?? []).map((c) => toCollectionDTO(c as CollectionRow)),
    };
  });

export const createCollection = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        projectSlug: z.string().min(1),
        name: z.string().trim().min(1).max(100),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<CollectionDTO> => {
    const { data: project, error: pe } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("slug", data.projectSlug)
      .maybeSingle();
    if (pe) throw new Error(pe.message);
    if (!project) throw new Error("Project not found");

    const base = slugify(data.name);
    let slug = base;
    for (let i = 2; i < 50; i++) {
      const { data: existing } = await supabaseAdmin
        .from("collections")
        .select("id")
        .eq("project_id", project.id)
        .eq("slug", slug)
        .maybeSingle();
      if (!existing) break;
      slug = `${base}-${i}`;
    }
    const { data: row, error } = await supabaseAdmin
      .from("collections")
      .insert({ project_id: project.id, name: data.name, slug })
      .select(COLLECTION_SELECT)
      .single();
    if (error) throw new Error(error.message);
    return toCollectionDTO(row as CollectionRow);
  });

export const deleteCollection = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ projectSlug: z.string().min(1), collectionSlug: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { data: project } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("slug", data.projectSlug)
      .maybeSingle();
    if (!project) return { ok: true };
    await supabaseAdmin
      .from("collections")
      .delete()
      .eq("project_id", project.id)
      .eq("slug", data.collectionSlug);
    // best-effort cleanup of files
    await supabaseAdmin.storage
      .from("specs")
      .remove([
        `${data.projectSlug}/${data.collectionSlug}/openapi.json`,
        `${data.projectSlug}/${data.collectionSlug}/openapi.yaml`,
      ]);
    return { ok: true };
  });

async function resolveCollection(projectSlug: string, collectionSlug: string) {
  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("id, slug, name, created_at")
    .eq("slug", projectSlug)
    .maybeSingle();
  if (!project) throw new Error("Project not found");
  const { data: collection } = await supabaseAdmin
    .from("collections")
    .select(COLLECTION_SELECT)
    .eq("project_id", project.id)
    .eq("slug", collectionSlug)
    .maybeSingle();
  if (!collection) throw new Error("Collection not found");
  return { project, collection: collection as CollectionRow };
}

export const getCollection = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z.object({ projectSlug: z.string().min(1), collectionSlug: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data }): Promise<CollectionDetailDTO | null> => {
    const { data: project } = await supabaseAdmin
      .from("projects")
      .select("id, slug, name, created_at")
      .eq("slug", data.projectSlug)
      .maybeSingle();
    if (!project) return null;
    const { data: collection } = await supabaseAdmin
      .from("collections")
      .select(COLLECTION_SELECT)
      .eq("project_id", project.id)
      .eq("slug", data.collectionSlug)
      .maybeSingle();
    if (!collection) return null;
    const { data: history } = await supabaseAdmin
      .from("sync_history")
      .select("id, at, status, source, endpoints, size_bytes, message")
      .eq("collection_id", collection.id)
      .order("at", { ascending: false })
      .limit(30);
    const collectionDto = toCollectionDTO(collection as CollectionRow);
    collectionDto.specServersCount = await getStoredSpecServersCount({
      projectSlug: project.slug,
      collectionSlug: collectionDto.slug,
      fmt: collectionDto.exportFormat,
      hasSpec: collectionDto.lastSyncStatus === "success",
    });

    return {
      project: {
        id: project.id,
        slug: project.slug,
        name: project.name,
        createdAt: project.created_at,
      },
      collection: collectionDto,
      history: (history ?? []).map((h) => ({
        id: h.id,
        at: h.at,
        status: h.status as SyncStatus,
        source: h.source as SyncSource,
        endpoints: h.endpoints,
        sizeBytes: Number(h.size_bytes),
        message: h.message,
      })),
    };
  });

export const updateCollectionSettings = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        projectSlug: z.string().min(1),
        collectionSlug: z.string().min(1),
        apidogSourceProjectId: z.string().trim().max(50).optional().nullable(),
        apidogSourceModuleId: z.number().int().positive().optional().nullable(),
        apidogSourceToken: z.string().max(500).optional().nullable(),
        apidogPublishProjectId: z.string().trim().max(50).optional().nullable(),
        apidogPublishToken: z.string().max(500).optional().nullable(),
        oasVersion: z.enum(["3.1", "3.0", "2.0"]),
        exportFormat: z.enum(["json", "yaml"]),
        apidogEndpointOverwriteBehavior: z.enum([
          "OVERWRITE_EXISTING",
          "AUTO_MERGE",
          "KEEP_EXISTING",
          "CREATE_NEW",
        ]),
        apidogSchemaOverwriteBehavior: z.enum([
          "OVERWRITE_EXISTING",
          "AUTO_MERGE",
          "KEEP_EXISTING",
          "CREATE_NEW",
        ]),
        apidogUpdateFolderOfChangedEndpoint: z.boolean(),
        apidogDeleteUnmatchedResources: z.boolean(),
        apidogTargetEndpointFolderId: z.number().int().positive().optional().nullable(),
        apidogTargetSchemaFolderId: z.number().int().positive().optional().nullable(),
        apidogModuleId: z.number().int().positive().optional().nullable(),
        apidogSyncMarkdowns: z.boolean(),
        apidogSyncEnvironments: z.boolean(),
        apidogEnvironmentIds: z.array(z.number().int().positive()).max(100),
        apidogServerUrls: z.array(z.string().trim().min(1).max(500)).max(100),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<CollectionDTO> => {
    const { collection } = await resolveCollection(data.projectSlug, data.collectionSlug);
    const patch: {
      apidog_source_project_id: string | null;
      apidog_source_module_id: number | null;
      apidog_publish_project_id: string | null;
      apidog_project_id: string | null;
      oas_version: OasVersion;
      export_format: ExportFormat;
      apidog_endpoint_overwrite_behavior: ApidogOverwriteBehavior;
      apidog_schema_overwrite_behavior: ApidogOverwriteBehavior;
      apidog_update_folder_of_changed_endpoint: boolean;
      apidog_delete_unmatched_resources: boolean;
      apidog_target_endpoint_folder_id: number | null;
      apidog_target_schema_folder_id: number | null;
      apidog_module_id: number | null;
      apidog_sync_markdowns: boolean;
      apidog_sync_environments: boolean;
      apidog_environment_ids: number[];
      apidog_server_urls: string[];
      apidog_source_token?: string | null;
      apidog_publish_token?: string | null;
      apidog_token?: string | null;
    } = {
      apidog_source_project_id: data.apidogSourceProjectId?.trim() || null,
      apidog_source_module_id: data.apidogSourceModuleId ?? null,
      apidog_publish_project_id: data.apidogPublishProjectId?.trim() || null,
      apidog_project_id:
        data.apidogSourceProjectId?.trim() || data.apidogPublishProjectId?.trim() || null,
      oas_version: data.oasVersion,
      export_format: data.exportFormat,
      apidog_endpoint_overwrite_behavior: data.apidogEndpointOverwriteBehavior,
      apidog_schema_overwrite_behavior: data.apidogSchemaOverwriteBehavior,
      apidog_update_folder_of_changed_endpoint: data.apidogUpdateFolderOfChangedEndpoint,
      apidog_delete_unmatched_resources: data.apidogDeleteUnmatchedResources,
      apidog_target_endpoint_folder_id: data.apidogTargetEndpointFolderId ?? null,
      apidog_target_schema_folder_id: data.apidogTargetSchemaFolderId ?? null,
      apidog_module_id: data.apidogModuleId ?? null,
      apidog_sync_markdowns: data.apidogSyncMarkdowns,
      apidog_sync_environments: data.apidogSyncEnvironments,
      apidog_environment_ids: data.apidogEnvironmentIds,
      apidog_server_urls: data.apidogServerUrls,
    };
    if (data.apidogSourceToken === null) patch.apidog_source_token = null;
    else if (typeof data.apidogSourceToken === "string" && data.apidogSourceToken.length > 0)
      patch.apidog_source_token = data.apidogSourceToken.trim();
    if (data.apidogPublishToken === null) patch.apidog_publish_token = null;
    else if (typeof data.apidogPublishToken === "string" && data.apidogPublishToken.length > 0)
      patch.apidog_publish_token = data.apidogPublishToken.trim();
    patch.apidog_token =
      patch.apidog_source_token ??
      patch.apidog_publish_token ??
      collection.apidog_source_token ??
      collection.apidog_publish_token ??
      collection.apidog_token ??
      null;
    const { data: row, error } = await supabaseAdmin
      .from("collections")
      .update(patch as never)
      .eq("id", collection.id)
      .select(COLLECTION_SELECT)
      .single();
    if (error) throw new Error(error.message);
    return toCollectionDTO(row as CollectionRow);
  });

function countEndpoints(spec: unknown): number {
  if (!spec || typeof spec !== "object") return 0;
  const paths = (spec as { paths?: Record<string, unknown> }).paths;
  if (!paths || typeof paths !== "object") return 0;
  const methods = new Set(["get", "post", "put", "patch", "delete", "options", "head", "trace"]);
  let n = 0;
  for (const item of Object.values(paths)) {
    if (item && typeof item === "object") {
      for (const k of Object.keys(item)) if (methods.has(k.toLowerCase())) n += 1;
    }
  }
  return n;
}

function countServersInSpecText(specText: string, fmt: ExportFormat): number {
  if (fmt === "json") {
    try {
      const parsed = JSON.parse(specText) as { servers?: unknown };
      return Array.isArray(parsed.servers) ? parsed.servers.length : 0;
    } catch {
      return 0;
    }
  }

  if (/^\s*servers:\s*\[\s*\]\s*$/im.test(specText)) return 0;
  const match = specText.match(/^servers:\s*\n([\s\S]*?)(?=^[A-Za-z0-9_-]+:\s*|\s*$)/m);
  if (!match) return 0;
  return (match[1].match(/^\s*-\s+url\s*:/gm) ?? []).length;
}

function extractServersFromSpecText(specText: string, fmt: ExportFormat): ApidogServerDTO[] {
  if (fmt !== "json") return [];
  try {
    const parsed = JSON.parse(specText) as { servers?: unknown };
    return normalizeApidogServers(parsed.servers);
  } catch {
    return [];
  }
}

function selectServerUrlsAfterPull(
  servers: ApidogServerDTO[],
  existingSelection: string[] | null,
): string[] {
  const urls = servers.map((server) => server.url);
  if (urls.length === 0) return [];
  const existing = normalizeStringArray(existingSelection);
  const kept = existing.filter((url) => urls.includes(url));
  return kept.length > 0 ? kept : urls;
}

function filterSpecServersForPush(
  specText: string,
  fmt: ExportFormat,
  selectedUrls: string[],
  knownServers: ApidogServerDTO[],
): string {
  if (fmt !== "json") return specText;
  if (selectedUrls.length === 0) return specText;
  const selected = new Set(selectedUrls);
  try {
    const parsed = JSON.parse(specText) as Record<string, unknown>;
    const existing = normalizeApidogServers(parsed.servers);
    // Build the final servers array from existing spec servers (filtered) plus
    // any selected URL missing from the spec, hydrated from `knownServers`
    // (collection.apidog_servers — populated from pull or manually).
    const byUrl = new Map<string, ApidogServerDTO>();
    for (const server of existing) {
      if (selected.has(server.url)) byUrl.set(server.url, server);
    }
    const knownByUrl = new Map(knownServers.map((s) => [s.url, s]));
    for (const url of selectedUrls) {
      if (!byUrl.has(url)) {
        const known = knownByUrl.get(url);
        byUrl.set(url, {
          url,
          description: known?.description ?? null,
          variables: known?.variables ?? {},
        });
      }
    }
    parsed.servers = [...byUrl.values()].map((s) => ({
      url: s.url,
      ...(s.description ? { description: s.description } : {}),
      ...(Object.keys(s.variables).length > 0 ? { variables: toOpenApiServerVariables(s.variables) } : {}),
    }));
    return JSON.stringify(parsed);
  } catch {
    return specText;
  }
}

async function getStoredSpecServersCount({
  projectSlug,
  collectionSlug,
  fmt,
  hasSpec,
}: {
  projectSlug: string;
  collectionSlug: string;
  fmt: ExportFormat;
  hasSpec: boolean;
}): Promise<number | null> {
  if (!hasSpec) return null;
  const { data: file } = await supabaseAdmin.storage
    .from("specs")
    .download(storagePath(projectSlug, collectionSlug, fmt));
  if (!file) return null;
  return countServersInSpecText(await file.text(), fmt);
}

export const syncFromApidog = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ projectSlug: z.string().min(1), collectionSlug: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: true; entry: SyncEntryDTO }> => {
    const { collection } = await resolveCollection(data.projectSlug, data.collectionSlug);
    const sourceProjectId = collection.apidog_source_project_id ?? collection.apidog_project_id;
    const sourceModuleId = collection.apidog_source_module_id;
    const sourceToken = collection.apidog_source_token ?? collection.apidog_token;
    if (!sourceProjectId || !sourceToken) {
      throw new Error("Apidog not configured for this collection");
    }

    // mark in_progress
    await supabaseAdmin
      .from("collections")
      .update({ last_sync_status: "in_progress", last_sync_at: new Date().toISOString() })
      .eq("id", collection.id);

    const environmentExportData = await fetchEnvironmentExportDataFromApidog({
      projectId: sourceProjectId,
      token: sourceToken,
    });

    const exportParams = new URLSearchParams();
    if (sourceModuleId) exportParams.set("moduleId", String(sourceModuleId));
    const exportQuery = exportParams.toString();
    const url = `https://api.apidog.com/v1/projects/${encodeURIComponent(sourceProjectId)}/export-openapi${
      exportQuery ? `?${exportQuery}` : ""
    }`;

    let bodyText = "";
    let endpoints = 0;
    let errMsg: string | null = null;
    let ok = false;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sourceToken}`,
          "X-Apidog-Api-Version": "2024-03-28",
          "Content-Type": "application/json",
          Accept: collection.export_format === "yaml" ? "application/yaml" : "application/json",
        },
        body: JSON.stringify({
          scope: { type: "ALL" },
          oasVersion: collection.oas_version,
          exportFormat: collection.export_format === "yaml" ? "YAML" : "JSON",
          // Always send env ids when we have them — without this Apidog returns
          // an empty `servers` block. We pull every env on the source project
          // so the exported spec carries every base URL + variable set.
          ...(environmentExportData.ids.length > 0
            ? { environmentIds: environmentExportData.ids }
            : {}),
          options: {
            includeApidogExtensionProperties: true,
            includeFolders: true,
            includeServers: true,
            addFoldersToTags: true,
          },
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        errMsg = `Apidog ${res.status}: ${t.slice(0, 200)}`;
      } else {
        bodyText = await res.text();
        if (collection.export_format === "json") {
          bodyText = enrichSpecForApidogImport(bodyText);
        }
        if (collection.export_format === "json") {
          try {
            endpoints = countEndpoints(JSON.parse(bodyText));
          } catch {
            // not strictly JSON — still upload
          }
        } else {
          // crude YAML endpoint count: number of lines starting with "  /" then methods underneath
          endpoints = (bodyText.match(/^\s{2,4}(get|post|put|patch|delete|options|head):/gim) ?? [])
            .length;
        }
        ok = true;
      }
    } catch (e) {
      errMsg = e instanceof Error ? e.message : "Network error";
    }

    let sizeBytes = 0;
    if (ok) {
      const path = storagePath(data.projectSlug, data.collectionSlug, collection.export_format);
      const contentType =
        collection.export_format === "yaml" ? "application/yaml" : "application/json";
      const blob = new Blob([bodyText], { type: contentType });
      sizeBytes = blob.size;
      const { error: upErr } = await supabaseAdmin.storage
        .from("specs")
        .upload(path, blob, { upsert: true, contentType });
      if (upErr) {
        ok = false;
        errMsg = `Storage error: ${upErr.message}`;
      }
    }

    const entryStatus: SyncStatus = ok ? "success" : "error";
    const { data: histRow } = await supabaseAdmin
      .from("sync_history")
      .insert({
        collection_id: collection.id,
        status: entryStatus,
        source: "apidog",
        endpoints: ok ? endpoints : 0,
        size_bytes: ok ? sizeBytes : 0,
        message: errMsg,
      })
      .select("id, at, status, source, endpoints, size_bytes, message")
      .single();

    // Markdown pull: fetch markdown pages from Apidog and store them on the collection
    // so they show in the UI and can be re-pushed. Gated by apidog_sync_markdowns.
    let pulledMd: ManualMarkdown[] | null = null;
    if (ok && collection.apidog_sync_markdowns) {
      try {
        pulledMd = await pullMarkdownsFromApidog({
          projectId: sourceProjectId,
          moduleId: sourceModuleId,
          token: sourceToken,
        });
      } catch (e) {
        console.warn("[pull] markdowns failed", e);
      }
    }

    const pulledBundle = pulledMd
      ? await uploadMarkdownBundle({
          projectSlug: data.projectSlug,
          collectionSlug: data.collectionSlug,
          markdowns: pulledMd,
        })
      : null;

    const specServers = ok ? extractServersFromSpecText(bodyText, collection.export_format) : [];
    const pulledServers = mergeServers(specServers, ok ? environmentExportData.servers : []);
    // If neither the spec nor the env probe yielded servers, keep whatever the
    // user already had on the collection (manually entered or previously pulled).
    const previousServers = normalizeApidogServers(collection.apidog_servers);
    const effectiveServers = pulledServers.length > 0 ? pulledServers : previousServers;
    const selectedServerUrls = selectServerUrlsAfterPull(
      effectiveServers,
      collection.apidog_server_urls,
    );

    await supabaseAdmin
      .from("collections")
      .update({
        last_sync_status: entryStatus,
        last_sync_at: new Date().toISOString(),
        ...(ok
          ? {
              endpoints,
              size_bytes: sizeBytes,
              apidog_servers: effectiveServers,
              apidog_server_urls: selectedServerUrls,
            }
          : {}),
        ...(pulledMd
          ? {
              markdowns: pulledMd,
              bundle_md_uploaded_at: new Date().toISOString(),
              bundle_md_size_bytes: pulledBundle?.sizeBytes ?? 0,
            }
          : {}),
      })
      .eq("id", collection.id);

    if (!ok) throw new Error(errMsg ?? "Sync failed");

    return {
      ok: true,
      entry: {
        id: histRow!.id,
        at: histRow!.at,
        status: histRow!.status as SyncStatus,
        source: histRow!.source as SyncSource,
        endpoints: histRow!.endpoints,
        sizeBytes: Number(histRow!.size_bytes),
        message: histRow!.message,
      },
    };
  });

export const uploadSpec = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        projectSlug: z.string().min(1),
        collectionSlug: z.string().min(1),
        filename: z.string().min(1).max(200),
        // base64 contents
        contentBase64: z
          .string()
          .min(1)
          .max(20 * 1024 * 1024),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: true; entry: SyncEntryDTO }> => {
    const { collection } = await resolveCollection(data.projectSlug, data.collectionSlug);
    const bytes = Buffer.from(data.contentBase64, "base64");

    // ----- Markdown bundle branch (.md) -----
    // Apidog can export a collection as a single markdown document that
    // bundles endpoint docs + markdown pages. We don't parse it back into an
    // OpenAPI spec — we just publish it alongside the spec under a stable URL.
    if (/\.md$/i.test(data.filename)) {
      const bundleText = bytes.toString("utf-8");
      const parsedMarkdowns = parseMarkdownBundle(bundleText);
      const bundlePath = `${data.projectSlug}/${data.collectionSlug}/bundle.md`;
      const { error: upErr } = await supabaseAdmin.storage
        .from("specs")
        .upload(bundlePath, bytes, { upsert: true, contentType: "text/markdown" });
      if (upErr) throw new Error(upErr.message);

      const nowIso = new Date().toISOString();
      const { data: histRow } = await supabaseAdmin
        .from("sync_history")
        .insert({
          collection_id: collection.id,
          status: "success",
          source: "upload",
          endpoints: 0,
          size_bytes: bytes.byteLength,
          message: `Uploaded markdown bundle (${data.filename})`,
        })
        .select("id, at, status, source, endpoints, size_bytes, message")
        .single();

      await supabaseAdmin
        .from("collections")
        .update({
          bundle_md_uploaded_at: nowIso,
          bundle_md_size_bytes: bytes.byteLength,
          markdowns:
            parsedMarkdowns.length > 0 ? parsedMarkdowns : normalizeMarkdowns(collection.markdowns),
        })
        .eq("id", collection.id);

      return {
        ok: true,
        entry: {
          id: histRow!.id,
          at: histRow!.at,
          status: "success",
          source: "upload",
          endpoints: 0,
          sizeBytes: Number(histRow!.size_bytes),
          message: histRow!.message,
        },
      };
    }

    // ----- OpenAPI spec branch (.json / .yaml / .yml) -----
    const ext = /\.(ya?ml)$/i.test(data.filename) ? "yaml" : "json";
    const text = bytes.toString("utf-8");
    let endpoints = 0;
    if (ext === "json") {
      try {
        endpoints = countEndpoints(JSON.parse(text));
      } catch {
        throw new Error("Uploaded file is not valid JSON");
      }
    } else {
      endpoints = (text.match(/^\s{2,4}(get|post|put|patch|delete|options|head):/gim) ?? []).length;
    }

    const fmt: ExportFormat = ext === "yaml" ? "yaml" : "json";
    const path = storagePath(data.projectSlug, data.collectionSlug, fmt);
    const contentType = fmt === "yaml" ? "application/yaml" : "application/json";

    const { error: upErr } = await supabaseAdmin.storage
      .from("specs")
      .upload(path, bytes, { upsert: true, contentType });
    if (upErr) throw new Error(upErr.message);

    const { data: histRow } = await supabaseAdmin
      .from("sync_history")
      .insert({
        collection_id: collection.id,
        status: "success",
        source: "upload",
        endpoints,
        size_bytes: bytes.byteLength,
        message: null,
      })
      .select("id, at, status, source, endpoints, size_bytes, message")
      .single();

    await supabaseAdmin
      .from("collections")
      .update({
        last_sync_status: "success",
        last_sync_at: new Date().toISOString(),
        endpoints,
        size_bytes: bytes.byteLength,
        export_format: fmt,
      })
      .eq("id", collection.id);

    return {
      ok: true,
      entry: {
        id: histRow!.id,
        at: histRow!.at,
        status: "success",
        source: "upload",
        endpoints: histRow!.endpoints,
        sizeBytes: Number(histRow!.size_bytes),
        message: null,
      },
    };
  });

export const pushToApidog = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        projectSlug: z.string().min(1),
        collectionSlug: z.string().min(1),
        // Optional override of the public spec URL (used during local dev where
        // the server-derived host may not be reachable from Apidog). Production
        // can ignore this and trust the server's host.
        publicUrl: z.string().url().optional(),
      })
      .parse(d),
  )
  .handler(
    async ({
      data,
    }): Promise<{
      ok: true;
      endpoints: number;
      counters: Record<string, number>;
      warnings: string[];
    }> => {
      const { collection } = await resolveCollection(data.projectSlug, data.collectionSlug);
      const publishProjectId = collection.apidog_publish_project_id ?? collection.apidog_project_id;
      const publishToken = collection.apidog_publish_token ?? collection.apidog_token;
      if (!publishProjectId || !publishToken) {
        throw new Error("Apidog not configured for this collection");
      }
      if (!collection.last_sync_at || collection.last_sync_status !== "success") {
        throw new Error("No spec to push yet. Sync from Apidog or upload a file first.");
      }

      // Read spec directly from storage and send the raw text as `input`
      // (Apidog "String Method"). This avoids preview-domain reachability issues.
      const path = storagePath(data.projectSlug, data.collectionSlug, collection.export_format);
      const { data: file, error: dlErr } = await supabaseAdmin.storage.from("specs").download(path);
      if (dlErr || !file) {
        throw new Error(`Spec file not found: ${dlErr?.message ?? "missing"}`);
      }
      const specText = await file.text();
      const selectedServerUrls = collection.apidog_sync_environments
        ? normalizeStringArray(collection.apidog_server_urls)
        : [];
      const knownServers = normalizeApidogServers(collection.apidog_servers);
      const specTextForPush = enrichSpecForApidogImport(
        filterSpecServersForPush(
          specText,
          collection.export_format,
          selectedServerUrls,
          knownServers,
        ),
      );

      let endpoints = 0;
      try {
        endpoints = countEndpoints(JSON.parse(specTextForPush));
      } catch {
        endpoints = (
          specTextForPush.match(/^\s{2,4}(get|post|put|patch|delete|options|head):/gim) ?? []
        ).length;
      }

      const importUrl = `https://api.apidog.com/v1/projects/${encodeURIComponent(
        publishProjectId,
      )}/import-openapi?locale=en-US`;

      const res = await fetch(importUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publishToken}`,
          "X-Apidog-Api-Version": "2024-03-28",
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          input: specTextForPush,
          options: {
            endpointOverwriteBehavior: collection.apidog_endpoint_overwrite_behavior,
            schemaOverwriteBehavior: collection.apidog_schema_overwrite_behavior,
            prependBasePath: false,
            updateFolderOfChangedEndpoint: collection.apidog_update_folder_of_changed_endpoint,
            deleteUnmatchedResources: collection.apidog_delete_unmatched_resources,
            ...(collection.apidog_target_endpoint_folder_id
              ? { endpointFolderId: collection.apidog_target_endpoint_folder_id }
              : {}),
            ...(collection.apidog_target_schema_folder_id
              ? { targetSchemaFolderId: collection.apidog_target_schema_folder_id }
              : {}),
            ...(collection.apidog_module_id ? { moduleId: collection.apidog_module_id } : {}),
          },
        }),
      });

      const responseText = await res.text();
      console.log(`[push] Apidog status=${res.status} body=${responseText.slice(0, 500)}`);

      if (!res.ok) {
        await supabaseAdmin.from("sync_history").insert({
          collection_id: collection.id,
          status: "error",
          source: "manual",
          endpoints: 0,
          size_bytes: 0,
          message: `Push failed — Apidog ${res.status}: ${responseText.slice(0, 240)}`,
        });
        throw new Error(`Apidog ${res.status}: ${responseText.slice(0, 240)}`);
      }

      // Parse Apidog's response — a 200 can still mean "nothing imported"
      // if the spec failed validation. Surface counters & errors clearly.
      let counters: Record<string, number> = {};
      let errorsArr: Array<{ message?: string; name?: string }> = [];
      try {
        const parsed = JSON.parse(responseText) as {
          data?: {
            counters?: Record<string, number>;
            errors?: Array<{ message?: string; name?: string }>;
          };
        };
        counters = parsed.data?.counters ?? {};
        errorsArr = parsed.data?.errors ?? [];
      } catch {
        // non-JSON success body — treat as success but with no counters
      }

      const created = (counters.endpointCreated ?? 0) + (counters.endpointUpdated ?? 0);
      const schemaTouched = (counters.schemaCreated ?? 0) + (counters.schemaUpdated ?? 0);
      const failed = (counters.endpointFailed ?? 0) + (counters.schemaFailed ?? 0);

      const warnings = errorsArr.map((e) => e.message || e.name).filter((s): s is string => !!s);

      // If Apidog accepted the request but didn't actually create/update anything,
      // surface that as a failure so the user knows nothing changed in their project.
      if (created === 0 && schemaTouched === 0) {
        const msg =
          warnings.length > 0
            ? `Apidog rejected the spec: ${warnings.slice(0, 3).join("; ")}`
            : failed > 0
              ? `Apidog reported ${failed} failed item(s) and nothing was imported.`
              : `Apidog accepted the request but didn't import anything. Response: ${responseText.slice(0, 200)}`;
        await supabaseAdmin.from("sync_history").insert({
          collection_id: collection.id,
          status: "error",
          source: "manual",
          endpoints: 0,
          size_bytes: 0,
          message: msg.slice(0, 500),
        });
        throw new Error(msg);
      }

      const counterSummary = Object.entries(counters)
        .filter(([, v]) => Number(v) > 0)
        .map(([k, v]) => `${k}:${v}`)
        .join(", ");

      // ----- Markdown sync -----
      // Apidog's import-openapi does NOT touch markdown documents. We sync them
      // separately via the Markdowns endpoints. Gated by the per-collection
      // "Sync markdown pages" setting. Sources:
      //  - manual list saved on the collection (collection.markdowns)
      //  - `x-apidog-markdowns` arrays inside the spec (top-level or info)
      let mdResult = { created: 0, updated: 0, failed: 0, warnings: [] as string[] };
      let combinedCount = 0;
      if (collection.apidog_sync_markdowns) {
        const specMarkdowns = extractMarkdownsFromSpec(specTextForPush);
        const manualMarkdowns = normalizeMarkdowns(collection.markdowns);
        const combined = mergeMarkdowns([...specMarkdowns, ...manualMarkdowns]);
        combinedCount = combined.length;
        if (combined.length > 0) {
          mdResult = await syncMarkdownsToApidog({
            projectId: publishProjectId,
            token: publishToken,
            items: combined,
          });
          counters.markdownCreated = mdResult.created;
          counters.markdownUpdated = mdResult.updated;
          counters.markdownFailed = mdResult.failed;
          warnings.push(...mdResult.warnings);
        }
      }

      const mdSummary = collection.apidog_sync_markdowns
        ? combinedCount
          ? ` · md=${mdResult.created}c/${mdResult.updated}u${mdResult.failed ? `/${mdResult.failed}f` : ""}`
          : " · md=none"
        : " · md=skipped";
      const envSummary = collection.apidog_sync_environments
        ? ` · servers=${selectedServerUrls.length}`
        : " · env=skipped";

      await supabaseAdmin.from("sync_history").insert({
        collection_id: collection.id,
        status: "success",
        source: "manual",
        endpoints: created,
        size_bytes: 0,
        message: `Pushed to Apidog #${publishProjectId} — ${counterSummary || "no changes"}${mdSummary}${envSummary} · endpoint=${collection.apidog_endpoint_overwrite_behavior} schema=${collection.apidog_schema_overwrite_behavior}`,
      });

      return { ok: true, endpoints: created || endpoints, counters, warnings };
    },
  );

// ============= Markdown helpers =============

function extractMarkdownsFromSpec(specText: string): ManualMarkdown[] {
  try {
    const parsed = JSON.parse(specText) as Record<string, unknown>;
    const fromTop = normalizeMarkdowns(parsed["x-apidog-markdowns"]);
    const info = parsed.info as Record<string, unknown> | undefined;
    const fromInfo = info ? normalizeMarkdowns(info["x-apidog-markdowns"]) : [];
    return [...fromTop, ...fromInfo];
  } catch {
    // YAML or invalid JSON — fall back to a coarse regex extraction of the
    // `x-apidog-markdowns` block. Skip silently if nothing structured.
    return [];
  }
}

function mergeMarkdowns(items: ManualMarkdown[]): ManualMarkdown[] {
  // Last entry with a given name wins, preserving manual overrides.
  const map = new Map<string, ManualMarkdown>();
  for (const it of items) map.set(it.name, it);
  return [...map.values()];
}

function parseMarkdownBundle(bundleText: string): ManualMarkdown[] {
  const normalized = bundleText.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const items: ManualMarkdown[] = [];
  let currentTitle = "";
  let currentLines: string[] = [];

  const flush = () => {
    const content = currentLines.join("\n").trim();
    if (!currentTitle || !content) {
      currentTitle = "";
      currentLines = [];
      return;
    }
    items.push({ name: currentTitle, content, folderId: null });
    currentTitle = "";
    currentLines = [];
  };

  for (const line of lines) {
    const heading = line.match(/^#\s+(.+?)\s*$/);
    if (heading) {
      flush();
      currentTitle = heading[1].trim();
      currentLines = [line];
      continue;
    }
    if (currentTitle) currentLines.push(line);
  }
  flush();

  return mergeMarkdowns(items);
}

function renderMarkdownBundle(items: ManualMarkdown[]): string {
  return mergeMarkdowns(items)
    .map((item) => item.content.trim())
    .filter(Boolean)
    .join("\n\n");
}

function enrichSpecForApidogImport(specText: string): string {
  try {
    const parsed = JSON.parse(specText) as Record<string, unknown>;
    normalizeSecurityForApidogImport(parsed);
    const paths = parsed.paths;
    if (paths && typeof paths === "object") {
      const methods = new Set([
        "get",
        "post",
        "put",
        "patch",
        "delete",
        "options",
        "head",
        "trace",
      ]);
      for (const pathItem of Object.values(paths as Record<string, unknown>)) {
        if (!pathItem || typeof pathItem !== "object") continue;
        for (const [method, op] of Object.entries(pathItem as Record<string, unknown>)) {
          if (!methods.has(method.toLowerCase()) || !op || typeof op !== "object") continue;
          const record = op as Record<string, unknown>;
          const folder =
            typeof record["x-apidog-folder"] === "string" ? record["x-apidog-folder"].trim() : "";
          if (folder) {
            const tags = Array.isArray(record.tags) ? [...record.tags] : [];
            if (!tags.some((tag) => typeof tag === "string" && tag.trim() === folder)) {
              record.tags = [folder, ...tags.filter((tag) => typeof tag === "string")];
            }
          } else if (Array.isArray(record.tags) && record.tags.length > 0) {
            const firstTag = record.tags.find(
              (tag) => typeof tag === "string" && tag.trim().length > 0,
            );
            if (typeof firstTag === "string") record["x-apidog-folder"] = firstTag.trim();
          }
        }
      }
    }
    return JSON.stringify(applyOrderNormalization(parsed));
  } catch {
    return specText;
  }
}

function normalizeSecurityForApidogImport(parsed: Record<string, unknown>) {
  // Non-destructive. Apidog's export-openapi often inlines inherited auth into
  // `x-apidog.use.configs.{schemeName}` on each operation but omits the matching
  // entries from `components.securitySchemes`. On import that auth is lost. We
  // materialize the missing schemes and ensure each operation declares them in
  // `security` so Apidog re-attaches the auth to every endpoint. Existing
  // `security` entries are preserved.
  const components =
    parsed.components && typeof parsed.components === "object" && !Array.isArray(parsed.components)
      ? (parsed.components as Record<string, unknown>)
      : ((parsed.components = {}) as Record<string, unknown>);
  const securitySchemes =
    components.securitySchemes &&
    typeof components.securitySchemes === "object" &&
    !Array.isArray(components.securitySchemes)
      ? (components.securitySchemes as Record<string, unknown>)
      : ((components.securitySchemes = {}) as Record<string, unknown>);

  const inferScheme = (key: string, config: unknown): Record<string, unknown> => {
    const c =
      config && typeof config === "object" && !Array.isArray(config)
        ? (config as Record<string, unknown>)
        : {};
    const type = typeof c.type === "string" ? (c.type as string).toLowerCase() : "";
    const inName = typeof c.in === "string" ? (c.in as string).toLowerCase() : "header";
    const name = typeof c.name === "string" ? (c.name as string) : "Authorization";
    if (type === "bearer" || /bearer/i.test(key)) return { type: "http", scheme: "bearer" };
    if (type === "basic" || /basic/i.test(key)) return { type: "http", scheme: "basic" };
    if (type === "oauth2" || /oauth/i.test(key)) return { type: "oauth2", flows: {} };
    if (type === "openidconnect" || /openid/i.test(key))
      return { type: "openIdConnect", openIdConnectUrl: "" };
    return { type: "apiKey", in: inName, name };
  };

  const ensureScheme = (schemeName: string, config: unknown) => {
    if (!schemeName) return;
    if (!(schemeName in securitySchemes)) {
      securitySchemes[schemeName] = inferScheme(schemeName, config);
    }
  };

  const visit = (operation: Record<string, unknown>) => {
    const apidog = operation["x-apidog"];
    const use =
      apidog && typeof apidog === "object" && !Array.isArray(apidog)
        ? (apidog as Record<string, unknown>).use
        : null;
    const configs =
      use && typeof use === "object" && !Array.isArray(use)
        ? (use as Record<string, unknown>).configs
        : null;
    if (!configs || typeof configs !== "object" || Array.isArray(configs)) return;
    const security = Array.isArray(operation.security)
      ? [...(operation.security as Record<string, unknown>[])]
      : [];
    for (const [key, cfg] of Object.entries(configs as Record<string, unknown>)) {
      ensureScheme(key, cfg);
      const already = security.some(
        (req) => req && typeof req === "object" && !Array.isArray(req) && key in req,
      );
      if (!already) security.push({ [key]: [] });
    }
    if (security.length > 0) operation.security = security;
  };

  const paths = parsed.paths;
  if (!paths || typeof paths !== "object" || Array.isArray(paths)) return;
  const methods = new Set(["get", "post", "put", "patch", "delete", "options", "head", "trace"]);
  let anyOpHasSecurity = false;
  for (const pathItem of Object.values(paths as Record<string, unknown>)) {
    if (!pathItem || typeof pathItem !== "object" || Array.isArray(pathItem)) continue;
    for (const [method, op] of Object.entries(pathItem as Record<string, unknown>)) {
      if (
        !methods.has(method.toLowerCase()) ||
        !op ||
        typeof op !== "object" ||
        Array.isArray(op)
      ) {
        continue;
      }
      visit(op as Record<string, unknown>);
      const rec = op as Record<string, unknown>;
      if (Array.isArray(rec.security) && rec.security.length > 0) anyOpHasSecurity = true;
    }
  }

  // Apidog source exports often inherit auth at the project level: `securitySchemes`
  // is defined but neither top-level `security` nor per-op `security` is set.
  // On re-import every endpoint then shows "No Auth". Materialize a top-level
  // `security` that requires ALL defined schemes so Apidog applies them by default.
  const schemeNames = Object.keys(securitySchemes);
  const topSecurity = Array.isArray(parsed.security)
    ? (parsed.security as unknown[])
    : [];
  if (
    schemeNames.length > 0 &&
    !anyOpHasSecurity &&
    topSecurity.length === 0
  ) {
    const requireAll: Record<string, string[]> = {};
    for (const name of schemeNames) requireAll[name] = [];
    parsed.security = [requireAll];
  }
}

/**
 * Reorders top-level `tags` and `paths` so the published spec mirrors the source order.
 * Priority: x-apidog-orders (Apidog's manual sort metadata) → first-occurrence in paths.
 */
function applyOrderNormalization(parsed: Record<string, unknown>): Record<string, unknown> {
  const paths = parsed.paths as Record<string, unknown> | undefined;
  if (!paths || typeof paths !== "object") return parsed;
  const methods = new Set(["get", "post", "put", "patch", "delete", "options", "head", "trace"]);

  const orders = parsed["x-apidog-orders"] as
    | { tagOrders?: string[]; folderOrders?: string[]; pathOrders?: string[] }
    | undefined;
  const explicitTagOrder: string[] =
    (Array.isArray(orders?.tagOrders) ? orders!.tagOrders : null) ??
    (Array.isArray(orders?.folderOrders) ? orders!.folderOrders : null) ??
    [];
  const explicitPathOrder: string[] = Array.isArray(orders?.pathOrders) ? orders!.pathOrders! : [];

  const seenTags: string[] = [];
  const pathToTag = new Map<string, string>();
  for (const [pathKey, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== "object") continue;
    for (const [method, op] of Object.entries(pathItem as Record<string, unknown>)) {
      if (!methods.has(method.toLowerCase()) || !op || typeof op !== "object") continue;
      const rec = op as Record<string, unknown>;
      const folder =
        (typeof rec["x-apidog-folder"] === "string" && rec["x-apidog-folder"].trim()) ||
        (Array.isArray(rec.tags) && typeof rec.tags[0] === "string" ? rec.tags[0].trim() : "");
      if (folder) {
        pathToTag.set(pathKey, folder);
        if (!seenTags.includes(folder)) seenTags.push(folder);
        break;
      }
    }
  }
  const tagOrder = [...new Set([...explicitTagOrder, ...seenTags])];

  const pathKeys = Object.keys(paths);
  const orderedKeys: string[] = [];
  const used = new Set<string>();
  const pushKey = (k: string) => {
    if (!used.has(k) && k in paths) {
      orderedKeys.push(k);
      used.add(k);
    }
  };
  for (const k of explicitPathOrder) pushKey(k);
  for (const tag of tagOrder) {
    for (const k of pathKeys) if (pathToTag.get(k) === tag) pushKey(k);
  }
  for (const k of pathKeys) pushKey(k);

  const orderedPaths: Record<string, unknown> = {};
  for (const k of orderedKeys) orderedPaths[k] = paths[k];
  parsed.paths = orderedPaths;

  if (tagOrder.length > 0) {
    const existing = Array.isArray(parsed.tags)
      ? (parsed.tags as Array<Record<string, unknown>>)
      : [];
    const byName = new Map<string, Record<string, unknown>>();
    for (const t of existing) {
      if (t && typeof t === "object" && typeof t.name === "string") byName.set(t.name, t);
    }
    const newTags: Array<Record<string, unknown>> = [];
    for (const name of tagOrder) newTags.push(byName.get(name) ?? { name });
    for (const t of existing) {
      if (t && typeof t === "object" && typeof t.name === "string" && !tagOrder.includes(t.name)) {
        newTags.push(t);
      }
    }
    parsed.tags = newTags;
  }

  return parsed;
}

async function uploadMarkdownBundle({
  projectSlug,
  collectionSlug,
  markdowns,
}: {
  projectSlug: string;
  collectionSlug: string;
  markdowns: ManualMarkdown[];
}) {
  const bundleText = renderMarkdownBundle(markdowns);
  const bundlePath = `${projectSlug}/${collectionSlug}/bundle.md`;
  const bytes = Buffer.from(bundleText, "utf-8");
  const { error } = await supabaseAdmin.storage
    .from("specs")
    .upload(bundlePath, bytes, { upsert: true, contentType: "text/markdown" });
  if (error) throw new Error(error.message);
  return { sizeBytes: bytes.byteLength };
}

type ApidogMarkdownRow = { id: number; name: string; folderId?: number };

async function syncMarkdownsToApidog({
  projectId,
  token,
  items,
}: {
  projectId: string;
  token: string;
  items: ManualMarkdown[];
}): Promise<{ created: number; updated: number; failed: number; warnings: string[] }> {
  const base = `https://api.apidog.com/v1/projects/${encodeURIComponent(projectId)}/markdowns`;
  const headers = {
    Authorization: `Bearer ${token}`,
    "X-Apidog-Api-Version": "2024-03-28",
  };

  // 1. Load existing markdowns to decide create vs update.
  const existingByName = new Map<string, ApidogMarkdownRow>();
  try {
    const listRes = await fetch(base, { method: "GET", headers });
    if (listRes.ok) {
      const body = (await listRes.json().catch(() => ({}))) as {
        data?: ApidogMarkdownRow[];
      };
      for (const row of body.data ?? []) {
        if (row && typeof row.name === "string") existingByName.set(row.name, row);
      }
    }
  } catch (e) {
    console.warn("[push] failed to list markdowns", e);
  }

  let created = 0;
  let updated = 0;
  let failed = 0;
  const warnings: string[] = [];

  for (const item of items) {
    const existing = existingByName.get(item.name);
    const form = new URLSearchParams();
    form.set("name", item.name);
    form.set("content", item.content);
    if (item.folderId) form.set("folderId", String(item.folderId));
    else if (existing?.folderId) form.set("folderId", String(existing.folderId));
    else form.set("folderId", "0");

    const url = existing ? `${base}/${existing.id}` : base;
    const method = existing ? "PUT" : "POST";
    try {
      const res = await fetch(url, {
        method,
        headers: {
          ...headers,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      });
      if (!res.ok) {
        failed += 1;
        const txt = (await res.text().catch(() => "")).slice(0, 160);
        warnings.push(`markdown "${item.name}" — Apidog ${res.status}: ${txt}`);
        continue;
      }
      if (existing) updated += 1;
      else created += 1;
    } catch (e) {
      failed += 1;
      warnings.push(
        `markdown "${item.name}" — ${e instanceof Error ? e.message : "network error"}`,
      );
    }
  }
  return { created, updated, failed, warnings };
}

async function pullMarkdownsFromApidog({
  projectId,
  moduleId,
  token,
}: {
  projectId: string;
  moduleId?: number | null;
  token: string;
}): Promise<ManualMarkdown[]> {
  const base = `https://api.apidog.com/v1/projects/${encodeURIComponent(projectId)}/markdowns`;
  const globalMarkdownBase = "https://api.apidog.com/v1/markdowns";
  const headers = {
    Authorization: `Bearer ${token}`,
    "X-Apidog-Api-Version": "2024-03-28",
  };
  const listUrl = new URL(base);
  if (moduleId) listUrl.searchParams.set("moduleId", String(moduleId));
  const listRes = await fetch(listUrl, { method: "GET", headers });
  if (!listRes.ok) return [];
  const body = (await listRes.json().catch(() => ({}))) as {
    data?: Array<{ id: number; name: string; folderId?: number; content?: string }>;
  };
  const rows = body.data ?? [];
  const out: ManualMarkdown[] = [];
  for (const row of rows.slice(0, 100)) {
    if (!row || typeof row.name !== "string") continue;
    let content = typeof row.content === "string" ? row.content : "";
    if (!content && typeof row.id === "number") {
      try {
        const detailUrl = new URL(`${globalMarkdownBase}/${row.id}`);
        if (moduleId) detailUrl.searchParams.set("moduleId", String(moduleId));
        const detailRes = await fetch(detailUrl, { method: "GET", headers });
        if (detailRes.ok) {
          const detail = (await detailRes.json().catch(() => ({}))) as {
            data?: { content?: string };
          };
          content = detail.data?.content ?? "";
        }
      } catch {
        // ignore, keep empty content
      }
    }
    out.push({
      name: row.name,
      content,
      folderId: typeof row.folderId === "number" && row.folderId > 0 ? row.folderId : null,
    });
  }
  return out;
}

// ============= Manual markdown editor =============

export const updateCollectionMarkdowns = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        projectSlug: z.string().min(1),
        collectionSlug: z.string().min(1),
        markdowns: z
          .array(
            z.object({
              name: z.string().trim().min(1).max(200),
              content: z.string().max(200_000),
              folderId: z.number().int().positive().optional().nullable(),
            }),
          )
          .max(200),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<CollectionDTO> => {
    const { collection } = await resolveCollection(data.projectSlug, data.collectionSlug);
    const cleaned = mergeMarkdowns(
      data.markdowns.map((m) => ({
        name: m.name,
        content: m.content,
        folderId: m.folderId ?? null,
      })),
    );
    const bundle = cleaned.length
      ? await uploadMarkdownBundle({
          projectSlug: data.projectSlug,
          collectionSlug: data.collectionSlug,
          markdowns: cleaned,
        })
      : null;
    const { data: row, error } = await supabaseAdmin
      .from("collections")
      .update({
        markdowns: cleaned,
        ...(bundle
          ? {
              bundle_md_uploaded_at: new Date().toISOString(),
              bundle_md_size_bytes: bundle.sizeBytes,
            }
          : {}),
      })
      .eq("id", collection.id)
      .select(COLLECTION_SELECT)
      .single();
    if (error) throw new Error(error.message);
    return toCollectionDTO(row as CollectionRow);
  });
