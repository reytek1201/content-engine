"use client";

import { createClient } from "@/utils/supabase/client";
import BrandLogo from "@/app/components/brand-logo";
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_REQUIREMENTS_TEXT,
  validateSignUpPassword,
} from "@/utils/password-validation";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function GoogleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      aria-hidden
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function LoginForm() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/campaigns";

  function resolveNextPath(): string {
    return nextPath.startsWith("/") ? nextPath : "/campaigns";
  }

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [forgotSending, setForgotSending] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.replace(resolveNextPath());
      }
    });
  }, [supabase, router, nextPath]);

  useEffect(() => {
    if (searchParams.get("error") === "auth_callback_error") {
      setAuthError("Google sign-in was cancelled or failed. Try again.");
    }
  }, [searchParams]);

  async function handleGoogleSignIn() {
    setAuthError(null);
    setAuthMessage(null);
    setForgotMessage(null);
    setGoogleSubmitting(true);

    const callbackUrl = `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl,
      },
    });

    if (error) {
      setAuthError(error.message);
      setGoogleSubmitting(false);
    }
  }

  async function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError(null);
    setAuthMessage(null);
    setForgotMessage(null);
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

    router.replace(resolveNextPath());
    router.refresh();
    setAuthSubmitting(false);
  }

  async function handleSignUp() {
    setAuthError(null);
    setAuthMessage(null);
    setForgotMessage(null);

    const passwordError = validateSignUpPassword(password);
    if (passwordError) {
      setAuthError(passwordError);
      return;
    }

    setAuthSubmitting(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setAuthError(signUpError.message);
      setAuthSubmitting(false);
      return;
    }

    if (data.session) {
      router.replace(resolveNextPath());
      router.refresh();
      setAuthSubmitting(false);
      return;
    }

    if (data.user?.identities?.length === 0) {
      setAuthMessage(
        "An account with this email already exists. Sign in below.",
      );
      setAuthSubmitting(false);
      return;
    }

    setAuthMessage("Check your email to confirm your account, then sign in.");
    setAuthSubmitting(false);
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setAuthError("Enter your email above, then tap Forgot password.");
      return;
    }

    setAuthError(null);
    setAuthMessage(null);
    setForgotMessage(null);
    setForgotSending(true);

    const redirectTo = `${window.location.origin}/login${
      nextPath !== "/campaigns"
        ? `?next=${encodeURIComponent(nextPath)}`
        : ""
    }`;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo },
    );

    if (resetError) {
      setAuthError(resetError.message);
    } else {
      setForgotMessage("Check your email for a password reset link.");
    }

    setForgotSending(false);
  }

  const authBusy = authSubmitting || googleSubmitting;

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="page-shell page-header-safe flex items-center justify-between">
        <BrandLogo href="/" />
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
            <button
              type="button"
              disabled={authBusy}
              onClick={() => void handleGoogleSignIn()}
              className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground transition hover:border-ring/60 hover:bg-secondary/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <GoogleIcon />
              {googleSubmitting ? "Redirecting…" : "Continue with Google"}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center" aria-hidden>
                <div className="w-full border-t border-border" />
              </div>
              <p className="relative mx-auto w-fit bg-card/60 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                or use email
              </p>
            </div>

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
                  disabled={authBusy}
                  autoComplete="email"
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
                <div className="relative mt-2">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={PASSWORD_MIN_LENGTH}
                    disabled={authBusy}
                    autoComplete="current-password"
                    className="field-input pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    disabled={authBusy}
                    aria-pressed={showPassword}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 px-3 text-sm font-medium text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {PASSWORD_REQUIREMENTS_TEXT} Required for sign up.
                </p>
              </div>
              {authError && (
                <p className="text-sm text-red-300" role="alert">
                  {authError}
                </p>
              )}
              {authMessage && (
                <p className="text-sm text-primary" role="status">
                  {authMessage}
                </p>
              )}
              {forgotMessage && (
                <p className="text-sm text-primary">{forgotMessage}</p>
              )}
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={authBusy}
                  className="btn-primary flex-1"
                >
                  Sign in
                </button>
                <button
                  type="button"
                  disabled={authBusy}
                  onClick={handleSignUp}
                  className="btn-secondary flex-1"
                >
                  Sign up
                </button>
              </div>
              <button
                type="button"
                disabled={authBusy || forgotSending}
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
