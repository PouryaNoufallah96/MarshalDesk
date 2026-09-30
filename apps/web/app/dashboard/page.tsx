import type { Metadata } from "next";
import { WidgetSettingsScreen } from "@/components/widget-settings/widget-settings-screen";

export const metadata: Metadata = {
  title: "Home · MarshalDesk",
};

export default function DashboardHomePage() {
  return <WidgetSettingsScreen />;
}
