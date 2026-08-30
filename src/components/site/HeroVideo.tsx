"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/** Seconds of crossfade used to hide the loop seam. */
const FADE = 0.9;

/**
 * Looping hero background video.
 *
 * These clips don't end on the frame they start on, so a plain `loop` shows a
 * hard cut every few seconds. Instead we stack two copies of the same file,
 * offset by half the duration, and crossfade between them: whenever one is
 * near its seam the other is mid-clip and fully visible, so the loop reads as
 * a continuous dissolve.
 *
 * Decorative, so it's hidden from assistive tech; users who prefer reduced
 * motion get a single still frame.
 */
export function HeroVideo({ src, className }: { src: string; className?: string }) {
  const aRef = useRef<HTMLVideoElement>(null);
  const bRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const a = aRef.current;
    const b = bRef.current;
    if (!a || !b) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      a.pause();
      b.pause();
      a.style.opacity = "1";
      b.style.opacity = "0";
      return;
    }

    let raf = 0;
    let started = false;

    function tick() {
      const d = a!.duration;
      if (d && Number.isFinite(d)) {
        const t = a!.currentTime;
        // Fade A down at both ends of its clip; B carries the seam.
        let alpha = 1;
        if (t < FADE) alpha = t / FADE;
        else if (t > d - FADE) alpha = Math.max(0, (d - t) / FADE);
        a!.style.opacity = String(alpha);
        b!.style.opacity = String(1 - alpha);
      }
      raf = requestAnimationFrame(tick);
    }

    function start() {
      const d = a!.duration;
      if (started || !d || !Number.isFinite(d)) return;
      started = true;
      b!.currentTime = d / 2;
      void a!.play().catch(() => {});
      void b!.play().catch(() => {});
      raf = requestAnimationFrame(tick);
    }

    a.addEventListener("loadedmetadata", start);
    if (a.readyState >= 1) start();

    return () => {
      cancelAnimationFrame(raf);
      a.removeEventListener("loadedmetadata", start);
    };
  }, []);

  const shared =
    "absolute inset-0 h-full w-full object-cover will-change-[opacity] motion-reduce:transition-none";

  return (
    <div className={cn("relative overflow-hidden", className)} aria-hidden="true">
      <video ref={bRef} src={src} muted loop playsInline preload="auto" className={shared} style={{ opacity: 0 }} />
      <video ref={aRef} src={src} muted loop playsInline preload="auto" className={shared} style={{ opacity: 1 }} />
    </div>
  );
}
