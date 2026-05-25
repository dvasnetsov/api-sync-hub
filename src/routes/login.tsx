import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — SpecBridge" },
      { name: "description", content: "Sign in to your SpecBridge workspace." },
    ],
  }),
  component: Login,
});

function Login() {
  const [busy, setBusy] = useState(false);

  const google = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/projects",
      },
    });
    if (error) {
      toast.error("Google sign-in failed: " + error.message);
      setBusy(false);
    }
    // On success Supabase redirects automatically — no need to setBusy(false)
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <aside className="relative hidden flex-col justify-between border-r border-border bg-card p-10 md:flex">
        <Logo />
        <div className="max-w-md">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Field notebook · vol. 01
          </p>
          <h1 className="mt-5 font-serif text-5xl leading-[1.05] text-foreground">
            "Localhost links don't{" "}
            <span className="bg-warning/40 px-0.5">survive</span> the night.
            Specs should."
          </h1>
          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
            Every OpenAPI spec you publish through SpecBridge gets a permanent address.
          </p>
        </div>
        <p className="font-mono text-[11px] text-muted-foreground">/journal/ — entry #001</p>
      </aside>

      <main className="flex flex-col bg-background">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 md:hidden">
          <Logo small />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Sign in
            </p>
            <h2 className="mt-2 font-serif text-4xl text-foreground">Welcome.</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Доступ к рабочему пространству — только по приглашению. Войдите аккаунтом Google.
            </p>

            <Button
              type="button"
              size="lg"
              className="mt-6 w-full"
              onClick={google}
              disabled={busy}
            >
              {busy ? "Redirecting…" : "Continue with Google"}
            </Button>

            <p className="mt-6 text-xs text-muted-foreground">
              Нет доступа? Попросите администратора отправить приглашение на ваш email.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
