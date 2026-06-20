"use client";

import { createClient } from "@/utils/supabase/client";
import BrandLogo from "@/app/components/brand-logo";
import { useIsNativeApp } from "@/app/hooks/use-is-native-app";
import { useIsIosNative } from "@/app/hooks/use-is-ios-native";
import { brandLogoSrc } from "@/utils/site-metadata";
import { isNativeAppRuntime } from "@/utils/is-native-app";
import { isNativeOAuthInProgress } from "@/utils/native-oauth-in-progress";
import { buildNativeOAuthRedirectUrl } from "@/utils/native-oauth";
import { legalPageHref } from "@/utils/legal-back-target";
import {
  buildWebOAuthRedirectUrl,
  startNativeProviderAuth,
} from "@/utils/native-auth-flow";
import { startNativeAppleAuth } from "@/utils/native-apple-auth";
import {
  completeNativeOAuthNavigation,
  navigateAfterAuth,
} from "@/utils/native-oauth-session";
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_REQUIREMENTS_TEXT,
  validateSignUpPassword,
} from "@/utils/password-validation";
import { Capacitor } from "@capacitor/core";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

type AuthTab = "signin" | "signup";

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

function AppleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M17.05 20.28c-.98.95-2.05 1.88-3.71 1.9-1.6.02-2.11-.93-3.94-.93-1.83 0-2.4.9-3.92.95-1.57.06-2.77-1.56-3.75-2.5C1.1 16.54 0 13.5 1.36 10.9c.95-1.84 2.66-3 4.52-3.03 1.58-.03 3.07 1.05 3.94 1.05.87 0 2.81-1.3 4.74-1.11.81.03 3.08.33 4.54 2.48-3.8 2.07-3.18 7.46.95 9.99ZM12.03 3.5c.27-2.03 1.77-3.38 3.32-3.55.2 2.15-1.88 4.2-3.32 4.49Z"
      />
    </svg>
  );
}

async function persistNativeSession(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await fetch("/api/auth/native-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
      }),
    });
  } catch {
    // Non-fatal — the waitForServerSession poll will handle it.
  }
}

function LoginForm() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/campaigns";

  function resolveNextPath(): string {
    return nextPath.startsWith("/") && !nextPath.startsWith("//")
      ? nextPath
      : "/campaigns";
  }

  const [tab, setTab] = useState<AuthTab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [appleSubmitting, setAppleSubmitting] = useState(false);
  const [forgotSending, setForgotSending] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const isNativeApp = useIsNativeApp();
  const isIosNative = useIsIosNative();

  const hasNavigated = useRef(false);
  const signUpInProgress = useRef(false);
  const errorRef = useRef<HTMLParagraphElement | null>(null);

  function authNavigate(path: string) {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    navigateAfterAuth(path, (target) => {
      router.replace(target);
      router.refresh();
    });
  }

  function clearMessages() {
    setAuthError(null);
    setAuthMessage(null);
    setForgotMessage(null);
  }

  function switchTab(next: AuthTab) {
    clearMessages();
    setTab(next);
  }

  function showError(msg: string) {
    setAuthError(msg);
    requestAnimationFrame(() => {
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  useEffect(() => {
    let active = true;
    hasNavigated.current = false;

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!active || !user) return;

      // On native, skip auto-redirect if OAuth is in progress (NativeAuthListener
      // owns navigation). Also verify the server sees the session before
      // navigating, to avoid the /campaigns → /login loop when cookies haven't
      // propagated yet.
      if (isNativeAppRuntime()) {
        if (isNativeOAuthInProgress()) return;

        try {
          const res = await fetch("/api/auth/check", {
            credentials: "include",
            cache: "no-store",
          });
          if (!res.ok) return;
          const data = (await res.json()) as { authenticated?: boolean };
          if (!data.authenticated) return;
        } catch {
          return;
        }
      }

      authNavigate(resolveNextPath());
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // TOKEN_REFRESHED fires on existing sessions and causes a spurious
      // redirect when the user is already navigating away. Only act on
      // an explicit new sign-in. On native, OAuth navigation is handled by
      // NativeAuthListener / explicit authNavigate after password sign-in.
      // Skip if sign-up is in flight — handleSignUp owns navigation
      // and the SIGNED_IN event fires even when email confirmation is
      // required, which would cause a blank-page redirect.
      if (
        session?.user &&
        event === "SIGNED_IN" &&
        !isNativeAppRuntime() &&
        !signUpInProgress.current
      ) {
        authNavigate(resolveNextPath());
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase, router, nextPath]);

  useEffect(() => {
    if (searchParams.get("error") === "auth_callback_error") {
      setAuthError("Sign-in was cancelled or failed. Try again.");
      return;
    }

    if (searchParams.get("reason") === "session_expired") {
      setAuthError(
        "Your session expired. Sign in again to continue — your data is safe.",
      );
    }
  }, [searchParams]);

  async function handleProviderSignIn(provider: "google" | "apple") {
    clearMessages();

    if (provider === "google") {
      setGoogleSubmitting(true);
    } else {
      setAppleSubmitting(true);
    }

    const next = resolveNextPath();

    try {
      if (isNativeAppRuntime()) {
        const { error } = await startNativeProviderAuth(provider, next);
        if (error) setAuthError(error);
        return;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: buildWebOAuthRedirectUrl(next),
          ...(provider === "apple" ? { scopes: "name email" } : {}),
        },
      });

      if (error) setAuthError(error.message);
    } finally {
      if (provider === "google") {
        setGoogleSubmitting(false);
      } else {
        setAppleSubmitting(false);
      }
    }
  }

  async function handleAppleSignIn() {
    clearMessages();
    setAppleSubmitting(true);

    const next = resolveNextPath();

    try {
      if (isIosNative) {
        const { error } = await startNativeAppleAuth();

        if (error) {
          setAuthError(error);
          return;
        }

        await completeNativeOAuthNavigation(next, authNavigate);
        return;
      }

      await handleProviderSignIn("apple");
    } finally {
      setAppleSubmitting(false);
    }
  }

  async function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();
    setAuthSubmitting(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      showError(signInError.message);
      setAuthSubmitting(false);
      return;
    }

    // On native, propagate the session to the server so the next SSR render
    // sees the auth cookie (avoids the blank-page issue after email sign-in).
    if (data.session) {
      await persistNativeSession(
        data.session.access_token,
        data.session.refresh_token,
      );
    }

    authNavigate(resolveNextPath());
    setAuthSubmitting(false);
  }

  async function handleSignUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();

    const passwordError = validateSignUpPassword(password);
    if (passwordError) {
      showError(passwordError);
      return;
    }

    signUpInProgress.current = true;
    setAuthSubmitting(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      showError(signUpError.message);
      setAuthSubmitting(false);
      signUpInProgress.current = false;
      return;
    }

    if (data.session) {
      // Email confirmation is disabled — session is immediately available.
      // Persist server session on native before navigating.
      await persistNativeSession(
        data.session.access_token,
        data.session.refresh_token,
      );
      signUpInProgress.current = false;
      authNavigate(resolveNextPath());
      setAuthSubmitting(false);
      return;
    }

    if (data.user?.identities?.length === 0) {
      setAuthMessage(
        "An account with this email already exists. Sign in instead.",
      );
      setAuthSubmitting(false);
      signUpInProgress.current = false;
      return;
    }

    // Email confirmation required — do NOT navigate. Show message and wait.
    setAuthMessage("Check your email to confirm your account, then sign in.");
    setAuthSubmitting(false);
    signUpInProgress.current = false;
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      showError("Enter your email above, then tap Forgot password.");
      return;
    }

    clearMessages();
    setForgotSending(true);

    const redirectTo = isNativeAppRuntime()
      ? buildNativeOAuthRedirectUrl("/settings/account?reset=1")
      : `${window.location.origin}/settings/account?reset=1`;

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

  const authBusy = authSubmitting || googleSubmitting || appleSubmitting;

  const tabBtnClass = (active: boolean) =>
    active
      ? "flex-1 rounded-lg bg-gradient-to-r from-primary to-ring py-2 text-sm font-semibold text-primary-foreground shadow transition active:scale-[0.97] active:opacity-80"
      : "flex-1 rounded-lg py-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground active:scale-[0.97]";

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="page-shell page-header-safe hidden items-center justify-between md:flex">
        <BrandLogo href={isNativeApp ? "/login" : "/"} />
      </header>

      <main className="page-main flex min-h-dvh flex-col max-md:pt-[calc(env(safe-area-inset-top,0px)+2rem)] md:min-h-[calc(100vh-4rem)]">
        <div className="page-content flex flex-1 flex-col justify-center">
          <header className="mb-8 text-center md:mb-10">
            <div className="mb-3 flex items-center justify-center gap-3 md:hidden">
              <Image
                src={brandLogoSrc}
                alt="SlidePress"
                width={36}
                height={36}
                className="h-9 w-9 shrink-0 object-contain"
                priority
              />
              <h1 className="text-left text-2xl font-semibold tracking-tight text-foreground">
                {tab === "signin" ? "Sign in to SlidePress" : "Create your account"}
              </h1>
            </div>
            <h1 className="hidden text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:block">
              {tab === "signin" ? "Sign in to SlidePress" : "Create your account"}
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Create carousel campaigns with AI slides, captions, narration, and video.
            </p>
          </header>

          <section className="rounded-2xl border border-border bg-card/60 p-6 sm:p-8">
            {/* Tab switcher */}
            <div className="mb-6 flex gap-1 rounded-xl bg-secondary/40 p-1">
              <button
                type="button"
                onClick={() => switchTab("signin")}
                disabled={authBusy}
                aria-selected={tab === "signin"}
                className={tabBtnClass(tab === "signin")}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => switchTab("signup")}
                disabled={authBusy}
                aria-selected={tab === "signup"}
                className={tabBtnClass(tab === "signup")}
              >
                Create account
              </button>
            </div>

            {/* Social buttons */}
            <div className="space-y-3">
              <button
                type="button"
                disabled={authBusy}
                onClick={() => void handleProviderSignIn("google")}
                className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground transition hover:border-ring/60 hover:bg-secondary/40 active:scale-[0.97] active:bg-secondary/60 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <GoogleIcon />
                {googleSubmitting
                  ? "Redirecting…"
                  : tab === "signin"
                    ? "Continue with Google"
                    : "Sign up with Google"}
              </button>

              {isIosNative ? (
                <button
                  type="button"
                  disabled={authBusy}
                  onClick={() => void handleAppleSignIn()}
                  className="inline-flex w-full items-center justify-center gap-3 rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background transition hover:opacity-90 active:scale-[0.97] active:opacity-75 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <AppleIcon />
                  {appleSubmitting
                    ? "Redirecting…"
                    : tab === "signin"
                      ? "Continue with Apple"
                      : "Sign up with Apple"}
                </button>
              ) : null}
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center" aria-hidden>
                <div className="w-full border-t border-border" />
              </div>
              <p className="relative mx-auto w-fit bg-card/60 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                or use email
              </p>
            </div>

            {/* Sign In form */}
            {tab === "signin" && (
              <form className="space-y-4" onSubmit={handleSignIn}>
                <div>
                  <label
                    htmlFor="signin-email"
                    className="block text-sm font-medium text-secondary-foreground"
                  >
                    Email
                  </label>
                  <input
                    id="signin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={authBusy}
                    autoComplete="email"
                    className="field-input mt-2"
                  />
                </div>
                <div>
                  <label
                    htmlFor="signin-password"
                    className="block text-sm font-medium text-secondary-foreground"
                  >
                    Password
                  </label>
                  <div className="relative mt-2">
                    <input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={authBusy}
                      autoComplete="current-password"
                      className="field-input pr-16"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      disabled={authBusy}
                      aria-pressed={showPassword}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-0 px-3 text-sm font-medium text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
                {authError && (
                  <p ref={errorRef} className="text-sm text-red-300" role="alert">
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
                <button
                  type="submit"
                  disabled={authBusy}
                  className="btn-primary-full"
                >
                  {authSubmitting ? "Signing in…" : "Sign in"}
                </button>
                <button
                  type="button"
                  disabled={authBusy || forgotSending}
                  onClick={() => void handleForgotPassword()}
                  className="text-sm font-medium text-primary underline-offset-2 hover:underline disabled:opacity-60"
                >
                  {forgotSending ? "Sending reset email…" : "Forgot password?"}
                </button>
              </form>
            )}

            {/* Sign Up form */}
            {tab === "signup" && (
              <form className="space-y-4" onSubmit={handleSignUp}>
                <div>
                  <label
                    htmlFor="signup-email"
                    className="block text-sm font-medium text-secondary-foreground"
                  >
                    Email
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={authBusy}
                    autoComplete="email"
                    className="field-input mt-2"
                  />
                </div>
                <div>
                  <label
                    htmlFor="signup-password"
                    className="block text-sm font-medium text-secondary-foreground"
                  >
                    Password
                  </label>
                  <div className="relative mt-2">
                    <input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={PASSWORD_MIN_LENGTH}
                      disabled={authBusy}
                      autoComplete="new-password"
                      className="field-input pr-16"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      disabled={authBusy}
                      aria-pressed={showPassword}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-0 px-3 text-sm font-medium text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {PASSWORD_REQUIREMENTS_TEXT}
                  </p>
                </div>
                {authError && (
                  <p ref={errorRef} className="text-sm text-red-300" role="alert">
                    {authError}
                  </p>
                )}
                {authMessage && (
                  <p className="text-sm text-primary" role="status">
                    {authMessage}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={authBusy}
                  className="btn-primary-full"
                >
                  {authSubmitting ? "Creating account…" : "Create account"}
                </button>
              </form>
            )}
          </section>

          {isNativeApp === false ? (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link
                href="/"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Back to home
              </Link>
            </p>
          ) : null}

          <p className="mt-8 text-center text-xs leading-5 text-muted-foreground">
            <Link
              href={legalPageHref("/privacy", "login")}
              className="underline-offset-2 hover:underline"
            >
              Privacy
            </Link>
            {" · "}
            <Link
              href={legalPageHref("/terms", "login")}
              className="underline-offset-2 hover:underline"
            >
              Terms
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
