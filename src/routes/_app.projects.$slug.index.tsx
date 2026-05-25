import { createFileRoute, Link, notFound } from "@tanstack/react-router";
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
import { StatusPill } from "@/components/StatusPill";
import { formatBytes, formatRelative, specPublicUrl } from "@/lib/format";
import { getProject, createCollection, syncFromApidog } from "@/lib/specs.functions";
import { ArrowLeft, ArrowRight, Copy, Files, Loader2, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/projects/$slug/")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — SpecBridge` },
      { name: "description", content: `Collections inside ${params.slug}.` },
    ],
  }),
  component: ProjectDetail,
});

function ProjectDetail() {
  const { slug } = Route.useParams();
  const qc = useQueryClient();
  const getP = useServerFn(getProject);
  const sync = useServerFn(syncFromApidog);
  const { data, isLoading } = useQuery({
    queryKey: ["project", slug],
    queryFn: () => getP({ data: { slug } }),
  });

  const syncMut = useMutation({
    mutationFn: (collectionSlug: string) =>
      sync({ data: { projectSlug: slug, collectionSlug } }),
    onSuccess: async (_d, collectionSlug) => {
      await qc.invalidateQueries({ queryKey: ["project", slug] });
      await qc.invalidateQueries({ queryKey: ["collection", slug, collectionSlug] });
      toast.success("Sync complete");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <main className="mx-auto flex max-w-6xl justify-center px-6 py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    );
  }
  if (!data) throw notFound();
  const project = data;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link
        to="/projects"
        className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All projects
      </Link>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Project · /{project.slug}
          </p>
          <h1 className="mt-2 font-serif text-5xl text-foreground">{project.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/projects/$slug/members" params={{ slug: project.slug }}>
              Members
            </Link>
          </Button>
          <NewCollectionDialog projectSlug={project.slug} />
        </div>
      </div>

      <h2 className="mt-10 font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
        Collections · {project.collections.length}
      </h2>

      <div className="mt-4">
        {project.collections.length === 0 ? (
          <EmptyState
            icon={<Files className="h-10 w-10" />}
            title="No collections yet"
            description="A collection is one OpenAPI spec. It gets its own permanent URL the moment you create it."
            action={<NewCollectionDialog projectSlug={project.slug} />}
          />
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {project.collections.map((c) => {
              const url = specPublicUrl(project.slug, c.slug, c.exportFormat);
              const failed = c.lastSyncStatus === "error";
              const retry = (e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                if (!c.apidogSourceProjectId || !c.apidogSourceTokenConfigured) {
                  toast.error("Apidog not configured for this collection");
                  return;
                }
                syncMut.mutate(c.slug);
              };
              return (
                <li key={c.id}>
                  <Link
                    to="/projects/$slug/$collection"
                    params={{ slug: project.slug, collection: c.slug }}
                    className="group flex items-center gap-6 px-5 py-4 transition-colors hover:bg-secondary/60"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="truncate font-serif text-xl text-foreground">{c.name}</h3>
                        <StatusPill status={c.lastSyncStatus} />
                      </div>
                      <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{url}</p>
                    </div>
                    <div className="hidden gap-6 sm:flex">
                      <Stat label="Endpoints" value={c.endpoints ? `${c.endpoints}` : "—"} />
                      <Stat label="Size" value={formatBytes(c.sizeBytes)} />
                      <Stat
                        label="Synced"
                        value={c.lastSyncAt ? formatRelative(c.lastSyncAt) : "—"}
                      />
                    </div>
                    {failed && (
                      <Button size="sm" variant="outline" onClick={retry} disabled={syncMut.isPending}>
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Sync
                      </Button>
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigator.clipboard.writeText(url);
                        toast.success("URL copied");
                      }}
                      className="rounded-md border border-border bg-background p-1.5 text-muted-foreground hover:text-foreground"
                      aria-label="Copy URL"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <p className="font-mono text-sm text-foreground">{value}</p>
      <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function NewCollectionDialog({ projectSlug }: { projectSlug: string }) {
  const qc = useQueryClient();
  const create = useServerFn(createCollection);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const m = useMutation({
    mutationFn: (n: string) => create({ data: { projectSlug, name: n } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["project", projectSlug] });
      toast.success("Collection created");
      setOpen(false);
      setName("");
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
          <Plus className="mr-1 h-4 w-4" /> New collection
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">New collection</DialogTitle>
          <DialogDescription>
            One collection = one openapi.json behind one permanent URL.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="nc-name" className="font-mono text-[11px] uppercase tracking-wider">
              Name
            </Label>
            <Input
              id="nc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Admin API"
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
              {m.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
