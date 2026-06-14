"use client";

import CreateCampaignForm from "@/app/components/create-campaign-form";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

export default function Home() {
  const supabase = createClient();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [forgotSending, setForgotSending] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (authLoading || !user) {
      return;
    }

    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (isMobile) {
      router.replace("/campaigns");
    }
  }, [authLoading, user, router]);

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
    }

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

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: `${window.location.origin}/` }
    );

    if (resetError) {
      setAuthError(resetError.message);
    } else {
      setForgotMessage("Check your email for a password reset link.");
    }

    setForgotSending(false);
  }

  if (authLoading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-background text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (user) {
    return (
      <>
        <div className="flex min-h-full items-center justify-center bg-background text-muted-foreground md:hidden">
          Loading...
        </div>

        <div className="hidden min-h-full bg-background text-foreground md:block">
          <main className="page-main flex min-h-full flex-col">
            <div className="page-content">
              <header className="mb-12">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                <p className="brand-kicker">SlidePress</p>
              </div>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
                Generate your next campaign
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                Enter a marketing topic or pain point. We&apos;ll draft slide
                scripts with overlays, voiceover, and image prompts.
              </p>
            </header>

            <CreateCampaignForm user={user} idPrefix="page-" />
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-full bg-background text-foreground">
      <main className="page-main flex min-h-full flex-col">
        <div className="page-content">
          <header className="mb-12">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            <p className="brand-kicker">SlidePress</p>
          </div>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
            Generate your next campaign
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Enter a marketing topic or pain point. We&apos;ll draft slide
            scripts with overlays, voiceover, and image prompts.
          </p>
        </header>

        <section className="rounded-2xl border border-border bg-card/60 p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-foreground">Sign in</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Use the test account you created in Supabase, or sign up with
            email.
          </p>
          <form className="mt-6 space-y-4" onSubmit={handleSignIn}>
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
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:opacity-60"
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
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:opacity-60"
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
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-border px-5 py-3 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 disabled:opacity-60"
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
        </div>
      </main>
    </div>
  );
}
