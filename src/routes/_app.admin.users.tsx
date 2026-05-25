import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listAllUsers,
  setUserRole,
  getMe,
  listAllProjectsForAdmin,
  listInvitations,
  createInvitation,
  revokeInvitation,
} from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { formatRelative } from "@/lib/format";
import { toast } from "sonner";
import { Loader2, ShieldCheck, User as UserIcon, Mail, X, Send } from "lucide-react";

export const Route = createFileRoute("/_app/admin/users")({
  head: () => ({ meta: [{ title: "Пользователи — Admin · SpecBridge" }] }),
  component: AdminUsers,
});

function AdminUsers() {
  const qc = useQueryClient();
  const me = useServerFn(getMe);
  const list = useServerFn(listAllUsers);
  const setRole = useServerFn(setUserRole);
  const projectsFn = useServerFn(listAllProjectsForAdmin);
  const invitesFn = useServerFn(listInvitations);
  const invite = useServerFn(createInvitation);
  const revoke = useServerFn(revokeInvitation);

  const { data: meData } = useQuery({ queryKey: ["me"], queryFn: () => me() });
  const enabled = meData?.isAdmin === true;
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => list(),
    enabled,
  });
  const { data: projects } = useQuery({
    queryKey: ["admin-projects"],
    queryFn: () => projectsFn(),
    enabled,
  });
  const { data: invitations } = useQuery({
    queryKey: ["admin-invitations"],
    queryFn: () => invitesFn(),
    enabled,
  });

  const setRoleMut = useMutation({
    mutationFn: (v: { userId: string; role: "admin" | "user" }) => setRole({ data: v }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Role updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [email, setEmail] = useState("");
  const [role, setNewRole] = useState<"admin" | "user">("user");
  const [pickedProjects, setPickedProjects] = useState<Set<string>>(new Set());

  const inviteMut = useMutation({
    mutationFn: () =>
      invite({
        data: { email, role, projectIds: role === "user" ? Array.from(pickedProjects) : [] },
      }),
    onSuccess: async (r) => {
      setEmail("");
      setPickedProjects(new Set());
      await qc.invalidateQueries({ queryKey: ["admin-invitations"] });
      await qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(
        r.applied
          ? "Пользователь уже зарегистрирован — права применены сразу"
          : "Приглашение создано. При первом входе через Google всё применится автоматически.",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeMut = useMutation({
    mutationFn: (id: string) => revoke({ data: { id } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-invitations"] });
      toast.success("Приглашение отозвано");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (meData && !meData.isAdmin) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="font-serif text-3xl">Только для администраторов</h1>
        <p className="mt-2 text-sm text-muted-foreground">У вас нет доступа к этой странице.</p>
      </main>
    );
  }

  const togglePick = (id: string) => {
    setPickedProjects((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">Admin</p>
      <h1 className="mt-2 font-serif text-5xl">Пользователи</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Управляйте доступом: приглашайте людей по email, назначайте роли и выбирайте проекты.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* Invite form */}
        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="font-medium">Пригласить пользователя</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Если человек уже зарегистрирован — права применятся сразу. Иначе приглашение
                сработает при первом входе через Google.
              </p>
            </div>

            <div>
              <Label htmlFor="inv-email" className="font-mono text-[11px] uppercase tracking-wider">
                Email
              </Label>
              <Input
                id="inv-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label className="font-mono text-[11px] uppercase tracking-wider">Роль</Label>
              <Select value={role} onValueChange={(v) => setNewRole(v as "admin" | "user")}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">user — доступ только к выбранным проектам</SelectItem>
                  <SelectItem value="admin">admin — полный доступ ко всему</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {role === "user" && (
              <div>
                <Label className="font-mono text-[11px] uppercase tracking-wider">
                  Проекты ({pickedProjects.size})
                </Label>
                <div className="mt-1.5 max-h-56 space-y-1 overflow-y-auto rounded-md border bg-muted/20 p-2">
                  {(projects ?? []).length === 0 && (
                    <p className="px-2 py-3 text-xs text-muted-foreground">Нет проектов.</p>
                  )}
                  {(projects ?? []).map((p) => (
                    <label
                      key={p.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-secondary"
                    >
                      <Checkbox
                        checked={pickedProjects.has(p.id)}
                        onCheckedChange={() => togglePick(p.id)}
                      />
                      <span className="flex-1 truncate">{p.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">{p.slug}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={() => inviteMut.mutate()}
              disabled={inviteMut.isPending || !email.includes("@")}
              className="w-full"
            >
              <Send className="mr-1.5 h-4 w-4" />
              {inviteMut.isPending ? "Отправляем…" : "Пригласить"}
            </Button>

            {/* Pending invitations */}
            {(invitations ?? []).filter((i) => !i.acceptedAt).length > 0 && (
              <div className="space-y-2 border-t pt-4">
                <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  Ожидают входа
                </p>
                <ul className="space-y-1">
                  {(invitations ?? [])
                    .filter((i) => !i.acceptedAt)
                    .map((i) => (
                      <li
                        key={i.id}
                        className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm"
                      >
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="flex-1 truncate">{i.email}</span>
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase">
                          {i.role}
                          {i.role === "user" && i.projectIds.length > 0
                            ? ` · ${i.projectIds.length} проектов`
                            : ""}
                        </span>
                        <button
                          onClick={() => revokeMut.mutate(i.id)}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="Отозвать"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Users list */}
        <Card>
          <CardContent className="p-0">
            <div className="border-b px-5 py-3">
              <p className="font-medium">Зарегистрированные</p>
            </div>
            {isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {(users ?? []).map((u) => (
                  <li key={u.id} className="flex items-center gap-4 px-5 py-4">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-secondary font-mono text-xs uppercase">
                      {(u.displayName ?? u.email).slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{u.displayName ?? u.email}</p>
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        {u.email} · {formatRelative(u.createdAt)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs ${
                        u.isAdmin ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {u.isAdmin ? <ShieldCheck className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
                      {u.isAdmin ? "admin" : "user"}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={setRoleMut.isPending || u.id === meData?.id}
                      onClick={() =>
                        setRoleMut.mutate({ userId: u.id, role: u.isAdmin ? "user" : "admin" })
                      }
                    >
                      {u.isAdmin ? "Снять admin" : "Сделать admin"}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
