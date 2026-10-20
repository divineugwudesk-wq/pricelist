"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export default function ForgotPasswordPage() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Something went wrong", "Please try again.");
        return;
      }
      const data = await res.json();
      setDone(true);
      if (data.devResetUrl) setDevLink(data.devResetUrl as string);
    } catch {
      toast.error("Something went wrong", "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we'll send you a reset link."
      footer={
        <>
          Remember it?{" "}
          <Link href="/login" className="font-medium text-navy-700 hover:text-navy-900">
            Sign in
          </Link>
        </>
      }
    >
      {done ? (
        <div className="rounded-xl bg-neutral-50 p-5 text-center">
          <p className="text-body font-medium text-ink">
            If an account exists for <span className="font-semibold">{email}</span>, a
            reset link is on its way.
          </p>
          {devLink && (
            <div className="mt-4 rounded-xl border border-dashed border-neutral-300 bg-white p-3">
              <p className="mb-2 text-micro font-medium uppercase tracking-wider text-ink-muted">
                Development mode — no email server configured
              </p>
              <Link
                href={devLink}
                className="break-all text-caption font-medium text-navy-700 underline hover:text-navy-900"
              >
                Open reset link
              </Link>
            </div>
          )}
          <Button variant="outline" className="mt-5" onClick={() => { setDone(false); setDevLink(null); }}>
            Use a different email
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Button type="submit" loading={loading} className="w-full" size="lg">
            Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
