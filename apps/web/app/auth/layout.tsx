import type { Metadata } from "next";
import Link from "next/link";
import { AuthShowcase } from "@/components/auth/auth-showcase";
import { LogoMark } from "@/components/brand/logo-mark";
import { Providers } from "@/components/providers";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: { template: "%s · MarshalDesk", default: "MarshalDesk" },
};

export default function AuthLayout({ children }: LayoutProps<"/auth">) {
  return (
    <div className="dark grid min-h-svh flex-1 bg-black text-foreground lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <Link
          href={routes.home}
          className="flex w-fit animate-slide-down items-center gap-3 self-center rounded-lg font-medium text-white outline-none focus-visible:ring-3 focus-visible:ring-white/50 motion-reduce:animate-none md:self-start"
        >
          <span className="grid size-11 place-items-center rounded-full bg-white text-black shadow-soft">
            <LogoMark className="size-[72%]" />
          </span>
          MarshalDesk
        </Link>
        <div className="flex flex-1 items-center justify-center py-6">
          <div className="w-full max-w-[400px] animate-reveal rounded-2xl border border-white/10 bg-background px-[clamp(20px,6vw,36px)] py-[clamp(28px,6vw,40px)] shadow-sheet [animation-delay:0.1s] motion-reduce:animate-none">
            <Providers>{children}</Providers>
          </div>
        </div>
      </div>
      <AuthShowcase />
    </div>
  );
}
