import { Login } from "@/components/intranet/login";
import { authConfigured } from "@/lib/intranet/server";
export const dynamic = "force-dynamic";
export default function LoginPage() { return <Login configured={authConfigured()} />; }
