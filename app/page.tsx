"use client";

import ReferenceUploadSlot from "@/app/components/reference-upload-slot";
import { createClient } from "@/utils/supabase/client";
import { uploadReferenceImage } from "@/utils/upload-reference";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import {
  DEFAULT_SLIDE_COUNT,
  getAllowedSlideCounts,
  type SlideCount,
} from "@/types/slides";

type AspectRatio = "4:5" | "9:16";

const SLIDE_COUNT_LABELS: Record<SlideCount, string> = {
  3: "Quick post",
  5: "Standard carousel",
  7: "Deep carousel",
};

interface GenerateTextSuccess {
  success: true;
  campaignId: string;
}

interface GenerateTextFailure {
  success: false;
  error: string;
  details?: unknown;
}

type GenerateTextResponse = GenerateTextSuccess | GenerateTextFailure;

export default function Home() {
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const [topic, setTopic] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("4:5");
  const [slideCount, setSlideCount] = useState<SlideCount>(DEFAULT_SLIDE_COUNT);
  const allowedSlideCounts = getAllowedSlideCounts(user?.id);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);

  const [productFile, setProductFile] = useState<File | null>(null);
  const [styleFile, setStyleFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [productPreview, setProductPreview] = useState<string | null>(null);
  const [stylePreview, setStylePreview] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  function handleReferenceSelect(
    type: "product" | "style" | "logo",
    file: File | null
  ) {
    const setFile =
      type === "product"
        ? setProductFile
        : type === "style"
          ? setStyleFile
          : setLogoFile;
    const setPreview =
      type === "product"
        ? setProductPreview
        : type === "style"
          ? setStylePreview
          : setLogoPreview;

    setFile(file);
    setPreview((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return file ? URL.createObjectURL(file) : null;
    });
  }

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

  async function handleSignOut() {
    await supabase.auth.signOut();
    setCampaignId(null);
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      return;
    }

    setError(null);
    setCampaignId(null);
    setIsLoading(true);

    try {
      const references: {
        product?: string;
        style?: string;
        logo?: string;
      } = {};

      if (productFile) {
        references.product = await uploadReferenceImage(
          supabase,
          productFile,
          user.id,
          "product"
        );
      }

      if (styleFile) {
        references.style = await uploadReferenceImage(
          supabase,
          styleFile,
          user.id,
          "style"
        );
      }

      if (logoFile) {
        references.logo = await uploadReferenceImage(
          supabase,
          logoFile,
          user.id,
          "logo"
        );
      }

      const response = await fetch("/api/generate-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          aspect_ratio: aspectRatio,
          slide_count: slideCount,
          references:
            Object.keys(references).length > 0 ? references : undefined,
        }),
      });

      const data = (await response.json()) as GenerateTextResponse;

      if (!response.ok || !data.success) {
        const failure = data as GenerateTextFailure;
        throw new Error(failure.error ?? "Generation failed");
      }

      setCampaignId(data.campaignId);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong"
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-zinc-950 text-zinc-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-full bg-zinc-950 text-zinc-50">
      <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-6 py-16 sm:px-10">
        <header className="mb-12">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
            Content Engine
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-50">
            Generate your next campaign
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-400">
            Enter a marketing topic or pain point. We&apos;ll draft slide
            scripts with overlays, voiceover, and image prompts.
          </p>
        </header>

        {!user ? (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-zinc-50">Sign in</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Use the test account you created in Supabase, or sign up with
              email.
            </p>
            <form className="mt-6 space-y-4" onSubmit={handleSignIn}>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-zinc-300"
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
                  className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-50 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-700 disabled:opacity-60"
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-zinc-300"
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
                  className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-50 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-700 disabled:opacity-60"
                />
              </div>
              {authError && (
                <p className="text-sm text-red-300" role="alert">
                  {authError}
                </p>
              )}
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={authSubmitting}
                  className="inline-flex flex-1 items-center justify-center rounded-xl bg-zinc-50 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-60"
                >
                  Sign in
                </button>
                <button
                  type="button"
                  disabled={authSubmitting}
                  onClick={handleSignUp}
                  className="inline-flex flex-1 items-center justify-center rounded-xl border border-zinc-600 px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:border-zinc-400 disabled:opacity-60"
                >
                  Sign up
                </button>
              </div>
            </form>
          </section>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-sm text-zinc-400">
              <span>{user.email}</span>
              <div className="flex items-center gap-4">
                <Link
                  href="/campaigns"
                  className="font-medium text-zinc-200 transition hover:text-zinc-50"
                >
                  My campaigns
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="font-medium text-zinc-200 transition hover:text-zinc-50"
                >
                  Sign out
                </button>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-2xl shadow-black/20 backdrop-blur sm:p-8"
            >
              <label
                htmlFor="topic"
                className="block text-sm font-medium text-zinc-300"
              >
                Topic / pain point
              </label>
              <input
                id="topic"
                type="text"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="e.g. Founders wasting hours on manual social posting"
                required
                disabled={isLoading}
                className="mt-3 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-50 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
              />

              <div className="mt-8">
                <p className="text-sm font-medium text-zinc-300">Aspect ratio</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => setAspectRatio("4:5")}
                    className={`rounded-xl border px-4 py-3 text-left transition ${
                      aspectRatio === "4:5"
                        ? "border-zinc-200 bg-zinc-100 text-zinc-950"
                        : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500"
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <span className="block text-sm font-semibold">
                      4:5 Portrait
                    </span>
                    <span className="mt-1 block text-xs opacity-70">
                      Carousel / feed creative
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => setAspectRatio("9:16")}
                    className={`rounded-xl border px-4 py-3 text-left transition ${
                      aspectRatio === "9:16"
                        ? "border-zinc-200 bg-zinc-100 text-zinc-950"
                        : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500"
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <span className="block text-sm font-semibold">
                      9:16 Vertical
                    </span>
                    <span className="mt-1 block text-xs opacity-70">
                      Reels / Shorts / TikTok
                    </span>
                  </button>
                </div>
              </div>

              <div className="mt-8">
                <p className="text-sm font-medium text-zinc-300">Slide count</p>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {allowedSlideCounts.map((count) => (
                    <button
                      key={count}
                      type="button"
                      disabled={isLoading}
                      onClick={() => setSlideCount(count)}
                      className={`rounded-xl border px-4 py-3 text-left transition ${
                        slideCount === count
                          ? "border-zinc-200 bg-zinc-100 text-zinc-950"
                          : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      <span className="block text-sm font-semibold">
                        {count} slides
                      </span>
                      <span className="mt-1 block text-xs opacity-70">
                        {SLIDE_COUNT_LABELS[count]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-8">
                <p className="text-sm font-medium text-zinc-300">
                  References (optional)
                </p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Upload product, style, or logo assets to steer copy and slide
                  visuals.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <ReferenceUploadSlot
                    id="product-reference"
                    label="Product"
                    description="Your product, app, or offer to feature."
                    previewUrl={productPreview}
                    disabled={isLoading}
                    onFileSelect={(file) => handleReferenceSelect("product", file)}
                  />
                  <ReferenceUploadSlot
                    id="style-reference"
                    label="Style"
                    description="Mood board or carousel style to match."
                    previewUrl={stylePreview}
                    disabled={isLoading}
                    onFileSelect={(file) => handleReferenceSelect("style", file)}
                  />
                  <ReferenceUploadSlot
                    id="logo-reference"
                    label="Logo"
                    description="Brand mark for consistent placement."
                    previewUrl={logoPreview}
                    disabled={isLoading}
                    onFileSelect={(file) => handleReferenceSelect("logo", file)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || topic.trim().length === 0}
                className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-zinc-50 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Generating campaign..." : "Generate campaign"}
              </button>
            </form>

            {error && (
              <div
                role="alert"
                className="mt-6 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200"
              >
                {error}
              </div>
            )}

            {campaignId && (
              <section className="mt-8 rounded-2xl border border-emerald-900/50 bg-emerald-950/20 p-6">
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-400">
                  Campaign ready
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-zinc-50">
                  Text generation complete
                </h2>
                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  Your campaign metadata and {slideCount} slide scripts are saved.
                  Open the workspace to review overlays and voiceover copy.
                </p>
                <Link
                  href={`/campaign/${campaignId}`}
                  className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
                >
                  View campaign workspace
                </Link>
                <p className="mt-4 truncate font-mono text-xs text-zinc-500">
                  {campaignId}
                </p>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
