"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type Testimonial = { quote: string; role: string };

/**
 * Scroll-snap testimonial slider.
 *
 * Built on native horizontal scrolling rather than transforms, so touch
 * swiping, keyboard scrolling and RTL all work without extra code. Navigation
 * scrolls the track element only — scrollIntoView is off the table because it
 * also scrolls every ancestor, yanking the page down to this section whenever
 * the auto-advance fires while the visitor is elsewhere on the page. The
 * scroll delta comes from rect differences, which sidesteps the cross-browser
 * scrollLeft ambiguity in RTL.
 */
export function TestimonialSlider({ items }: { items: readonly Testimonial[] }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback((i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const cards = Array.from(track.children) as HTMLElement[];
    const target = cards[Math.max(0, Math.min(i, cards.length - 1))];
    if (!target) return;
    const trackBox = track.getBoundingClientRect();
    const box = target.getBoundingClientRect();
    const rtl = getComputedStyle(track).direction === "rtl";
    track.scrollBy({
      left: rtl ? box.right - trackBox.right : box.left - trackBox.left,
      behavior: "smooth",
    });
  }, []);

  // Track which card is in view so the dots and arrows stay in sync.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const cards = Array.from(track.children);
    const io = new IntersectionObserver(
      () => {
        // Pick the card nearest the track's inline start. Comparing positions
        // directly (rather than trusting observer order) keeps this correct in
        // RTL, where the first card sits at the right edge.
        const trackBox = track.getBoundingClientRect();
        const rtl = getComputedStyle(track).direction === "rtl";
        const edge = rtl ? trackBox.right : trackBox.left;
        let best = 0;
        let bestDist = Infinity;
        cards.forEach((c, i) => {
          const box = (c as HTMLElement).getBoundingClientRect();
          const dist = Math.abs((rtl ? box.right : box.left) - edge);
          if (dist < bestDist) {
            bestDist = dist;
            best = i;
          }
        });
        setIndex(best);
      },
      { root: track, threshold: [0.25, 0.6, 0.9] },
    );
    cards.forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, []);

  // Gentle auto-advance; stops on hover, focus or reduced-motion.
  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      const track = trackRef.current;
      if (!track) return;
      const last = track.children.length - 1;
      goTo(index >= last ? 0 : index + 1);
    }, 5500);
    return () => clearInterval(id);
  }, [index, paused, goTo]);

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <ul
        ref={trackRef}
        className="hide-scrollbar flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-2"
        tabIndex={0}
        aria-label="המלצות"
      >
        {items.map((t) => (
          <li
            key={t.quote}
            className="w-[85%] shrink-0 snap-start sm:w-[48%] lg:w-[32%]"
          >
            <figure className="flex h-full flex-col rounded-[var(--radius-card)] bg-white p-8 shadow-[0_10px_40px_-28px_rgb(28_28_60_/_0.4)]">
              <span className="font-display text-[44px] leading-none text-mint" aria-hidden="true">
                &rdquo;
              </span>
              <blockquote className="mt-2 flex-1 text-[16px] leading-relaxed text-ink/85">
                {t.quote}
              </blockquote>
              <figcaption className="mt-5 text-[14px] text-ink/60">{t.role}</figcaption>
            </figure>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex items-center justify-center gap-4">
        <SliderButton
          label="ההמלצה הקודמת"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          direction="prev"
        />

        <div className="flex items-center gap-2" role="tablist" aria-label="מעבר בין המלצות">
          {items.map((t, i) => (
            <button
              key={t.quote}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`המלצה ${i + 1}`}
              onClick={() => goTo(i)}
              className={cn(
                "focus-brand h-2.5 rounded-full transition-all",
                i === index ? "w-7 bg-primary" : "w-2.5 bg-ink/20 hover:bg-ink/35",
              )}
            />
          ))}
        </div>

        <SliderButton
          label="ההמלצה הבאה"
          onClick={() => goTo(index + 1)}
          disabled={index >= items.length - 1}
          direction="next"
        />
      </div>
    </div>
  );
}

function SliderButton({
  label,
  onClick,
  disabled,
  direction,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  direction: "prev" | "next";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="focus-brand grid h-11 w-11 shrink-0 place-items-center rounded-full border border-ink/15 bg-white transition-colors hover:bg-canvas disabled:opacity-35"
    >
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
        {/* RTL: "next" advances leftward, so the chevron points left. */}
        <path
          d={direction === "next" ? "M12.5 4 6.5 10l6 6" : "M7.5 4l6 6-6 6"}
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
