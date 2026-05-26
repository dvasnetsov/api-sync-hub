import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { lovable } from "@/integrations/lovable";
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
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/projects",
    });
    if (result.redirected) return;
    if (result.error) {
      toast.error("Google sign-in failed: " + result.error.message);
      setBusy(false);
      return;
    }
    window.location.href = "/projects";
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-xl border border-border bg-card p-8">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Вход в рабочее пространство
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Доступ по приглашению. Войдите через Google.
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
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Нет доступа? Попросите администратора отправить приглашение.
        </p>
      </div>
    </div>
  );
}
