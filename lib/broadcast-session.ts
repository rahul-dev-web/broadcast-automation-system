import { supabase } from "@/lib/supabase/client";
import type { BroadcastStage } from "@/lib/types/tournament";

export async function publishBroadcastStage(
  tournamentId: string,
  stage: BroadcastStage,
  statePayload: Record<string, unknown> = {},
) {
  const payload = { ...statePayload, stage, updatedAt: new Date().toISOString() };

  const { data: existing, error: readError } = await supabase
    .from("broadcast_sessions")
    .select("id")
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (readError) throw readError;

  if (existing?.id) {
    const { error } = await supabase
      .from("broadcast_sessions")
      .update({ state: stage, state_payload: payload, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }

  const { data: created, error } = await supabase
    .from("broadcast_sessions")
    .insert({
      tournament_id: tournamentId,
      state: stage,
      state_payload: payload,
    })
    .select("id")
    .single();

  if (error) throw error;
  return created.id as string;
}
