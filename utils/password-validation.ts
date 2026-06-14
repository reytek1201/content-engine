import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_REQUIREMENTS_TEXT =
  "At least 8 characters with uppercase, lowercase, and a number.";

const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters`)
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[0-9]/, "Include a number");

export function validateSignUpPassword(password: string): string | null {
  const result = passwordSchema.safeParse(password);

  if (result.success) {
    return null;
  }

  return result.error.issues[0]?.message ?? "Password does not meet requirements";
}
