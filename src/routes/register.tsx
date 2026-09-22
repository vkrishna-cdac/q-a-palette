import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { register, me } from "@/server/functions/auth";

export const Route = createFileRoute("/register")({
  beforeLoad: async () => {
    const user = await me();
    if (user) throw redirect({ to: "/" });
  },
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await register({ data: { email, password } });
      await navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex size-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileSpreadsheet className="size-6" />
          </span>
          <h1 className="mt-4 text-lg font-semibold">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Q&amp;A Review Console</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-1 text-xs text-muted-foreground">At least 8 characters.</p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40"
          >
            {isSubmitting ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <a href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
