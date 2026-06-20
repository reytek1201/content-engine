import type { Brand } from "@/types/brand";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function ensureDefaultBrand(
  supabase: SupabaseClient,
  userId: string,
): Promise<Brand> {
  const { data: existingDefault, error: defaultError } = await supabase
    .from("brands")
    .select("*")
    .eq("user_id", userId)
    .eq("is_default", true)
    .maybeSingle();

  if (defaultError) {
    throw new Error(defaultError.message);
  }

  if (existingDefault) {
    return existingDefault as Brand;
  }

  const { data: created, error: createError } = await supabase
    .from("brands")
    .insert({
      user_id: userId,
      name: "My brand",
      is_default: true,
    })
    .select("*")
    .single();

  if (createError) {
    // PostgreSQL unique-violation (23505): a concurrent request already inserted
    // the default brand (race on first sign-up). Re-fetch it instead of crashing.
    if (createError.code === "23505") {
      const { data: existing } = await supabase
        .from("brands")
        .select("*")
        .eq("user_id", userId)
        .eq("is_default", true)
        .single();

      if (existing) return existing as Brand;
    }

    throw new Error(createError.message);
  }

  if (!created) {
    throw new Error("Failed to create default brand");
  }

  return created as Brand;
}

export async function listUserBrands(
  supabase: SupabaseClient,
  userId: string,
): Promise<Brand[]> {
  await ensureDefaultBrand(supabase, userId);

  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Brand[];
}
