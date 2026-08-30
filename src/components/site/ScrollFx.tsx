"use client";

import { useEffect } from "react";

/**
 * Site-wide scroll effects, mounted once in the root layout.
 *
 * Watches every `[data-reveal]` element (fade-up entrance) and `.mark-mint`
 * span (highlight sweep) with a single IntersectionObserver. Server components
 * only add attributes/classes; this is the one client piece. A MutationObserver
 * re-scans after App Router navigations so new pages animate too.
 */
export function ScrollFx() {
  useEffect(() => {
    const SELECTOR = "[data-reveal], .mark-mint, [data-marquee]";

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.querySelectorAll(SELECTOR).forEach((el) => el.classList.add("revealed", "mark-in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add(
            entry.target.classList.contains("mark-mint") ? "mark-in" : "revealed",
          );
          io.unobserve(entry.target);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );

    const seen = new WeakSet<Element>();
    function scan() {
      document.querySelectorAll(SELECTOR).forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        io.observe(el);
      });
    }

    scan();
    const mo = new MutationObserver(() => scan());
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}
