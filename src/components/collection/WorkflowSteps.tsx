import { ArrowDownToLine, Globe2, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    id: "pull",
    title: "Pull from Apidog",
    body: "Managers enrich the spec, examples and markdown docs inside Apidog. SpecBridge pulls the enriched version.",
    icon: ArrowDownToLine,
  },
  {
    id: "publish",
    title: "Publish via URL",
    body: "SpecBridge serves the spec at a permanent public URL — share it with consumers, MCP tools or docs portals.",
    icon: Globe2,
  },
  {
    id: "push",
    title: "Push to destinations",
    body: "Push the same spec back into Apidog public projects (more destinations like Postman, Stoplight and GitHub coming).",
    icon: Send,
  },
] as const;

export function WorkflowSteps({ active }: { active?: "pull" | "publish" | "push" }) {
  return (
    <Card className="grid gap-px overflow-hidden bg-border md:grid-cols-3">
      {STEPS.map((step, idx) => {
        const Icon = step.icon;
        const isActive = active === step.id;
        return (
          <div
            key={step.id}
            className={cn(
              "bg-card p-5 transition-colors",
              isActive && "bg-muted/40",
            )}
          >
            <div className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-full border bg-background font-mono text-[11px] text-muted-foreground">
                {idx + 1}
              </span>
              <Icon className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-serif text-base">{step.title}</h3>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
          </div>
        );
      })}
    </Card>
  );
}
