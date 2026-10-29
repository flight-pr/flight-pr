import Image from "next/image";
import { media } from "@/data/media";

export function StaffBrand({ subtitle = "TEAM WORKSPACE" }: { subtitle?: string }) {
  return <span className="staff-brand"><Image src={media.logo} width={58} height={44} unoptimized alt=""/><span className="staff-brand-type"><strong>FLIGHT P.R.</strong><small>{subtitle}</small></span></span>;
}
