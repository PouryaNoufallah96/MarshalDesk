import type { Metadata } from "next";
import { BackgroundVideo } from "@/components/landing/background-video";
import { Hero } from "@/components/landing/hero";
import { SiteHeader } from "@/components/landing/site-header";
import { Stats } from "@/components/landing/stats";

export const metadata: Metadata = {
  title: "MarshalDesk: stop answering the same questions",
};

export default function HomePage() {
  return (
    <main className="relative flex h-dvh flex-col items-center overflow-hidden bg-black px-[clamp(14px,3vw,32px)] py-[clamp(16px,2.4vh,28px)] text-white">
      <BackgroundVideo />
      <SiteHeader />
      <Hero />
      <Stats />
    </main>
  );
}
