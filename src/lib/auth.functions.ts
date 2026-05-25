import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  assertAdmin,
  assertProjectOwner,
  getUserContext,
} from "@/lib/access.server";

export type MeDTO = {
  id: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
};

export type UserListItemDTO = {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
  isAdmin: boolean;
};

export type ProjectMemberDTO = {
  id: string;
  userId: string;
  email: string;
  displayName: string | null;
  addedAt: string;
  isOwner: boolean;
};

export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MeDTO> => {
    const userId = context.userId;
    const ctx = await getUserContext(userId);
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, display_name")
      .eq("id", userId)
      .maybeSingle();
    return {
      id: userId,
      email: profile?.email ?? "",
      displayName: profile?.display_name ?? null,
      isAdmin: ctx.isAdmin,
    };
  });

export const listAllUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UserListItemDTO[]> => {
    const ctx = await getUserContext(context.userId);
    assertAdmin(ctx);
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, email, display_name, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role");
    const adminSet = new Set(
      (roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id),
    );
    return (profiles ?? []).map((p) => ({
      id: p.id,
      email: p.email,
      displayName: p.display_name,
      createdAt: p.created_at,
      isAdmin: adminSet.has(p.id),
    }));
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.enum(["admin", "user"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const ctx = await getUserContext(context.userId);
    assertAdmin(ctx);
    if (data.role === "admin") {
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "user");
    } else {
      // Prevent removing the last admin
      const { count } = await supabaseAdmin
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");
      const { data: isThisAdmin } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", data.userId)
        .eq("role", "admin")
        .maybeSingle();
      if (isThisAdmin && (count ?? 0) <= 1) {
        throw new Error("Cannot demote the last admin");
      }
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: "user" }, { onConflict: "user_id,role" });
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "admin");
    }
    return { ok: true };
  });

export const listProjectMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ projectSlug: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }): Promise<ProjectMemberDTO[]> => {
    const ctx = await getUserContext(context.userId);
    const { data: project } = await supabaseAdmin
      .from("projects")
      .select("id, owner_id")
      .eq("slug", data.projectSlug)
      .maybeSingle();
    if (!project) throw new Error("Project not found");
    // Access check (owner / member / admin)
    if (!ctx.isAdmin && project.owner_id !== ctx.userId) {
      const { data: m } = await supabaseAdmin
        .from("project_members")
        .select("id")
        .eq("project_id", project.id)
        .eq("user_id", ctx.userId)
        .maybeSingle();
      if (!m) throw new Error("Forbidden");
    }
    const { data: members } = await supabaseAdmin
      .from("project_members")
      .select("id, user_id, added_at")
      .eq("project_id", project.id)
      .order("added_at", { ascending: true });

    const userIds = new Set<string>();
    if (project.owner_id) userIds.add(project.owner_id);
    for (const m of members ?? []) userIds.add(m.user_id);
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email, display_name")
      .in("id", Array.from(userIds));
    const byId = new Map(
      (profiles ?? []).map((p) => [p.id, { email: p.email, displayName: p.display_name }]),
    );

    const result: ProjectMemberDTO[] = [];
    if (project.owner_id) {
      const p = byId.get(project.owner_id);
      result.push({
        id: `owner-${project.owner_id}`,
        userId: project.owner_id,
        email: p?.email ?? "",
        displayName: p?.displayName ?? null,
        addedAt: "",
        isOwner: true,
      });
    }
    for (const m of members ?? []) {
      const p = byId.get(m.user_id);
      result.push({
        id: m.id,
        userId: m.user_id,
        email: p?.email ?? "",
        displayName: p?.displayName ?? null,
        addedAt: m.added_at,
        isOwner: false,
      });
    }
    return result;
  });

export const addProjectMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        projectSlug: z.string().min(1),
        email: z.string().trim().toLowerCase().email(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const ctx = await getUserContext(context.userId);
    const { data: project } = await supabaseAdmin
      .from("projects")
      .select("id, owner_id")
      .eq("slug", data.projectSlug)
      .maybeSingle();
    if (!project) throw new Error("Project not found");
    await assertProjectOwner(ctx, project.id);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", data.email)
      .maybeSingle();
    if (!profile) {
      throw new Error("No registered user with that email — ask them to sign up first");
    }
    if (project.owner_id === profile.id) {
      throw new Error("This user already owns the project");
    }
    const { error } = await supabaseAdmin
      .from("project_members")
      .upsert(
        { project_id: project.id, user_id: profile.id },
        { onConflict: "project_id,user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeProjectMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ projectSlug: z.string().min(1), memberId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const ctx = await getUserContext(context.userId);
    const { data: project } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("slug", data.projectSlug)
      .maybeSingle();
    if (!project) throw new Error("Project not found");
    await assertProjectOwner(ctx, project.id);
    const { error } = await supabaseAdmin
      .from("project_members")
      .delete()
      .eq("id", data.memberId)
      .eq("project_id", project.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============= Invitations =============

export type InvitationDTO = {
  id: string;
  email: string;
  role: "admin" | "user";
  projectIds: string[];
  createdAt: string;
  acceptedAt: string | null;
};

export type AdminProjectDTO = { id: string; slug: string; name: string };

export const listAllProjectsForAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminProjectDTO[]> => {
    const ctx = await getUserContext(context.userId);
    assertAdmin(ctx);
    const { data } = await supabaseAdmin
      .from("projects")
      .select("id, slug, name")
      .order("name", { ascending: true });
    return (data ?? []).map((p) => ({ id: p.id, slug: p.slug, name: p.name }));
  });

export const listInvitations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<InvitationDTO[]> => {
    const ctx = await getUserContext(context.userId);
    assertAdmin(ctx);
    const { data } = await supabaseAdmin
      .from("pending_invitations")
      .select("id, email, role, project_ids, created_at, accepted_at")
      .order("created_at", { ascending: false })
      .limit(100);
    return (data ?? []).map((r) => ({
      id: r.id,
      email: r.email,
      role: r.role as "admin" | "user",
      projectIds: (r.project_ids ?? []) as string[],
      createdAt: r.created_at,
      acceptedAt: r.accepted_at,
    }));
  });

export const createInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        email: z.string().trim().toLowerCase().email(),
        role: z.enum(["admin", "user"]),
        projectIds: z.array(z.string().uuid()).default([]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const ctx = await getUserContext(context.userId);
    assertAdmin(ctx);

    // If a user with this email already exists, apply immediately.
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", data.email)
      .maybeSingle();

    if (profile) {
      // Set role
      if (data.role === "admin") {
        await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: profile.id, role: "admin" }, { onConflict: "user_id,role" });
        await supabaseAdmin
          .from("user_roles")
          .delete()
          .eq("user_id", profile.id)
          .eq("role", "user");
      } else {
        await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: profile.id, role: "user" }, { onConflict: "user_id,role" });
        for (const pid of data.projectIds) {
          await supabaseAdmin
            .from("project_members")
            .upsert(
              { project_id: pid, user_id: profile.id },
              { onConflict: "project_id,user_id" },
            );
        }
      }
      return { ok: true, applied: true as const };
    }

    // Otherwise, store a pending invite.
    await supabaseAdmin
      .from("pending_invitations")
      .delete()
      .eq("email", data.email)
      .is("accepted_at", null);
    const { error } = await supabaseAdmin.from("pending_invitations").insert({
      email: data.email,
      role: data.role,
      project_ids: data.role === "user" ? data.projectIds : [],
      invited_by: ctx.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true, applied: false as const };
  });

export const revokeInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = await getUserContext(context.userId);
    assertAdmin(ctx);
    const { error } = await supabaseAdmin
      .from("pending_invitations")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
