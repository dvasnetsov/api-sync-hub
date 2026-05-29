import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertProjectAccess, getUserContext } from "@/lib/access.server";

export type PublishTarget = "apidog" | "postman";
export type PublishResult = {
  target: PublishTarget;
  ok: boolean;
  message: string | null;
};
export type PublishHistoryEntryDTO = {
  id: string;
  at: string;
  target: PublishTarget;
  status: "success" | "error" | "in_progress" | "idle";
  message: string | null;
};

async function resolveForPublish(projectSlug: string, collectionSlug: string, userId: string) {
  const ctx = await getUserContext(userId);
  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("id, slug, name, created_at, owner_id")
    .eq("slug", projectSlug)
    .maybeSingle();
  if (!project) throw new Error("Project not found");
  await assertProjectAccess(ctx, project.id);
  const { data: collection } = await supabaseAdmin
    .from("collections")
    .select("*")
    .eq("project_id", project.id)
    .eq("slug", collectionSlug)
    .maybeSingle();
  if (!collection) throw new Error("Collection not found");
  return { project, collection };
}

async function logPublish(
  collectionId: string,
  target: PublishTarget,
  status: "success" | "error",
  message: string | null,
) {
  await supabaseAdmin.from("publish_history").insert({
    collection_id: collectionId,
    target,
    status,
    message,
  });
}

export const publishToPostman = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        projectSlug: z.string().min(1),
        collectionSlug: z.string().min(1),
        apiKeyOverride: z.string().trim().max(500).optional(),
        collectionIdOverride: z.string().trim().max(100).optional(),
        workspaceIdOverride: z.string().trim().max(100).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<PublishResult> => {
    const { collection } = await resolveForPublish(
      data.projectSlug,
      data.collectionSlug,
      context.userId,
    );
    // Accept overrides from the UI so users don't have to "Save" first.
    let apiKey = (collection.postman_api_key as string | null) ?? null;
    const persist: {
      postman_api_key?: string | null;
      postman_collection_id?: string | null;
      postman_workspace_id?: string | null;
    } = {};
    if (data.apiKeyOverride && data.apiKeyOverride.length > 0) {
      apiKey = data.apiKeyOverride;
      persist.postman_api_key = apiKey;
    }
    if (typeof data.collectionIdOverride === "string") {
      const v = data.collectionIdOverride.trim();
      if (v !== (collection.postman_collection_id ?? "")) {
        persist.postman_collection_id = v.length ? v : null;
        (collection as { postman_collection_id: string | null }).postman_collection_id =
          v.length ? v : null;
      }
    }
    if (typeof data.workspaceIdOverride === "string") {
      const v = data.workspaceIdOverride.trim();
      if (v !== (collection.postman_workspace_id ?? "")) {
        persist.postman_workspace_id = v.length ? v : null;
        (collection as { postman_workspace_id: string | null }).postman_workspace_id =
          v.length ? v : null;
      }
    }
    if (Object.keys(persist).length > 0) {
      await supabaseAdmin.from("collections").update(persist).eq("id", collection.id);
    }
    if (!apiKey) throw new Error("Postman API key is not configured");
    if (collection.last_sync_status !== "success") {
      throw new Error("No published spec yet — pull or upload first");
    }
    const ext = collection.export_format === "yaml" ? "yaml" : "json";
    const specPath = `${data.projectSlug}/${data.collectionSlug}/openapi.${ext}`;
    const { data: file, error: dlErr } = await supabaseAdmin.storage
      .from("specs")
      .download(specPath);
    if (dlErr || !file) throw new Error(`Spec file not found: ${dlErr?.message ?? "missing"}`);
    const specText = await file.text();

    let message = "";
    let ok = false;
    try {
      // Postman /import/openapi converts spec → Postman v2.1 collection JSON.
      const conv = await fetch("https://api.getpostman.com/import/openapi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": apiKey,
        },
        body: JSON.stringify({
          type: "string",
          input: specText,
          options: { folderStrategy: "Tags" },
        }),
      });
      const convBody = await conv.text();
      if (!conv.ok) {
        message = `Postman import failed: ${conv.status} ${convBody.slice(0, 240)}`;
        throw new Error(message);
      }
      const parsed = JSON.parse(convBody) as {
        output?: Array<{ data?: unknown; type?: string }>;
      };
      const item = parsed.output?.find((o) => o.type === "collection" || o.data);
      const collectionJson = (item?.data ?? parsed.output?.[0]?.data) as Record<string, unknown> | undefined;
      if (!collectionJson) {
        message = `Postman import returned no collection data: ${convBody.slice(0, 200)}`;
        throw new Error(message);
      }

      // Merge env variables into the collection's `variable[]` so users get
      // sensible defaults even before they pick an environment.
      const { data: envRows } = await supabaseAdmin
        .from("collection_environments")
        .select("name, base_url, variables, source")
        .eq("collection_id", collection.id);
      const envList = envRows ?? [];
      if (envList.length > 0) {
        const merged: Record<string, string> = {};
        for (const e of envList) {
          if (e.base_url && !merged.baseUrl) merged.baseUrl = String(e.base_url);
          const vars = (e.variables ?? {}) as Record<string, unknown>;
          for (const [k, v] of Object.entries(vars)) {
            if (merged[k] !== undefined) continue;
            merged[k] = v == null ? "" : typeof v === "string" ? v : String(v);
          }
        }
        const existing = Array.isArray(collectionJson.variable) ? collectionJson.variable : [];
        const existingKeys = new Set(
          (existing as Array<{ key?: string }>).map((v) => v?.key).filter(Boolean) as string[],
        );
        const additions = Object.entries(merged)
          .filter(([k]) => !existingKeys.has(k))
          .map(([key, value]) => ({ key, value, type: "default" as const }));
        collectionJson.variable = [...existing, ...additions];
      }


      const existingId = collection.postman_collection_id as string | null;
      const workspaceId = collection.postman_workspace_id as string | null;

      if (existingId) {
        const putUrl = `https://api.getpostman.com/collections/${encodeURIComponent(existingId)}`;
        const res = await fetch(putUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
          body: JSON.stringify({ collection: collectionJson }),
        });
        const body = await res.text();
        if (!res.ok) {
          message = `Postman PUT failed: ${res.status} ${body.slice(0, 240)}`;
          throw new Error(message);
        }
        message = `Updated Postman collection ${existingId}`;
        ok = true;
      } else {
        const postUrl = workspaceId
          ? `https://api.getpostman.com/collections?workspace=${encodeURIComponent(workspaceId)}`
          : "https://api.getpostman.com/collections";
        const res = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
          body: JSON.stringify({ collection: collectionJson }),
        });
        const body = await res.text();
        if (!res.ok) {
          message = `Postman POST failed: ${res.status} ${body.slice(0, 240)}`;
          throw new Error(message);
        }
        try {
          const created = JSON.parse(body) as { collection?: { uid?: string; id?: string } };
          const newId = created.collection?.uid ?? created.collection?.id ?? null;
          if (newId) {
            await supabaseAdmin
              .from("collections")
              .update({ postman_collection_id: newId })
              .eq("id", collection.id);
            message = `Created Postman collection ${newId}`;
          } else {
            message = "Created Postman collection (id not returned)";
          }
        } catch {
          message = "Created Postman collection";
        }
        ok = true;
      }

      // After the collection is in Postman, sync each environment as a
      // separate Postman environment. Failures here are reported but don't
      // fail the whole publish — the collection itself is already up.
      try {
        const { data: envRows2 } = await supabaseAdmin
          .from("collection_environments")
          .select("id, name, base_url, variables, postman_env_uid")
          .eq("collection_id", collection.id);
        const envCount = envRows2?.length ?? 0;
        let envOk = 0;
        let envFail = 0;
        for (const env of envRows2 ?? []) {
          const vars = (env.variables ?? {}) as Record<string, unknown>;
          const values = Object.entries(vars).map(([key, value]) => ({
            key,
            value: value == null ? "" : typeof value === "string" ? value : String(value),
            enabled: true,
            type: /token|secret|password|key/i.test(key) ? "secret" : "default",
          }));
          if (env.base_url && !("baseUrl" in vars)) {
            values.push({ key: "baseUrl", value: String(env.base_url), enabled: true, type: "default" });
          }
          const envBody = JSON.stringify({ environment: { name: env.name, values } });
          try {
            let uid = env.postman_env_uid as string | null;
            let envRes: Response | null = null;
            if (uid) {
              envRes = await fetch(
                `https://api.getpostman.com/environments/${encodeURIComponent(uid)}`,
                {
                  method: "PUT",
                  headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
                  body: envBody,
                },
              );
              if (envRes.status === 404) uid = null;
            }
            if (!uid) {
              const url = workspaceId
                ? `https://api.getpostman.com/environments?workspace=${encodeURIComponent(workspaceId)}`
                : "https://api.getpostman.com/environments";
              envRes = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
                body: envBody,
              });
            }
            const envTxt = await envRes!.text();
            if (!envRes!.ok) {
              envFail++;
              continue;
            }
            try {
              const parsedEnv = JSON.parse(envTxt) as {
                environment?: { uid?: string; id?: string };
              };
              const newUid =
                parsedEnv.environment?.uid ?? parsedEnv.environment?.id ?? uid ?? null;
              if (newUid && newUid !== env.postman_env_uid) {
                await supabaseAdmin
                  .from("collection_environments")
                  .update({ postman_env_uid: newUid })
                  .eq("id", env.id);
              }
            } catch {
              // ignore body parse errors
            }
            envOk++;
          } catch {
            envFail++;
          }
        }
        if (envCount > 0) {
          message = `${message} · envs ${envOk}/${envCount}${envFail ? ` (${envFail} failed)` : ""}`;
        }
      } catch (e) {
        console.warn("[postman] env push failed", e);
      }
    } catch (e) {
      ok = false;
      if (!message) message = e instanceof Error ? e.message : "Postman publish failed";
    }


    await supabaseAdmin
      .from("collections")
      .update({
        postman_last_publish_at: new Date().toISOString(),
        postman_last_publish_status: ok ? "success" : "error",
        postman_last_publish_message: message.slice(0, 500),
      })
      .eq("id", collection.id);
    await logPublish(collection.id, "postman", ok ? "success" : "error", message.slice(0, 500));
    if (!ok) throw new Error(message);
    return { target: "postman", ok: true, message };
  });

export const updatePostmanSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        projectSlug: z.string().min(1),
        collectionSlug: z.string().min(1),
        apiKey: z.string().max(500).optional().nullable(),
        collectionId: z.string().trim().max(100).optional().nullable(),
        workspaceId: z.string().trim().max(100).optional().nullable(),
        autoPublish: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { collection } = await resolveForPublish(
      data.projectSlug,
      data.collectionSlug,
      context.userId,
    );
    const patch: {
      postman_collection_id: string | null;
      postman_workspace_id: string | null;
      postman_auto_publish: boolean;
      postman_api_key?: string | null;
    } = {
      postman_collection_id: data.collectionId?.trim() || null,
      postman_workspace_id: data.workspaceId?.trim() || null,
      postman_auto_publish: data.autoPublish,
    };
    if (data.apiKey === null) patch.postman_api_key = null;
    else if (typeof data.apiKey === "string" && data.apiKey.length > 0)
      patch.postman_api_key = data.apiKey.trim();
    const { error } = await supabaseAdmin
      .from("collections")
      .update(patch)
      .eq("id", collection.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateApidogAutoPublish = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        projectSlug: z.string().min(1),
        collectionSlug: z.string().min(1),
        autoPublish: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { collection } = await resolveForPublish(
      data.projectSlug,
      data.collectionSlug,
      context.userId,
    );
    await supabaseAdmin
      .from("collections")
      .update({ apidog_auto_publish: data.autoPublish })
      .eq("id", collection.id);
    return { ok: true };
  });

export const listPublishHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ projectSlug: z.string().min(1), collectionSlug: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data, context }): Promise<PublishHistoryEntryDTO[]> => {
    const { collection } = await resolveForPublish(
      data.projectSlug,
      data.collectionSlug,
      context.userId,
    );
    const { data: rows } = await supabaseAdmin
      .from("publish_history")
      .select("id, at, target, status, message")
      .eq("collection_id", collection.id)
      .order("at", { ascending: false })
      .limit(50);
    return (rows ?? []).map((r) => ({
      id: r.id,
      at: r.at,
      target: r.target as PublishTarget,
      status: r.status as PublishHistoryEntryDTO["status"],
      message: r.message,
    }));
  });
