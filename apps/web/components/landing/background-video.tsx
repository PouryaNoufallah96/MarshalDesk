"use client";

import { useEffect, useRef } from "react";
import { backgroundVideoUrl } from "./content";
import { MediaQueryGate } from "./media-query-gate";

export function BackgroundVideo({
  media,
}: {
  /** Only render (and download) the video while this media query matches. */
  media?: string;
} = {}) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden bg-black"
    >
      {media ? (
        <MediaQueryGate query={media}>
          <LoopingVideo />
        </MediaQueryGate>
      ) : (
        <LoopingVideo />
      )}
    </div>
  );
}

function LoopingVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Started from here instead of `autoPlay`, so it never moves for visitors
  // who prefer reduced motion, not even for a frame.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      if (reducedMotion.matches) {
        video.pause();
      } else {
        video.play().catch(() => {});
      }
    };
    sync();
    reducedMotion.addEventListener("change", sync);
    return () => reducedMotion.removeEventListener("change", sync);
  }, []);

  return (
    <video
      ref={videoRef}
      className="pointer-events-none absolute inset-0 size-full object-cover"
      muted
      loop
      playsInline
      preload="metadata"
    >
      <source src={backgroundVideoUrl} type="video/mp4" />
    </video>
  );
}
