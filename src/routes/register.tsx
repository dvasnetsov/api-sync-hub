import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/register")({
  component: Register,
});

function Register() {
  return <Navigate to="/login" />;
}
