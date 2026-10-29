import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { dbError } from "./server";
import { defaultQuoteSettings, quoteSettingsSchema } from "./quote-settings";

export async function getQuoteSettings(db: SupabaseClient) {
  const { data, error } = await db.from("quote_settings").select("values").eq("id", "default").single();
  dbError(error);
  return quoteSettingsSchema.parse({ ...defaultQuoteSettings, ...data?.values });
}
