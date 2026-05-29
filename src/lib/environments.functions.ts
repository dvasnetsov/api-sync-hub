import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertProjectAccess, getUserContext } from "@/lib/access.server";

export type EnvSource = "apidog" | "uploaded" | "manual";

export type EnvironmentDTO = {
  id: string;
  name: string;
  source: EnvSource;
  apidogEnvId: number | null;
  baseUrl: string | null;
  variables: Record<string, string>;
  postmanEnvUid: string | null;
  updatedAt: string;
};

async function resolveCollectionForUser(
  projectSlug: string,
  collectionSlug: string,
  userId: string,
) {
  const ctx = await getUserContext(userId);
  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("id, slug")
    .eq("slug", projectSlug)
    .maybeSingle();
  if (!project) throw new Error("Project not found");
  await assertProjectAccess(ctx, project.id);
  const { data: collection } = await supabaseAdmin
    .from("collections")
    .select("id, slug, postman_api_key, postman_workspace_id")
    .eq("project_id", project.id)
    .eq("slug", collectionSlug)
    .maybeSingle();
  if (!collection) throw new Error("Collection not found");
  return { project, collection };
}

function normalizeVarMap(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!k) continue;
    if (v == null) {
      out[k] = "";
    } else if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      out[k] = String(v);
    } else {
      out[k] = JSON.stringify(v);
    }
  }
  return out;
}

type EnvRow = {
  id: string;
  name: string;
  source: EnvSource;
  apidog_env_id: number | null;
  base_url: string | null;
  variables: unknown;
  postman_env_uid: string | null;
  updated_at: string;
};

function toDTO(row: EnvRow): EnvironmentDTO {
  return {
    id: row.id,
    name: row.name,
    source: row.source,
    apidogEnvId: row.apidog_env_id,
    baseUrl: row.base_url,
    variables: normalizeVarMap(row.variables),
    postmanEnvUid: row.postman_env_uid,
    updatedAt: row.updated_at,
  };
}

export const listEnvironments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ projectSlug: z.string().min(1), collectionSlug: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data, context }): Promise<EnvironmentDTO[]> => {
    const { collection } = await resolveCollectionForUser(
      data.projectSlug,
      data.collectionSlug,
      context.userId,
    );
    const { data: rows } = await supabaseAdmin
      .from("collection_environments")
      .select("id, name, source, apidog_env_id, base_url, variables, postman_env_uid, updated_at")
      .eq("collection_id", collection.id)
      .order("source", { ascending: true })
      .order("name", { ascending: true });
    return (rows ?? []).map((r) => toDTO(r as EnvRow));
  });

export const deleteEnvironment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        projectSlug: z.string().min(1),
        collectionSlug: z.string().min(1),
        id: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { collection } = await resolveCollectionForUser(
      data.projectSlug,
      data.collectionSlug,
      context.userId,
    );
    const { error } = await supabaseAdmin
      .from("collection_environments")
      .delete()
      .eq("collection_id", collection.id)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Upload Postman env JSON ----------

type PostmanEnvFile = {
  name?: string;
  values?: Array<{ key?: string; value?: string; enabled?: boolean; type?: string }>;
};

export const uploadEnvironmentFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        projectSlug: z.string().min(1),
        collectionSlug: z.string().min(1),
        filename: z.string().min(1).max(200),
        contentBase64: z.string().min(1).max(2 * 1024 * 1024),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<EnvironmentDTO> => {
    const { collection } = await resolveCollectionForUser(
      data.projectSlug,
      data.collectionSlug,
      context.userId,
    );
    const text = Buffer.from(data.contentBase64, "base64").toString("utf-8").trim();
    let parsed: PostmanEnvFile;
    try {
      parsed = JSON.parse(text) as PostmanEnvFile;
    } catch (e) {
      throw new Error(
        `File is not valid JSON: ${e instanceof Error ? e.message : "parse error"}`,
      );
    }
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.values)) {
      throw new Error(
        'File does not look like a Postman environment export (missing "values" array)',
      );
    }
    const variables: Record<string, string> = {};
    let baseUrl: string | null = null;
    for (const v of parsed.values) {
      if (!v || typeof v.key !== "string" || !v.key.trim()) continue;
      if (v.enabled === false) continue;
      const val = typeof v.value === "string" ? v.value : v.value == null ? "" : String(v.value);
      variables[v.key.trim()] = val;
      if (!baseUrl && /^(baseUrl|base_url|host|server|api(_|-)?url)$/i.test(v.key.trim())) {
        baseUrl = val || null;
      }
    }
    const fallbackName = data.filename
      .replace(/\.postman_environment\.json$/i, "")
      .replace(/\.json$/i, "")
      .trim();
    const name = parsed.name?.trim() || fallbackName || "Uploaded env";

    const { data: row, error } = await supabaseAdmin
      .from("collection_environments")
      .upsert(
        {
          collection_id: collection.id,
          name,
          source: "uploaded" as EnvSource,
          apidog_env_id: null,
          base_url: baseUrl,
          variables,
        },
        { onConflict: "collection_id,name" },
      )
      .select("id, name, source, apidog_env_id, base_url, variables, postman_env_uid, updated_at")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Failed to save environment");
    return toDTO(row as EnvRow);
  });

// ---------- Push selected envs to Postman as separate environments ----------

export const pushEnvironmentsToPostman = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        projectSlug: z.string().min(1),
        collectionSlug: z.string().min(1),
        environmentIds: z.array(z.string().uuid()).optional(),
      })
      .parse(d),
  )
  .handler(
    async ({
      data,
      context,
    }): Promise<{
      ok: boolean;
      pushed: number;
      results: Array<{ id: string; name: string; ok: boolean; uid: string | null; message: string | null }>;
    }> => {
      const { collection } = await resolveCollectionForUser(
        data.projectSlug,
        data.collectionSlug,
        context.userId,
      );
      const apiKey = collection.postman_api_key as string | null;
      if (!apiKey) throw new Error("Postman API key is not configured");
      const workspaceId = collection.postman_workspace_id as string | null;

      let q = supabaseAdmin
        .from("collection_environments")
        .select("id, name, source, apidog_env_id, base_url, variables, postman_env_uid, updated_at")
        .eq("collection_id", collection.id);
      if (data.environmentIds && data.environmentIds.length > 0) {
        q = q.in("id", data.environmentIds);
      }
      const { data: rows } = await q;
      const envs = (rows ?? []).map((r) => toDTO(r as EnvRow));
      if (envs.length === 0) throw new Error("No environments to push");

      const results: Array<{ id: string; name: string; ok: boolean; uid: string | null; message: string | null }> = [];

      for (const env of envs) {
        const values = Object.entries(env.variables).map(([key, value]) => ({
          key,
          value,
          enabled: true,
          type: /token|secret|password|key/i.test(key) ? "secret" : "default",
        }));
        if (env.baseUrl && !env.variables.baseUrl) {
          values.push({ key: "baseUrl", value: env.baseUrl, enabled: true, type: "default" });
        }
        const body = JSON.stringify({ environment: { name: env.name, values } });
        try {
          let uid = env.postmanEnvUid;
          let res: Response;
          if (uid) {
            res = await fetch(
              `https://api.getpostman.com/environments/${encodeURIComponent(uid)}`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
                body,
              },
            );
            if (res.status === 404) {
              // Stale uid — fall through to create.
              uid = null;
            }
          }
          if (!uid) {
            const url = workspaceId
              ? `https://api.getpostman.com/environments?workspace=${encodeURIComponent(workspaceId)}`
              : "https://api.getpostman.com/environments";
            res = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
              body,
            });
          }
          const txt = await res!.text();
          if (!res!.ok) {
            results.push({
              id: env.id,
              name: env.name,
              ok: false,
              uid: env.postmanEnvUid,
              message: `Postman ${res!.status}: ${txt.slice(0, 200)}`,
            });
            continue;
          }
          let newUid: string | null = env.postmanEnvUid;
          try {
            const parsed = JSON.parse(txt) as { environment?: { uid?: string; id?: string } };
            newUid = parsed.environment?.uid ?? parsed.environment?.id ?? newUid;
          } catch {
            // ignore
          }
          if (newUid && newUid !== env.postmanEnvUid) {
            await supabaseAdmin
              .from("collection_environments")
              .update({ postman_env_uid: newUid })
              .eq("id", env.id);
          }
          results.push({ id: env.id, name: env.name, ok: true, uid: newUid, message: null });
        } catch (e) {
          results.push({
            id: env.id,
            name: env.name,
            ok: false,
            uid: env.postmanEnvUid,
            message: e instanceof Error ? e.message : "Push failed",
          });
        }
      }
      const pushed = results.filter((r) => r.ok).length;
      return { ok: pushed > 0, pushed, results };
    },
  );
