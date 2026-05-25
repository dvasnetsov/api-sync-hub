// Server-only access control helpers. Never import from client code.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type UserContext = { userId: string; isAdmin: boolean };

export async function getUserContext(userId: string): Promise<UserContext> {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const isAdmin = (data ?? []).some((r) => r.role === "admin");
  return { userId, isAdmin };
}

export async function assertProjectAccess(
  ctx: UserContext,
  projectId: string,
): Promise<void> {
  if (ctx.isAdmin) return;
  const { data: owned } = await supabaseAdmin
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", ctx.userId)
    .maybeSingle();
  if (owned) return;
  const { data: mem } = await supabaseAdmin
    .from("project_members")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", ctx.userId)
    .maybeSingle();
  if (mem) return;
  throw new Error("Forbidden: no access to this project");
}

export async function assertProjectOwner(
  ctx: UserContext,
  projectId: string,
): Promise<void> {
  if (ctx.isAdmin) return;
  const { data } = await supabaseAdmin
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", ctx.userId)
    .maybeSingle();
  if (!data) throw new Error("Forbidden: only the project owner can do this");
}

export function assertAdmin(ctx: UserContext): void {
  if (!ctx.isAdmin) throw new Error("Forbidden: admin only");
}
