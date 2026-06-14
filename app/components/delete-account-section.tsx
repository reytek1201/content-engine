"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteAccountSection() {
  const supabase = createClient();
  const router = useRouter();

  const [expanded, setExpanded] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = confirmText === "DELETE";

  async function handleDeleteAccount() {
    if (!canDelete || isDeleting) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch("/api/account/delete", { method: "POST" });
      const data = (await response.json()) as {
        success: boolean;
        error?: string;
      };

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to delete account");
      }

      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete account",
      );
      setIsDeleting(false);
    }
  }

  return (
    <section className="border-t border-border pt-6 md:pt-8">
      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-sm font-medium text-muted-foreground underline-offset-2 transition hover:text-foreground hover:underline"
        >
          Account deletion…
        </button>
      ) : (
        <div className="rounded-2xl border border-red-900/40 bg-red-950/10 p-6 sm:p-8">
          <h2 className="text-sm font-semibold text-foreground">Danger zone</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Permanently delete your SlidePress account, all campaigns, brand
            library assets, and usage history. This cannot be undone.{" "}
            <span className="text-secondary-foreground">
              Sign out only ends your session — your data stays until you delete
              your account.
            </span>
          </p>

          <ul className="mt-4 list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>All campaigns, slides, and platform captions</li>
            <li>Brand library reference images</li>
            <li>Usage history and sign-in access</li>
          </ul>

          <div className="mt-6">
            <label
              htmlFor="delete-account-confirm"
              className="block text-sm font-medium text-secondary-foreground"
            >
              Type DELETE to confirm
            </label>
            <input
              id="delete-account-confirm"
              type="text"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              disabled={isDeleting}
              autoComplete="off"
              className="field-input mt-2 max-w-xs"
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleDeleteAccount()}
              disabled={!canDelete || isDeleting}
              className="inline-flex items-center justify-center rounded-xl border border-red-900/60 bg-red-950/20 px-4 py-2.5 text-sm font-semibold text-red-200 transition hover:border-red-700 hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting ? "Deleting account…" : "Permanently delete account"}
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => {
                setExpanded(false);
                setConfirmText("");
                setError(null);
              }}
              className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-ring/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200"
            >
              {error}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
