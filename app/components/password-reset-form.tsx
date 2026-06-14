"use client";

import { createClient } from "@/utils/supabase/client";
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_REQUIREMENTS_TEXT,
  validateSignUpPassword,
} from "@/utils/password-validation";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PasswordResetForm() {
  const supabase = createClient();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const passwordError = validateSignUpPassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }

    setMessage("Password updated. Redirecting to campaigns…");
    router.replace("/campaigns");
    router.refresh();
    setSubmitting(false);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <p className="text-sm leading-6 text-muted-foreground">
        Choose a new password for your account.
      </p>
      <div>
        <label
          htmlFor="new-password"
          className="block text-sm font-medium text-secondary-foreground"
        >
          New password
        </label>
        <input
          id="new-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={PASSWORD_MIN_LENGTH}
          disabled={submitting}
          autoComplete="new-password"
          className="field-input mt-2"
        />
      </div>
      <div>
        <label
          htmlFor="confirm-password"
          className="block text-sm font-medium text-secondary-foreground"
        >
          Confirm password
        </label>
        <input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          minLength={PASSWORD_MIN_LENGTH}
          disabled={submitting}
          autoComplete="new-password"
          className="field-input mt-2"
        />
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {PASSWORD_REQUIREMENTS_TEXT}
        </p>
      </div>
      {error ? (
        <p className="text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-primary" role="status">
          {message}
        </p>
      ) : null}
      <button type="submit" disabled={submitting} className="btn-primary">
        {submitting ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
