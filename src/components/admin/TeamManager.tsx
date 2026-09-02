"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

type Member = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
};
type Invite = { email: string; created_at: string };

/**
 * Chana adds a colleague by email. If that person already has an account they
 * get access on the spot; if not, the email is held as an invite and access is
 * granted the first time they sign in — password or Google, either works.
 */
export function TeamManager({ currentEmail }: { currentEmail: string | null }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/team");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "לא הצלחנו לטעון את רשימת הצוות.");
      setMembers(json.members ?? []);
      setInvites(json.invites ?? []);
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : "שגיאה" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/team", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "ההוספה נכשלה.");
      setNotice({
        kind: "ok",
        text:
          json.alreadyAdmin
            ? "לכתובת הזו כבר יש גישה."
            : json.granted === "existing"
              ? "הגישה ניתנה. אפשר להיכנס כבר עכשיו."
              : "הכתובת אושרה. הגישה תיפתח בכניסה הראשונה שלה למערכת.",
      });
      setEmail("");
      await load();
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : "שגיאה" });
    } finally {
      setBusy(false);
    }
  }

  async function revoke(target: string) {
    if (!confirm(`להסיר את הגישה של ${target} למערכת הניהול?`)) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/team", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: target }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "ההסרה נכשלה.");
      setNotice({ kind: "ok", text: "הגישה הוסרה." });
      await load();
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : "שגיאה" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[var(--radius-card)] bg-white p-6 shadow-[0_10px_40px_-30px_rgb(28_28_60_/_0.4)]">
        <h2 className="pb-1 text-[18px] font-bold text-navy">הוספת גישה</h2>
        <p className="pb-4 text-[14px] text-ink/70">
          מי שתוסיפי כאן יקבל גישה מלאה לכל מערכת הניהול — מאגר המועמדות, האיתור לפי
          דרישה, הדיוור והייבוא.
        </p>
        <form onSubmit={add} className="flex flex-wrap items-center gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="כתובת מייל"
            dir="ltr"
            className="focus-brand min-w-[16rem] flex-1 rounded-full border border-ink/15 px-5 py-3 text-[15px]"
          />
          <Button type="submit" withArrow={false} disabled={busy || !email}>
            {busy ? "רגע…" : "הוספה"}
          </Button>
        </form>
        {notice && (
          <p
            role="status"
            className={`mt-4 rounded-2xl px-4 py-2.5 text-[14px] font-medium ${
              notice.kind === "ok" ? "bg-mint-100 text-navy" : "bg-red-50 text-red-700"
            }`}
          >
            {notice.text}
          </p>
        )}
      </section>

      <section className="rounded-[var(--radius-card)] bg-white p-6 shadow-[0_10px_40px_-30px_rgb(28_28_60_/_0.4)]">
        <h2 className="pb-4 text-[18px] font-bold text-navy">
          מי שיש לו גישה {!loading && <span className="text-ink/50">({members.length})</span>}
        </h2>

        {loading ? (
          <p className="text-[14px] text-ink/60">טוען…</p>
        ) : (
          <ul className="divide-y divide-ink/10">
            {members.map((m) => {
              const name = [m.first_name, m.last_name].filter(Boolean).join(" ");
              const isSelf =
                !!currentEmail && (m.email ?? "").toLowerCase() === currentEmail.toLowerCase();
              return (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <span className="text-[15px]">
                    {name && <strong className="text-navy">{name} · </strong>}
                    <span dir="ltr" className="text-ink/75">
                      {m.email}
                    </span>
                    {isSelf && <span className="text-ink/50"> — את</span>}
                  </span>
                  {!isSelf && (
                    <button
                      type="button"
                      onClick={() => revoke(m.email ?? "")}
                      disabled={busy}
                      className="focus-brand rounded-full px-3 py-1.5 text-[14px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      הסרת גישה
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {invites.length > 0 && (
          <>
            <h3 className="pt-6 pb-2 text-[15px] font-bold text-navy">
              ממתינות לכניסה ראשונה
            </h3>
            <p className="pb-3 text-[13.5px] text-ink/60">
              אישרת את הכתובות האלה, אבל הן עוד לא נכנסו למערכת. הגישה תיפתח להן
              אוטומטית בכניסה הראשונה.
            </p>
            <ul className="divide-y divide-ink/10">
              {invites.map((i) => (
                <li key={i.email} className="flex items-center justify-between gap-3 py-3">
                  <span dir="ltr" className="text-[15px] text-ink/75">
                    {i.email}
                  </span>
                  <button
                    type="button"
                    onClick={() => revoke(i.email)}
                    disabled={busy}
                    className="focus-brand rounded-full px-3 py-1.5 text-[14px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    ביטול
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
