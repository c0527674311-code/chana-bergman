"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

/**
 * The three stat circles, drawn as one SVG to match the design exactly:
 *
 *  - each filled circle has a thin navy "halo" ring, larger and offset
 *    outward, whose line crosses OVER the fill on the inner side;
 *  - the middle circle is white with a hairline ring, and the neighbouring
 *    fills overlap onto it (the fills sit above its ring, the halos above all);
 *  - diagonal gradients on the periwinkle and mint fills;
 *  - numbers count up when scrolled into view.
 *
 * Values are marketing constants from the design — update to real numbers.
 */

const R = 260; // fill radius
const HALO_R = 280; // halo ring radius
const CY = 370;
const CX = { left: 500, mid: 950, right: 1400 };

export function StatCircles() {
  const ref = useRef<HTMLDivElement>(null);
  const [run, setRun] = useState(false);
  const [instant, setInstant] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setInstant(true);
      setRun(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setRun(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  const years = useCountUp(30, run);
  const companies = useCountUp(35, run);
  const jobs = useCountUp(255, run);

  // Entrance: each circle pops in around its own centre, staggered in reading
  // order (right to left). SVG groups default to transform-box: view-box, so
  // the origin is given in user units.
  const appear = (x: number, delay: number): CSSProperties => ({
    transformOrigin: `${x}px ${CY}px`,
    opacity: run ? 1 : 0,
    transform: run ? "scale(1)" : "scale(0.72)",
    transition: instant
      ? "none"
      : `opacity 0.7s ease ${delay}ms, transform 0.9s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
  });

  return (
    <div ref={ref} className="mx-auto w-full max-w-[1100px]" aria-label="המספרים שלנו" role="img">
      <svg viewBox="0 0 1900 740" className="h-auto w-full" fill="none">
        <defs>
          <linearGradient id="stat-peri" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#98a8e6" />
            <stop offset="100%" stopColor="#5a6fc4" />
          </linearGradient>
          <linearGradient id="stat-mint" x1="0" y1="0" x2="0.9" y2="1">
            <stop offset="0%" stopColor="#a9ecd3" />
            <stop offset="100%" stopColor="#5ecfc4" />
          </linearGradient>
        </defs>

        {/* Paint order: the middle white circle first so the colored fills
            overlap onto it, halo rings above their fills. Each circle is one
            group so it enters as a unit. */}
        <g style={appear(CX.mid, 140)}>
          <circle cx={CX.mid} cy={CY} r={R} fill="#ffffff" stroke="#16295c" strokeWidth="2.5" />
          <StatText x={CX.mid} num={String(companies)} label={["חברות מובילות", "בתעשיה"]} />
        </g>

        <g style={appear(CX.right, 0)}>
          <circle cx={CX.right} cy={CY} r={R} fill="url(#stat-mint)" />
          <circle cx={CX.right} cy={CY} r={HALO_R} stroke="#16295c" strokeWidth="2.5" />
          <StatText x={CX.right} num={`+${jobs}`} label={["משרות במאגר"]} light />
        </g>

        <g style={appear(CX.left, 280)}>
          <circle cx={CX.left} cy={CY} r={R} fill="url(#stat-peri)" />
          <circle cx={CX.left} cy={CY} r={HALO_R} stroke="#16295c" strokeWidth="2.5" />
          <StatText x={CX.left} num={String(years)} label={["שנות ניסיון"]} light />
        </g>
      </svg>
    </div>
  );
}

function StatText({
  x,
  num,
  label,
  light = false,
}: {
  x: number;
  num: string;
  label: string[];
  light?: boolean;
}) {
  const color = light ? "#ffffff" : "#6c83d0";
  const single = label.length === 1;
  return (
    <g textAnchor="middle">
      <text
        x={x}
        y={CY - (single ? 10 : 30)}
        className="font-display"
        fontSize="120"
        fontWeight="600"
        fill={color}
        direction="ltr"
      >
        {num}
      </text>
      <text x={x} y={CY + (single ? 70 : 44)} fontSize="42" fontWeight="500" fill={color}>
        {label[0]}
      </text>
      {label[1] && (
        <text x={x} y={CY + 98} fontSize="42" fontWeight="500" fill={color}>
          {label[1]}
        </text>
      )}
    </g>
  );
}

function useCountUp(target: number, run: boolean, duration = 1400): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, target, duration]);
  return value;
}
