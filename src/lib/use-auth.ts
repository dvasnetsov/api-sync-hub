import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AuthState = {
  loading: boolean;
  user: User | null;
  session: Session | null;
};

let cached: AuthState = { loading: true, user: null, session: null };
const listeners = new Set<(s: AuthState) => void>();
let initialized = false;

function init() {
  if (initialized) return;
  initialized = true;
  supabase.auth
    .getSession()
    .then(({ data }) => {
      cached = { loading: false, user: data.session?.user ?? null, session: data.session };
      listeners.forEach((l) => l(cached));
    })
    .catch((error) => {
      console.error("[auth] Failed to read Supabase session", error);
      cached = { loading: false, user: null, session: null };
      listeners.forEach((l) => l(cached));
    });
  supabase.auth.onAuthStateChange((_e, session) => {
    cached = { loading: false, user: session?.user ?? null, session };
    listeners.forEach((l) => l(cached));
  });
}

export function useAuth(): AuthState {
  const [s, setS] = useState<AuthState>(cached);
  useEffect(() => {
    init();
    setS(cached);
    const l = (n: AuthState) => setS(n);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return s;
}

export async function signOut() {
  await supabase.auth.signOut();
}
