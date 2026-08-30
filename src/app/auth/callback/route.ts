import { NextResponse } from "next/server";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

/** OAuth / magic-link landing point: exchanges the code for a session cookie. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/profile";

  if (!supabaseConfigured || !code) {
    return NextResponse.redirect(new URL("/login?error=auth", url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login?error=auth", url.origin));
  }

  // Ensure an app_users row exists so the admin flag has somewhere to live.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("app_users").upsert(
      {
        id: user.id,
        email: user.email ?? "",
        first_name: (user.user_metadata?.first_name as string) ?? null,
        last_name: (user.user_metadata?.last_name as string) ?? null,
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
