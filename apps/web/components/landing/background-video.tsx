import { backgroundVideoUrl } from "./content";

export function BackgroundVideo() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden bg-black"
    >
      <video
        className="pointer-events-none absolute inset-0 size-full object-cover"
        autoPlay
        muted
        loop
        playsInline
      >
        <source src={backgroundVideoUrl} type="video/mp4" />
      </video>
    </div>
  );
}
