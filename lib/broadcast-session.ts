import { supabase } from "@/lib/supabase/client";
import { publishBroadcastState } from "@/lib/realtime/broadcast";
import type { BroadcastStage } from "@/lib/types/tournament";

export async function publishBroadcastStage(
  tournamentId: string,
  stage: BroadcastStage,
  statePayload: Record<string, unknown> = {},
) {
  const updatedAt = new Date().toISOString();
  const payload = { ...statePayload, stage, updatedAt };

  const { data: existing, error: readError } = await supabase
    .from("broadcast_sessions")
    .select("id")
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (readError) throw readError;

  let sessionId: string;

  if (existing?.id) {
    const { error } = await supabase
      .from("broadcast_sessions")
      .update({
        state: stage,
        state_payload: payload,
        updated_at: updatedAt,
      })
      .eq("id", existing.id);

    if (error) throw error;
    sessionId = existing.id;
  } else {
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
    sessionId = created.id as string;
  }

  await publishBroadcastState(tournamentId, {
    stage,
    matchNumber: typeof statePayload.matchNumber === "number" ? statePayload.matchNumber : undefined,
    inputMode:
      statePayload.inputMode === "MANUAL" || statePayload.inputMode === "OCR"
        ? statePayload.inputMode
        : undefined,
    data: statePayload,
  });

  return sessionId;
}
