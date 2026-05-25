import { Link } from "@tanstack/react-router";

export function Logo({ to = "/" as const, small = false }: { to?: string; small?: boolean }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2 text-foreground">
      <span
        className="grid place-items-center bg-foreground text-background font-mono font-bold"
        style={{
          width: small ? 22 : 28,
          height: small ? 22 : 28,
          borderRadius: 4,
          fontSize: small ? 11 : 13,
        }}
      >
        SB
      </span>
      <span className={`font-serif tracking-tight ${small ? "text-base" : "text-lg"}`}>
        SpecBridge
      </span>
    </Link>
  );
}
