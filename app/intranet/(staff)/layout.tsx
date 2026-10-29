import { redirect } from "next/navigation";
import { ApiError, requireStaff } from "@/lib/intranet/server";
import { StaffShell } from "@/components/intranet/shell";
export const dynamic = "force-dynamic";
export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  let staff;
  try { staff = (await requireStaff()).profile; }
  catch (error) {
    if (error instanceof ApiError && error.status === 403) return <main id="main" className="staff-standalone"><div className="staff-card staff-activation"><h1>Accesso non abilitato.</h1><p>Il tuo account non è autorizzato o è stato sospeso. Contatta l’amministratore.</p><a href="/intranet/login" className="staff-button">Torna al login</a></div></main>;
    if (error instanceof ApiError && error.status === 503) return <main id="main" className="staff-standalone"><div className="staff-card staff-activation"><h1>Workspace da configurare.</h1><p>{error.message}</p><p>Segui le istruzioni in <code>docs/intranet.md</code>.</p><a href="/intranet/login" className="staff-button">Vai al login</a></div></main>;
    redirect("/intranet/login");
  }
  return <StaffShell profile={staff}>{children}</StaffShell>;
}
