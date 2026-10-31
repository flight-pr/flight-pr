import { DASH_ORIGIN, LANDING_ORIGIN, SITE_ORIGIN, TRANSFER_ORIGIN } from "./site-origins";
export type DomainRoute = { kind: "redirect" | "rewrite"; path: string; origin?: string } | { kind: "deny" } | { kind: "next" };
export function domainRoute(hostname: string, pathname: string): DomainRoute {
  const host = hostname.toLowerCase().split(":")[0];
  const staticAsset = pathname.startsWith("/_next/") || /^\/(?:favicon(?:\.png|\.webp|\.ico)?|og\.png|media\/)/.test(pathname);
  if (["flightpr.net", "www.flightpr.net", "www.flightpr.it"].includes(host)) return { kind: "redirect", origin: SITE_ORIGIN, path: pathname };
  if (host === "dash.flightpr.it") {
    if (pathname === "/robots.txt") return { kind: "rewrite", path: "/private-robots" };
    if (staticAsset || pathname.startsWith("/api/intranet/") || pathname === "/api/cron/transfers") return { kind: "next" };
    if (pathname === "/intranet" || pathname.startsWith("/intranet/")) return { kind: "redirect", origin: DASH_ORIGIN, path: pathname.slice(9) || "/" };
    if (pathname === "/" || /^\/(?:login|activate|crm|transfers|landings|team|quote-settings)\/?$/.test(pathname)) return { kind: "rewrite", path: pathname === "/" ? "/intranet" : `/intranet${pathname}` };
    return { kind: "deny" };
  }
  if (host === "app.flightpr.it") {
    if (staticAsset || pathname === "/robots.txt") return { kind: "next" };
    if (pathname === "/veronica" || pathname === "/veronica/" || pathname.startsWith("/veronica/")) return { kind: "next" };
    if (pathname.startsWith("/lp/")) return { kind: "redirect", origin: LANDING_ORIGIN, path: pathname.slice(3) };
    if (/^\/[a-z0-9]+(?:-[a-z0-9]+)*\/?$/.test(pathname)) return { kind: "rewrite", path: `/lp${pathname.replace(/\/$/, "")}` };
    return { kind: "deny" };
  }
  if (host === "transfer.flightpr.it") {
    if (pathname === "/robots.txt") return { kind: "rewrite", path: "/private-robots" };
    if (staticAsset || pathname.startsWith("/api/transfers/")) return { kind: "next" };
    if (pathname.startsWith("/t/")) return { kind: "redirect", origin: TRANSFER_ORIGIN, path: pathname.slice(2) };
    if (/^\/[A-Za-z0-9_-]{43}\/?$/.test(pathname)) return { kind: "rewrite", path: `/t${pathname.replace(/\/$/, "")}` };
    return { kind: "deny" };
  }
  if (host === "flightpr.it") {
    if (pathname === "/intranet" || pathname.startsWith("/intranet/")) return { kind: "redirect", origin: DASH_ORIGIN, path: pathname.slice(9) || "/" };
    if (pathname.startsWith("/lp/")) return { kind: "redirect", origin: LANDING_ORIGIN, path: pathname.slice(3) };
    if (pathname.startsWith("/t/")) return { kind: "redirect", origin: TRANSFER_ORIGIN, path: pathname.slice(2) };
    if (pathname.startsWith("/api/intranet/")) return { kind: "deny" };
  }
  return { kind: "next" };
}
