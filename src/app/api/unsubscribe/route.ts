import { NextResponse, type NextRequest } from "next/server";
import { unsubscribe } from "@/lib/unsubscribe";

export const runtime = "nodejs";

/**
 * The URL in every campaign's List-Unsubscribe header, and the target of the
 * confirm button on /unsubscribe.
 *
 * RFC 8058 one-click: Gmail / Apple Mail / Outlook POST
 * `List-Unsubscribe=One-Click` here when the recipient presses "Unsubscribe" in
 * the mail client. Link scanners only GET, and GET never changes anything.
 */

function candidateId(request: NextRequest): string | undefined {
  const params = request.nextUrl.searchParams;
  return (params.get("id") ?? params.get("c") ?? "").trim() || undefined;
}

function confirmPage(request: NextRequest, id: string | undefined, flag?: "done" | "failed") {
  const url = new URL("/unsubscribe", request.url);
  if (id) url.searchParams.set("c", id);
  if (flag) url.searchParams.set(flag, "1");
  return NextResponse.redirect(url, 303);
}

export function GET(request: NextRequest) {
  return confirmPage(request, candidateId(request));
}

export async function POST(request: NextRequest) {
  const id = candidateId(request);
  // Both encodings RFC 8058 allows (urlencoded, multipart) parse here; the
  // confirm form sends an empty urlencoded body.
  const form = await request.formData().catch(() => null);
  const oneClick = form?.get("List-Unsubscribe") === "One-Click";

  const outcome = await unsubscribe(id, oneClick ? "one_click" : "page");

  if (oneClick) {
    const status = outcome === "invalid" ? 404 : outcome === "error" ? 500 : 200;
    return NextResponse.json({ ok: status === 200, outcome }, { status });
  }

  // A person pressed the button: show the result on the page, which re-reads
  // the database — the flag alone can never produce a success message.
  if (outcome === "done") return confirmPage(request, id, "done");
  if (outcome === "error") return confirmPage(request, id, "failed");
  return confirmPage(request, id);
}
