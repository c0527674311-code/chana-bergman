"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { signatureHtml } from "@/lib/email-brand";

/**
 * Copies Chana's email design as rich text. Pasted into Gmail's signature box
 * (Settings → See all settings → Signature) or the end of a message, her own
 * mail comes out like the ones the system sends: logo and CV-builder card.
 */
export function CopySignatureButton() {
  const [state, setState] = useState<"" | "copied" | "failed">("");

  async function copy() {
    const html = signatureHtml();
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob(["חנה ברגמן — https://chana-bergman.co.il"], { type: "text/plain" }),
        }),
      ]);
      setState("copied");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState(""), 4000);
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button variant="outline" size="md" withArrow={false} onClick={copy}>
        העתקת עיצוב המייל ל-Gmail
      </Button>
      <p role="status" aria-live="polite" className="text-[13px] text-ink/60 empty:hidden">
        {state === "copied" && "הועתק. ב-Gmail: הגדרות ← חתימה ← הדביקי (Ctrl/⌘+V)."}
        {state === "failed" && "ההעתקה נחסמה בדפדפן. אפשר לנסות שוב מדפדפן אחר."}
      </p>
    </div>
  );
}
