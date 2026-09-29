import { BackgroundVideo } from "@/components/landing/background-video";
import { authShowcase } from "@/components/landing/content";
import { TrustRow } from "@/components/landing/trust-row";

const lineDelays = ["0.3s", "0.45s"];

export function AuthShowcase() {
  return (
    <div className="relative hidden p-3 lg:block">
      <div className="relative h-full overflow-hidden rounded-2xl bg-black shadow-sheet">
        <BackgroundVideo media="(min-width: 64rem)" />
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />
        <div className="relative flex h-full flex-col justify-end gap-[clamp(14px,2.4vh,22px)] p-[clamp(28px,4vw,56px)]">
          <TrustRow />
          <h2 className="font-display text-[clamp(30px,3.6vw,56px)] leading-[1.08] font-normal tracking-[-0.04em] text-white">
            {authShowcase.headline.map((line, i) => (
              <span
                key={line}
                className="block animate-headline motion-reduce:animate-none"
                style={{ animationDelay: lineDelays[i] }}
              >
                {line}
              </span>
            ))}
          </h2>
          <p className="max-w-[min(420px,100%)] animate-reveal text-[15px] leading-[1.55] text-balance text-hero-subhead opacity-80 [animation-delay:0.6s] motion-reduce:animate-none">
            {authShowcase.subhead}
          </p>
        </div>
      </div>
    </div>
  );
}
