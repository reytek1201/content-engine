import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const NATIVE_AUTH_STORAGE_KEY = "slidepress-native-auth";

let nativeAuthClient: SupabaseClient | null = null;

export function createNativeAuthClient(): SupabaseClient {
  if (nativeAuthClient) {
    return nativeAuthClient;
  }

  nativeAuthClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: "pkce",
        detectSessionInUrl: false,
        persistSession: true,
        storageKey: NATIVE_AUTH_STORAGE_KEY,
        storage:
          typeof window !== "undefined" ? window.localStorage : undefined,
      },
    },
  );

  return nativeAuthClient;
}
