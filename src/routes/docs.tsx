import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  FileText,
  Globe,
  Link2,
  Lock,
  Upload,
} from "lucide-react";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "How SpecBridge works — Docs" },
      {
        name: "description",
        content:
          "SpecBridge gives every OpenAPI collection a permanent public URL, two-way sync with Apidog, and a place to manage markdown documentation. This page is generated from the code and stays current with every change.",
      },
      { property: "og:title", content: "How SpecBridge works — Docs" },
      {
        property: "og:description",
        content:
          "Permanent OpenAPI URLs, two-way Apidog sync, and markdown docs. Read what each button does and which Apidog endpoints we call.",
      },
    ],
  }),
  component: DocsPage,
});

function DocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Documentation
        </p>
        <h1 className="mt-2 font-serif text-5xl">How SpecBridge works</h1>
        <p className="mt-4 text-base text-muted-foreground">
          SpecBridge is a thin layer in front of{" "}
          <a
            href="https://apidog.com"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Apidog
          </a>
          . Every collection you create gets a permanent public URL for its OpenAPI spec, a
          two-way sync with an Apidog project, and a place to manage markdown documentation
          pages. This page is generated from the code, so it stays current with every change
          we ship.
        </p>

        <Section title="Core idea" icon={Link2}>
          <p>
            A <strong>project</strong> in SpecBridge is a logical grouping (e.g. a product or a
            team). Inside a project you create <strong>collections</strong>. Each collection
            owns:
          </p>
          <ul className="ml-5 list-disc space-y-1.5">
            <li>
              A permanent URL like{" "}
              <code className="font-mono text-xs">
                /api/public/specs/&lt;project&gt;/&lt;collection&gt;/openapi.json
              </code>{" "}
              — it never changes when you re-sync, so it's safe to embed in CI, IDE plugins
              and AI tools.
            </li>
            <li>An Apidog project ID + access token, stored server-side only.</li>
            <li>
              Granular import settings (conflict strategy for endpoints/schemas, target
              folder/module, delete-unmatched flag).
            </li>
            <li>A list of markdown pages (in-spec or manual) that we sync to Apidog.</li>
          </ul>
        </Section>

        <Section title="Pull from Apidog" icon={ArrowDownToLine}>
          <p>
            We call Apidog's export-openapi endpoint, write the result to storage under the
            permanent path, and update the collection's status. The URL never changes — only
            its contents do.
          </p>
          <ApiRow
            method="POST"
            path="/v1/projects/{projectId}/export-openapi"
            doc="https://m4opsr4ibu.apidog.io/api-20691593"
          />
        </Section>

        <Section title="Upload a spec file" icon={Upload}>
          <p>
            Instead of (or in addition to) pulling from Apidog, you can upload an OpenAPI
            JSON/YAML file. We validate it, swap it into the permanent URL, and record the
            upload in sync history.
          </p>
        </Section>

        <Section title="Push to Apidog" icon={ArrowUpFromLine}>
          <p>
            Sends the current spec (whatever is at the permanent URL) back to Apidog using
            import-openapi with the conflict strategy you configured. We surface counters and
            warnings — if Apidog accepts the request but imports nothing, we report it as a
            failure instead of silently succeeding.
          </p>
          <ApiRow
            method="POST"
            path="/v1/projects/{projectId}/import-openapi"
            doc="https://docs.apidog.io/import-openapi-spec-635046m0"
          />
        </Section>

        <Section title="Markdown pages" icon={FileText}>
          <p>
            Apidog's OpenAPI import doesn't touch standalone markdown documents. We sync them
            in a separate step on every push. Source order:
          </p>
          <ul className="ml-5 list-disc space-y-1.5">
            <li>
              Any <code className="font-mono text-xs">x-apidog-markdowns</code> array in the
              spec (top-level or inside <code className="font-mono text-xs">info</code>). Each
              entry is <code className="font-mono text-xs">{`{ name, content, folderId? }`}</code>.
            </li>
            <li>
              Manual entries from the <em>Markdown pages</em> tab on the collection page.
              These take precedence on name conflicts.
            </li>
          </ul>
          <p>
            Matching is by name: same name → updated, new name → created. We never delete
            pages from Apidog automatically.
          </p>
          <ApiRow
            method="GET / POST / PUT"
            path="/v1/projects/{projectId}/markdowns"
            doc="https://m4opsr4ibu.apidog.io/api-20691595"
          />
        </Section>

        <Section title="Public spec URL" icon={Globe}>
          <p>
            The permanent URL is served by a TanStack server route that streams the spec
            directly from object storage with permissive CORS. No auth, safe to share.
          </p>
          <ApiRow
            method="GET"
            path="/api/public/specs/{project}/{collection}/openapi.{json|yaml}"
          />
        </Section>

        <Section title="Where things live" icon={Lock}>
          <ul className="ml-5 list-disc space-y-1.5">
            <li>
              <strong>Stack:</strong> TanStack Start (React 19 + Vite 7) on Cloudflare
              Workers, Postgres + object storage via Supabase, shadcn/ui + Tailwind v4.
            </li>
            <li>
              <strong>Server logic:</strong> TanStack server functions in{" "}
              <code className="font-mono text-xs">src/lib/specs.functions.ts</code>. The
              public spec route lives at{" "}
              <code className="font-mono text-xs">
                src/routes/api/public/specs.$project.$collection.$.ts
              </code>
              .
            </li>
            <li>
              <strong>Apidog tokens:</strong> stored only on the server in the{" "}
              <code className="font-mono text-xs">collections</code> table; the UI only sees
              an "is configured" flag and never the token itself.
            </li>
            <li>
              <strong>Spec files:</strong> persisted in the private{" "}
              <code className="font-mono text-xs">specs</code> storage bucket and served
              through the public route above.
            </li>
          </ul>
        </Section>

        <div className="mt-12 rounded-lg border bg-muted/40 p-5 text-sm text-muted-foreground">
          Ready to try it?{" "}
          <Link to="/projects" className="font-medium text-foreground underline underline-offset-2">
            Open your projects →
          </Link>
        </div>
      </main>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="flex items-center gap-2 font-serif text-2xl">
        <Icon className="h-5 w-5 text-muted-foreground" />
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

function ApiRow({ method, path, doc }: { method: string; path: string; doc?: string }) {
  return (
    <Card className="mt-3">
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center gap-2 font-mono text-sm font-normal">
          <Badge variant="outline" className="font-mono text-[10px]">
            {method}
          </Badge>
          <code className="break-all text-foreground">{path}</code>
        </CardTitle>
      </CardHeader>
      {doc && (
        <CardContent className="pb-3 pt-0">
          <a
            href={doc}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Apidog docs ↗
          </a>
        </CardContent>
      )}
    </Card>
  );
}
