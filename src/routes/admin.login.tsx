import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { BrandMark } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";

const credentialsSchema = z.object({
  email: z.string().trim().email({ message: "Enter a valid email address" }).max(255),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }).max(72),
});

export const Route = createFileRoute("/admin/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Team Login — NK CleanCo Admin" },
      { name: "description", content: "NK CleanCo staff sign-in for managing bookings." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setBusy(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setBusy(false);

    if (error) {
      toast.error(
        error.message === "Invalid login credentials"
          ? "Email or password is incorrect."
          : error.message,
      );
      return;
    }

    toast.success("Welcome back");
    navigate({ to: "/admin/dashboard" });
  };


  return (
    <div className="flex min-h-screen flex-col bg-gradient-hero">
      <div className="section-shell flex h-16 items-center justify-between">
        <Link to="/">
          <BrandMark />
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-smooth hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Back to site
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="animate-fade-up w-full max-w-md rounded-3xl border border-border bg-card p-7 shadow-lifted sm:p-9">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
            <ShieldCheck className="size-5 text-primary-foreground" />
          </span>
          <h1 className="mt-5 text-2xl font-extrabold">Team login</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to manage bookings and assign cleaners.
          </p>


          <form onSubmit={submit} className="mt-7 space-y-4">
            <div>
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="size-4 text-primary" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@nkcleanco.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 h-12"
              />
              {errors["email"] && (
                <p className="mt-1.5 text-xs font-semibold text-destructive">{errors["email"]}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="size-4 text-primary" />
                Password
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 h-12"
              />
              {errors["password"] && (
                <p className="mt-1.5 text-xs font-semibold text-destructive">{errors["password"]}</p>
              )}
            </div>

            <Button type="submit" variant="hero" size="xl" className="w-full" disabled={busy}>
              {busy && <Loader2 className="size-5 animate-spin" />}
              Sign in
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Accounts are created by an existing NK CleanCo admin.
          </p>

              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
