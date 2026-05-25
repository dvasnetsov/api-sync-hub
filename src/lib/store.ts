import { useSyncExternalStore } from "react";

type State = {
  authed: boolean;
  user: { name: string; email: string } | null;
  onboarded: boolean;
};

const initial: State = {
  authed: false,
  user: null,
  onboarded: false,
};

let state: State = initial;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const store = {
  get: () => state,
  login: (email: string) => {
    state = { ...state, authed: true, user: { name: email.split("@")[0] || "you", email } };
    emit();
  },
  logout: () => {
    state = { ...state, authed: false, user: null };
    emit();
  },
  completeOnboarding: () => {
    state = { ...state, onboarded: true };
    emit();
  },
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export const useStore = <T,>(selector: (s: State) => T): T =>
  useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => selector(state),
    () => selector(initial),
  );
