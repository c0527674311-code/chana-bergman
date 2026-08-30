import { mkdir, appendFile } from "node:fs/promises";
import path from "node:path";

/**
 * Development-only escape hatch.
 *
 * Before Supabase is wired up we still want the forms to be clickable end to
 * end so the design can be reviewed. In development we append submissions to
 * `.local-submissions/<kind>.jsonl` and report success. In production this
 * refuses, so a misconfigured deploy fails loudly instead of quietly dropping
 * a candidate on the floor.
 */
export async function saveDevSubmission(kind: string, payload: unknown): Promise<boolean> {
  if (process.env.NODE_ENV === "production") return false;

  try {
    const dir = path.join(process.cwd(), ".local-submissions");
    await mkdir(dir, { recursive: true });
    await appendFile(
      path.join(dir, `${kind}.jsonl`),
      JSON.stringify({ at: new Date().toISOString(), ...(payload as object) }) + "\n",
      "utf8",
    );
    console.warn(
      `[dev] Supabase לא מוגדר — הפנייה (${kind}) נשמרה מקומית ב-.local-submissions/${kind}.jsonl`,
    );
    return true;
  } catch (err) {
    console.error("dev fallback write failed:", err);
    return false;
  }
}
