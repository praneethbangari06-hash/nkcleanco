import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Lock, Phone, Sparkles } from "lucide-react";
import { useState } from "react";

import { BrandMark } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { storeWorkerToken } from "@/lib/worker-client";
import { workerLogin } from "@/lib/worker.functions";

export const Route = createFileRoute("/worker/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Worker Login — NK CleanCo" },
      { name: "description", content: "NK CleanCo cleaning staff sign-in to manage assigned jobs." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorkerLogin,
});

function WorkerLogin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      setError("Enter your 10-digit mobile number.");
      return;
    }
    if (password.length < 4) {
      setError("Enter your password.");
      return;
    }

    setBusy(true);
    try {
      const result = await workerLogin({ data: { phone: phone.trim(), password } });
      storeWorkerToken(result.token);
      navigate({ to: "/worker/dashboard", replace: true });
    } catch {
      setError("Phone number or password is incorrect.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-hero">
      <div className="flex h-16 items-center justify-between px-4">
        <Link to="/">
          <BrandMark />
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-smooth hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="animate-fade-up w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-lifted sm:p-9">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
            <Sparkles className="size-5 text-primary-foreground" />
          </span>
          <h1 className="mt-5 text-2xl font-extrabold">Worker login</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with the phone number and password your supervisor gave you.
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <div>
              <Label htmlFor="phone" className="flex items-center gap-2 text-base">
                <Phone className="size-4 text-primary" />
                Phone number
              </Label>
              <Input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="mt-1.5 h-14 text-lg"
              />
            </div>

            <div>
              <Label htmlFor="password" className="flex items-center gap-2 text-base">
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
                className="mt-1.5 h-14 text-lg"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm font-semibold text-destructive"
              >
                {error}
              </p>
            )}

            <Button type="submit" variant="hero" size="xl" className="h-14 w-full text-base" disabled={busy}>
              {busy && <Loader2 className="size-5 animate-spin" />}
              Login
            </Button>
          </form>

          <p className="mt-6 text-center text-xs font-semibold text-muted-foreground">
            New cleaners are added by the NK CleanCo office. Contact your supervisor for access.
          </p>
        </div>
      </div>
    </div>
  );
}
