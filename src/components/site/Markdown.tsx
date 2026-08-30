import { cn } from "@/lib/utils";

/**
 * Small Markdown renderer for article bodies.
 *
 * Deliberately not `dangerouslySetInnerHTML` + a parser: post bodies can come
 * from the database, so everything is rendered as React elements and raw HTML
 * in the source is never executed. Supports the subset the articles use —
 * headings, paragraphs, bold, inline code, links, and ordered/unordered lists.
 */
export function Markdown({ source, className }: { source: string; className?: string }) {
  const blocks = source.trim().split(/\n{2,}/);

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      {blocks.map((block, i) => {
        const trimmed = block.trim();

        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={i} className="mt-2 text-[19px] font-bold text-navy">
              {inline(trimmed.slice(4))}
            </h3>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={i} className="mt-4 text-[24px] font-bold text-navy">
              {inline(trimmed.slice(3))}
            </h2>
          );
        }

        const lines = trimmed.split("\n");

        if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
          return (
            <ul key={i} className="flex list-disc flex-col gap-2 ps-6 text-[17px] leading-[1.85] text-ink/80">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*[-*]\s+/, ""))}</li>
              ))}
            </ul>
          );
        }

        if (lines.every((l) => /^\s*\d+\.\s+/.test(l))) {
          return (
            <ol key={i} className="flex list-decimal flex-col gap-2 ps-6 text-[17px] leading-[1.85] text-ink/80">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*\d+\.\s+/, ""))}</li>
              ))}
            </ol>
          );
        }

        return (
          <p key={i} className="text-[17px] leading-[1.85] text-ink/80">
            {inline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

/** Handles **bold**, `code`, and [text](href) within a block. */
function inline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const pattern = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));

    if (match[1] !== undefined) {
      parts.push(
        <strong key={key++} className="font-bold text-navy">
          {match[1]}
        </strong>,
      );
    } else if (match[2] !== undefined) {
      parts.push(
        <code key={key++} className="rounded bg-canvas px-1.5 py-0.5 text-[15px]" dir="ltr">
          {match[2]}
        </code>,
      );
    } else if (match[3] !== undefined && match[4] !== undefined) {
      const href = match[4];
      // Only allow safe schemes — post bodies may be database-sourced.
      const safe = /^(https?:\/\/|\/|mailto:)/i.test(href) ? href : "#";
      parts.push(
        <a
          key={key++}
          href={safe}
          className="focus-brand rounded font-semibold text-primary underline-offset-4 hover:underline"
        >
          {match[3]}
        </a>,
      );
    }
    last = pattern.lastIndex;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
