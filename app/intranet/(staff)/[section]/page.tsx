import { notFound } from "next/navigation";
import { QuoteSettingsPage } from "@/components/intranet/quote-settings";
import { Workbench } from "@/components/intranet/workbench";
export default async function StaffSection({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (section === "quote-settings") return <QuoteSettingsPage/>;
  if (!["crm", "transfers", "landings", "team"].includes(section)) notFound();
  return <Workbench section={section as "crm" | "transfers" | "landings" | "team"}/>;
}
