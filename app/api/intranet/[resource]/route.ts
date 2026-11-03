import { z } from "zod";
import { staffActivationUrl } from "@/lib/site-origins";
import { adminDb, ApiError, apiError, checkOrigin, dbError, json, requireStaff } from "@/lib/intranet/server";
import { activitySchema, contactSchema, pipelineSchema, landingSchema, staffInviteSchema, staffUpdateSchema } from "@/lib/intranet/validation";
import { r2Configured } from "@/lib/intranet/r2";
type Context = { params: Promise<{ resource: string }> };
const tables: Record<string, string> = { contacts: "contacts", landings: "landing_pages", activities: "contact_activities", staff: "staff_profiles" };
export async function GET(request: Request, context: Context) {
  try {
    const { db, profile } = await requireStaff();
    const { resource } = await context.params;
    if (resource === "overview") {
      // PostgREST caps a single response: paginate to keep counters and search complete.
      const all = async (table: string, fields = "*", order = "created_at") => {
        const rows: unknown[] = [];
        for (let offset = 0; ; offset += 500) {
          let query = db.from(table).select(fields).order(order, { ascending: false }).order("id").range(offset, offset + 499);
          if (table === "transfers") query = query.is("deleted_at", null);
          const result = await query;
          dbError(result.error); rows.push(...(result.data || []));
          if (!result.data || result.data.length < 500) return rows;
        }
      };
      const [contacts, landings, staff, transfers, recent] = await Promise.all([
        all("contacts"), all("landing_pages", "*", "updated_at"), all("staff_profiles"), all("transfers", "id,title,recipient,message,contact_id,expires_at,status,revoked_at,created_at,created_by,transfer_files(id,name,size,type,completed)"),
        db.from("contact_activities").select("*").order("created_at", { ascending: false }).limit(12),
      ]);
      dbError(recent.error);
      // Bulk workspace responses never include sharing credentials.
      const summaries = transfers.map((row) => Object.fromEntries(Object.entries(row as Record<string, unknown>).filter(([key]) => !["token_hash", "token_ciphertext"].includes(key))));
      return json({ contacts, landings, staff, transfers: summaries, activities: recent.data, r2Configured: r2Configured(), profile });
    }
    const table = tables[resource];
    if (!table) throw new ApiError(404, "Risorsa non trovata.");
    let query = db.from(table).select("*").order("created_at", { ascending: false }).limit(1000);
    if (resource === "activities") query = query.eq("contact_id", z.uuid().parse(new URL(request.url).searchParams.get("contact")));
    const { data, error } = await query;
    dbError(error); return json(data);
  } catch (error) { return apiError(error); }
}
export async function POST(request: Request, context: Context) {
  try {
    checkOrigin(request);
    const { resource } = await context.params;
    const { db, profile } = await requireStaff(resource === "staff");
    const body = await request.json();
    if (resource === "staff") {
      const input = staffInviteSchema.parse(body);
      const admin = adminDb();
      const base = process.env.APP_URL || new URL(request.url).origin;
      const { password, ...profileInput } = input;
      const { data, error } = password
        ? await admin.auth.admin.createUser({ email: input.email, password, email_confirm: true, user_metadata: { name: input.name } })
        : await admin.auth.admin.inviteUserByEmail(input.email, { data: { name: input.name }, redirectTo: staffActivationUrl(base) });
      if (error || !data.user) throw new ApiError(400, "Invito non riuscito. Verifica che l’indirizzo non sia già registrato e che il servizio email sia configurato.");
      const result = await admin.from("staff_profiles").insert({ id: data.user.id, ...profileInput }).select().single();
      if (result.error) { await admin.auth.admin.deleteUser(data.user.id); dbError(result.error); }
      return json(result.data, 201);
    }
    const table = tables[resource];
    if (!table || !["contacts", "landings", "activities"].includes(resource)) throw new ApiError(404, "Risorsa non trovata.");
    const input = resource === "contacts" ? contactSchema.parse(body) : resource === "landings" ? landingSchema.parse(body) : { ...activitySchema.parse(body), author_id: profile.id };
    const { data, error } = await db.from(table).insert(input as Record<string, unknown>).select().single();
    dbError(error); return json(data, 201);
  } catch (error) { return apiError(error); }
}
export async function PATCH(request: Request, context: Context) {
  try {
    checkOrigin(request);
    const { resource } = await context.params;
    const { db, profile } = await requireStaff(resource === "staff");
    const id = z.uuid().parse(new URL(request.url).searchParams.get("id"));
    const body = await request.json();
    if (resource === "staff") {
      const input = staffUpdateSchema.parse(body);
      if (profile.id === id && (!input.active || input.role !== "admin")) throw new ApiError(400, "Non puoi sospendere o declassare il tuo account.");
      const { data, error } = await adminDb().from("staff_profiles").update(input).eq("id", id).select().single();
      dbError(error); return json(data);
    }
    if (!["contacts", "landings"].includes(resource)) throw new ApiError(404, "Risorsa non trovata.");
    const input = resource === "contacts" ? (new URL(request.url).searchParams.get("pipeline") === "1" ? pipelineSchema.parse(body) : contactSchema.parse(body)) : landingSchema.parse(body);
    const { data, error } = await db.from(tables[resource]).update(input).eq("id", id).select().single();
    dbError(error); return json(data);
  } catch (error) { return apiError(error); }
}
export async function DELETE(request: Request, context: Context) {
  try {
    checkOrigin(request);
    const { db } = await requireStaff();
    const { resource } = await context.params;
    if (!["contacts", "landings"].includes(resource)) throw new ApiError(404, "Risorsa non trovata.");
    const id = z.uuid().parse(new URL(request.url).searchParams.get("id"));
    const { data, error } = await db.from(tables[resource]).delete().eq("id", id).select("id").single();
    dbError(error); return json(data);
  } catch (error) { return apiError(error); }
}
