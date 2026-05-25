import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";
import { formatRelative } from "@/lib/format";
import { listProjects, createProject } from "@/lib/specs.functions";
import { ArrowRight, FolderOpen, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/projects/")({
  head: () => ({
    meta: [
      { title: "Projects — SpecBridge" },
      { name: "description", content: "Your SpecBridge projects and hosted OpenAPI collections." },
    ],
  }),
  component: ProjectsIndex,
});

function ProjectsIndex() {
  const list = useServerFn(listProjects);
  const { data, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => list(),
  });
  const projects = data ?? [];
  const [q, setQ] = useState("");
  const filtered = projects.filter(
    (p) => p.name.toLowerCase().includes(q.toLowerCase()) || p.slug.includes(q.toLowerCase()),
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Workspace
          </p>
          <h1 className="mt-2 font-serif text-5xl text-foreground">Projects</h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Each project groups related collections. Every collection becomes a permanent hosted
            URL.
          </p>
        </div>
        <NewProjectDialog />
      </div>

      <div className="mt-8 flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search projects…"
            className="pl-9"
          />
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {isLoading ? "loading…" : `${filtered.length} / ${projects.length} shown`}
        </span>
      </div>

      <div className="mt-8">
        {isLoading ? (
          <div className="flex justify-center py-20 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          projects.length === 0 ? (
            <EmptyState
              icon={<FolderOpen className="h-10 w-10" />}
              title="Your workspace is empty"
              description="Create your first project to group OpenAPI collections behind permanent URLs."
              action={<NewProjectDialog />}
            />
          ) : (
            <EmptyState
              title="No matches"
              description={`Nothing matched "${q}". Try a different search.`}
              action={
                <Button variant="outline" onClick={() => setQ("")}>
                  Clear search
                </Button>
              }
            />
          )
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {filtered.map((p) => (
              <li key={p.id}>
                <Link
                  to="/projects/$slug"
                  params={{ slug: p.slug }}
                  className="group rounded-lg border border-border bg-card block p-6 transition-colors hover:bg-card/80"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        /{p.slug}
                      </p>
                      <h2 className="mt-1 font-serif text-2xl text-foreground">{p.name}</h2>
                    </div>
                    <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <div className="mt-6 flex items-center gap-4 border-t border-dashed border-border pt-4 font-mono text-xs text-muted-foreground">
                    <span>{p.collectionsCount} collections</span>
                    <span>·</span>
                    <span>{p.liveCount} live</span>
                    <span className="ml-auto">{formatRelative(p.createdAt)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function NewProjectDialog() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const create = useServerFn(createProject);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const m = useMutation({
    mutationFn: (n: string) => create({ data: { name: n } }),
    onSuccess: async (p) => {
      await qc.invalidateQueries({ queryKey: ["projects"] });
      setOpen(false);
      setName("");
      toast.success("Project created");
      nav({ to: "/projects/$slug", params: { slug: p.slug } });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    m.mutate(name.trim());
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1 h-4 w-4" /> New project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Create a new project</DialogTitle>
          <DialogDescription>
            A project is a folder. Its slug becomes part of every collection URL.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="np-name" className="font-mono text-[11px] uppercase tracking-wider">
              Name
            </Label>
            <Input
              id="np-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Platform"
              className="mt-1.5"
              autoFocus
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={m.isPending}>
              {m.isPending ? "Creating…" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
