import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { store } from "@/lib/store";
import { Check, KeyRound, Workflow, Globe } from "lucide-react";

const steps = [
  {
    icon: <Workflow className="h-5 w-5" />,
    chip: "Step 01",
    title: "Find your Apidog Project ID",
    body:
      "In Apidog, open your project → Settings → Basic Settings. The Project ID is at the top — a 6–7 digit number. Copy it.",
    visual: <ApidogProjectIdMock />,
  },
  {
    icon: <KeyRound className="h-5 w-5" />,
    chip: "Step 02",
    title: "Generate an API access token",
    body:
      "Click your avatar → Account Settings → API Access Token. Create a new token, scoped read-only if possible. We encrypt it with AES-256-GCM.",
    visual: <ApidogTokenMock />,
  },
  {
    icon: <Globe className="h-5 w-5" />,
    chip: "Step 03",
    title: "Get a permanent URL",
    body:
      "Create a project, add a collection, paste the IDs, hit Sync. The URL stays stable — only the content updates.",
    visual: <UrlMock />,
  },
];

export function OnboardingWizard({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [i, setI] = useState(0);
  const step = steps[i];
  const last = i === steps.length - 1;

  const close = () => {
    store.completeOnboarding();
    onClose();
    setTimeout(() => setI(0), 200);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
        <div className="grid md:grid-cols-2">
          <div className="border-b border-border bg-card p-6 md:border-b-0 md:border-r">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              {step.chip} of {steps.length.toString().padStart(2, "0")}
            </p>
            <DialogHeader className="mt-3 space-y-2 text-left">
              <DialogTitle className="font-serif text-2xl">{step.title}</DialogTitle>
              <DialogDescription className="text-sm leading-relaxed">
                {step.body}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 flex gap-1.5">
              {steps.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1 flex-1 rounded-full ${
                    idx <= i ? "bg-foreground" : "bg-border"
                  }`}
                />
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setI((v) => Math.max(0, v - 1))}
                disabled={i === 0}
              >
                Back
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={close}>
                  Skip
                </Button>
                <Button
                  size="sm"
                  onClick={() => (last ? close() : setI(i + 1))}
                >
                  {last ? (
                    <>
                      <Check className="mr-1 h-4 w-4" /> Done
                    </>
                  ) : (
                    "Next"
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-muted p-6">
            <div className="flex h-full items-center justify-center">{step.visual}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ApidogProjectIdMock() {
  return (
    <div className="w-full max-w-xs rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Apidog · Settings
        </span>
      </div>
      <div className="space-y-3 p-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Project Name
          </p>
          <p className="mt-0.5 text-sm">Acme Platform</p>
        </div>
        <div className="rounded-md border-2 border-dashed border-foreground p-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-foreground">
            Project ID ←
          </p>
          <p className="mt-0.5 font-mono text-sm">
            <span className="bg-warning/40 px-0.5">623481</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function ApidogTokenMock() {
  return (
    <div className="w-full max-w-xs rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Apidog · API Access
        </span>
      </div>
      <div className="space-y-3 p-4">
        <div className="rounded-md border-2 border-dashed border-foreground p-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-foreground">
            Personal Token ←
          </p>
          <p className="mt-0.5 break-all font-mono text-xs">
            <span className="bg-warning/40 px-0.5">apd_live_8af2…3f9a</span>
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Read-only scope is enough — we only call <code className="font-mono">/export-openapi</code>.
        </p>
      </div>
    </div>
  );
}

function UrlMock() {
  return (
    <div className="w-full max-w-xs rounded-lg border border-border bg-card p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Your permanent URL
      </p>
      <p className="mt-2 break-all font-mono text-xs leading-relaxed">
        https://specs.specbridge.dev/specs/<span className="bg-warning/40 px-0.5">your-project</span>/admin-api/openapi.json
      </p>
      <div className="mt-4 flex items-center justify-between border-t border-dashed border-border pt-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[oklch(0.45_0.14_155)]">
          ● Live
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">never changes</span>
      </div>
    </div>
  );
}
