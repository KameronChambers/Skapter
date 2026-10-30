import { supabase } from "@/integrations/supabase/client";

/** Invokes the live Supabase Edge Function `agent` for one conversation. */
export async function invokeAgent(conversation_id: string) {
  const { data, error } = await supabase.functions.invoke("agent", { body: { conversation_id } });
  if (error) throw new Error(`Agent call failed: ${error.message}`);
  return data;
}
