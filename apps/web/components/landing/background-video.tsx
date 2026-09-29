import { backgroundVideoUrl } from "./content";
import { MediaQueryGate } from "./media-query-gate";

export function BackgroundVideo({
  media,
}: {
  /** Only render (and download) the video while this media query matches. */
  media?: string;
} = {}) {
  const video = (
    <video
      className="pointer-events-none absolute inset-0 size-full object-cover"
      autoPlay
      muted
      loop
      playsInline
    >
      <source src={backgroundVideoUrl} type="video/mp4" />
    </video>
  );

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden bg-black"
    >
      {media ? <MediaQueryGate query={media}>{video}</MediaQueryGate> : video}
    </div>
  );
}
