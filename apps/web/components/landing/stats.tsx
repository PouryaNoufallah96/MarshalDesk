"use client";

import { useEffect, useRef, useState } from "react";
import { stats } from "./content";

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

export function Stats() {
  const ref = useRef<HTMLDListElement>(null);
  const [values, setValues] = useState(() => stats.map(() => 0));

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const frames: number[] = [];
    const timers: number[] = [];

    const run = () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setValues(stats.map((s) => s.value));
        return;
      }
      stats.forEach((stat, i) => {
        const duration = 1500 + i * 80;
        timers.push(
          window.setTimeout(
            () => {
              const start = performance.now();
              const tick = (now: number) => {
                const t = Math.min((now - start) / duration, 1);
                setValues((prev) => {
                  const next = [...prev];
                  next[i] = stat.value * easeOutCubic(t);
                  return next;
                });
                if (t < 1) frames[i] = requestAnimationFrame(tick);
              };
              frames[i] = requestAnimationFrame(tick);
            },
            480 + i * 90,
          ),
        );
      });
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          observer.disconnect();
          run();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
      frames.forEach((f) => cancelAnimationFrame(f));
    };
  }, []);

  return (
    <dl
      ref={ref}
      className="relative grid w-full max-w-[920px] shrink-0 grid-cols-2 gap-x-4 gap-y-6 nav:grid-cols-4 [@media(max-height:700px)]:gap-y-4"
    >
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          className="flex animate-reveal flex-col items-center gap-1.5 text-center motion-reduce:animate-none"
          style={{ animationDelay: `${0.5 + i * 0.08}s` }}
        >
          <span
            aria-hidden="true"
            className="font-display text-[clamp(22px,3vw,33px)] leading-none text-white"
          >
            {stat.glyph}
          </span>
          <dt className="order-last text-[clamp(11px,1.2vw,12.5px)] text-stat-label">
            {stat.label}
          </dt>
          <dd className="text-[clamp(18px,2.2vw,26px)] font-medium tracking-[-0.025em] text-white tabular-nums">
            <span aria-hidden="true">
              {(values[i] ?? 0).toFixed(stat.decimals)}
              {stat.suffix}
            </span>
            <span className="sr-only">
              {stat.value.toFixed(stat.decimals)}
              {stat.suffix}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
