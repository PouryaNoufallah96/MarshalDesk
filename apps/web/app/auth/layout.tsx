import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/brand/logo-mark";
import { BackgroundVideo } from "@/components/landing/background-video";
import { Providers } from "@/components/providers";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: { template: "%s · MarshalDesk", default: "MarshalDesk" },
};

export default function AuthLayout({ children }: LayoutProps<"/auth">) {
  return (
    <div className="grid min-h-svh flex-1 bg-background text-foreground lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link
            href={routes.home}
            className="flex items-center gap-2 rounded-md font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <LogoMark className="size-6 text-foreground [--logo-dots:var(--background)]" />
            MarshalDesk
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <Providers>{children}</Providers>
          </div>
        </div>
      </div>
      <div className="relative hidden bg-black lg:block">
        <BackgroundVideo media="(min-width: 64rem)" />
      </div>
    </div>
  );
}
