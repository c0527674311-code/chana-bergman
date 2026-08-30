import { NextResponse } from "next/server";
import { getCurrentUser, supabaseConfigured } from "@/lib/supabase/server";

/**
 * Guards admin API routes. Returns a response to send back when access is
 * denied, or null when the caller may proceed.
 *
 * When Supabase is not configured the app is running on demo data with no real
 * records to protect, so the back-office stays open for review. As soon as a
 * database is attached, real auth applies.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  if (!supabaseConfigured) return null;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "יש להתחבר." }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  return null;
}
