import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

const RequestSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
});

/**
 * Establishes Supabase auth cookies on the server after native OAuth / token
 * sign-in. Capacitor WebView client-side setSession alone is not reliably
 * visible to SSR on the next navigation (Google sign-in loop on iOS).
 */
export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 },
    );
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid session payload" },
      { status: 400 },
    );
  }

  let response = NextResponse.json({ success: true });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.json({ success: true });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { error } = await supabase.auth.setSession({
    access_token: parsed.data.access_token,
    refresh_token: parsed.data.refresh_token,
  });

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 401 },
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { success: false, error: userError?.message ?? "Session was not established" },
      { status: 401 },
    );
  }

  return response;
}
