import Link from "next/link";
export function SettingsNavigation({ active }: { active: "team" | "quotes" }) {
  return <nav className="staff-settings-tabs" aria-label="Team e impostazioni">
    <Link href="/intranet/team" aria-current={active === "team" ? "page" : undefined}>Team e accessi</Link>
    <Link href="/intranet/quote-settings" aria-current={active === "quotes" ? "page" : undefined}>Impostazioni preventivi</Link>
  </nav>;
}
