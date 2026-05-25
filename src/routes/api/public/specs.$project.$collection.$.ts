import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/specs/$project/$collection/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const project = params.project;
        const collection = params.collection;
        const tail = (params as { _splat?: string })._splat ?? "";
        const specMatch = tail.match(/^openapi\.(json|ya?ml)$/i);
        const bundleMatch = /^bundle\.md$/i.test(tail);
        let storagePath: string;
        let contentType: string;
        if (specMatch) {
          const ext = specMatch[1].toLowerCase() === "json" ? "json" : "yaml";
          storagePath = `${project}/${collection}/openapi.${ext}`;
          contentType =
            ext === "yaml"
              ? "application/yaml; charset=utf-8"
              : "application/json; charset=utf-8";
        } else if (bundleMatch) {
          storagePath = `${project}/${collection}/bundle.md`;
          contentType = "text/markdown; charset=utf-8";
        } else {
          return new Response("Not found", { status: 404 });
        }
        const { data, error } = await supabaseAdmin.storage.from("specs").download(storagePath);
        if (error || !data) {
          return new Response("File not found. Pull or upload this collection first.", {
            status: 404,
            headers: { "content-type": "text/plain; charset=utf-8" },
          });
        }
        const buf = await data.arrayBuffer();
        return new Response(buf, {
          status: 200,
          headers: {
            "content-type": contentType,
            "cache-control": "public, max-age=30",
            "access-control-allow-origin": "*",
          },
        });
      },
      OPTIONS: async () => {
        return new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "GET, OPTIONS",
            "access-control-allow-headers": "*",
          },
        });
      },
    },
  },
});
