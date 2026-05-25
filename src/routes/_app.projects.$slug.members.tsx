import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listProjectMembers,
  addProjectMember,
  removeProjectMember,
} from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Trash2, Crown } from "lucide-react";

export const Route = createFileRoute("/_app/projects/$slug/members")({
  head: ({ params }) => ({ meta: [{ title: `Members · ${params.slug} — SpecBridge` }] }),
  component: Members,
});

function Members() {
  const { slug } = Route.useParams();
  const qc = useQueryClient();
  const listFn = useServerFn(listProjectMembers);
  const addFn = useServerFn(addProjectMember);
  const rmFn = useServerFn(removeProjectMember);
  const [email, setEmail] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["members", slug],
    queryFn: () => listFn({ data: { projectSlug: slug } }),
  });

  const add = useMutation({
    mutationFn: () => addFn({ data: { projectSlug: slug, email } }),
    onSuccess: async () => {
      setEmail("");
      await qc.invalidateQueries({ queryKey: ["members", slug] });
      toast.success("Member added");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const rm = useMutation({
    mutationFn: (memberId: string) => rmFn({ data: { projectSlug: slug, memberId } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["members", slug] });
      toast.success("Member removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link
        to="/projects/$slug"
        params={{ slug }}
        className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to project
      </Link>
      <h1 className="mt-6 font-serif text-5xl">Members</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Add teammates by email. They need an account first. Admins always see every project.
      </p>

      <Card className="mt-8">
        <CardContent className="space-y-4 p-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (email.trim()) add.mutate();
            }}
            className="flex items-end gap-2"
          >
            <div className="flex-1">
              <Label htmlFor="m-email" className="font-mono text-[11px] uppercase tracking-wider">
                Invite by email
              </Label>
              <Input
                id="m-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@example.com"
                className="mt-1.5"
                required
              />
            </div>
            <Button type="submit" disabled={add.isPending}>
              {add.isPending ? "Adding…" : "Add"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : error ? (
            <p className="p-6 text-sm text-destructive">{(error as Error).message}</p>
          ) : (
            <ul className="divide-y divide-border">
              {(data ?? []).map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-secondary font-mono text-xs uppercase">
                    {(m.displayName ?? m.email).slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.displayName ?? m.email}</p>
                    <p className="truncate font-mono text-xs text-muted-foreground">{m.email}</p>
                  </div>
                  {m.isOwner ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs text-primary">
                      <Crown className="h-3 w-3" /> owner
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => rm.mutate(m.id)}
                      disabled={rm.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
