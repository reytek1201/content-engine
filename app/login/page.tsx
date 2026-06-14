"use client";

import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function LoginForm() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/campaigns";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [forgotSending, setForgotSending] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.replace(nextPath.startsWith("/") ? nextPath : "/campaigns");
      }
    });
  }, [supabase, router, nextPath]);

  async function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setAuthError(signInError.message);
      setAuthSubmitting(false);
      return;
    }

    router.replace(nextPath.startsWith("/") ? nextPath : "/campaigns");
    router.refresh();
    setAuthSubmitting(false);
  }

  async function handleSignUp() {
    setAuthError(null);
    setAuthSubmitting(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setAuthError(signUpError.message);
    } else {
      setAuthError("Check your email to confirm your account, then sign in.");
    }

    setAuthSubmitting(false);
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setAuthError("Enter your email above, then tap Forgot password.");
      return;
    }

    setAuthError(null);
    setForgotMessage(null);
    setForgotSending(true);

    const redirectTo = `${window.location.origin}/login${
      nextPath !== "/campaigns"
        ? `?next=${encodeURIComponent(nextPath)}`
        : ""
    }`;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo }
    );

    if (resetError) {
      setAuthError(resetError.message);
    } else {
      setForgotMessage("Check your email for a password reset link.");
    }

    setForgotSending(false);
  }

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="page-shell flex items-center justify-between py-5 md:py-6">
        <Link
          href="/"
          className="flex items-center gap-2 transition hover:opacity-90"
        >
          <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
          <span className="text-sm font-semibold tracking-tight">SlidePress</span>
        </Link>
      </header>

      <main className="page-main flex min-h-[calc(100vh-4rem)] flex-col">
        <div className="page-content flex flex-1 flex-col justify-center">
          <header className="mb-8 text-center md:mb-10">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Sign in to SlidePress
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Create carousel campaigns with AI slide copy, images, and captions.
            </p>
          </header>

          <section className="rounded-2xl border border-border bg-card/60 p-6 sm:p-8">
            <form className="space-y-4" onSubmit={handleSignIn}>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-secondary-foreground"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  disabled={authSubmitting}
                  className="field-input mt-2"
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-secondary-foreground"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={6}
                  disabled={authSubmitting}
                  className="field-input mt-2"
                />
              </div>
              {authError && (
                <p className="text-sm text-red-300" role="alert">
                  {authError}
                </p>
              )}
              {forgotMessage && (
                <p className="text-sm text-primary">{forgotMessage}</p>
              )}
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={authSubmitting}
                  className="btn-primary flex-1"
                >
                  Sign in
                </button>
                <button
                  type="button"
                  disabled={authSubmitting}
                  onClick={handleSignUp}
                  className="btn-secondary flex-1"
                >
                  Sign up
                </button>
              </div>
              <button
                type="button"
                disabled={authSubmitting || forgotSending}
                onClick={() => void handleForgotPassword()}
                className="text-sm font-medium text-primary underline-offset-2 hover:underline disabled:opacity-60"
              >
                {forgotSending ? "Sending reset email…" : "Forgot password?"}
              </button>
            </form>
          </section>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link
              href="/"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Back to home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center bg-background text-muted-foreground">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
