import { NextResponse } from "next/server";
import { runMatch } from "@/lib/match-response";
import { requireAdmin } from "@/lib/auth-guard";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { text, limit } = (await request.json().catch(() => ({}))) as {
    text?: string;
    limit?: number;
  };

  if (!text || text.trim().length < 3) {
    return NextResponse.json({ error: "נא להדביק את טקסט הדרישה." }, { status: 400 });
  }

  const outcome = await runMatch(text, limit ?? 60);
  if ("error" in outcome) return NextResponse.json({ error: outcome.error }, { status: 500 });
  return NextResponse.json(outcome);
}
