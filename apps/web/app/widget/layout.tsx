import type { Metadata } from "next";
import { WidgetDocument } from "@/components/widget/widget-document";
import "./widget.css";

export const metadata: Metadata = {
  title: "Chat",
  robots: { index: false, follow: false },
};

export default function WidgetLayout({ children }: LayoutProps<"/widget">) {
  return <WidgetDocument>{children}</WidgetDocument>;
}
