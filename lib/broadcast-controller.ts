import { supabase } from "@/lib/supabase/client";
import { publishBroadcastStage } from "@/lib/broadcast-session";
import type { BroadcastStage, InputMode } from "@/lib/types/tournament";

const ALLOWED: Record<BroadcastStage, BroadcastStage[]> = {
  SETUP: ["AUTOMATION_STARTED"],
  AUTOMATION_STARTED: ["ROSTER_1"],
  ROSTER_1: ["ROSTER_2", "ROOM"],
  ROSTER_2: ["ROOM"],
  ROOM: ["MATCH_LIVE"],
  MATCH_LIVE: ["MATCH_REVIEW"],
  MATCH_REVIEW: ["MATCH_VERIFIED"],
  MATCH_VERIFIED: ["MATCH_PT", "ROOM", "OVERALL"],
  MATCH_PT: ["ROOM", "OVERALL"],
  OVERALL: ["THANK_YOU"],
  THANK_YOU: ["CLOSED"],
  CLOSED: [],
};

export async function getBroadcastSession(tournamentId: string) {
  const { data, error } = await supabase
    .from("broadcast_sessions")
    .select("id, state, state_payload, updated_at")
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function transitionBroadcastStage(
  tournamentId: string,
  nextStage: BroadcastStage,
  payload: Record<string, unknown> = {},
) {
  const current = await getBroadcastSession(tournamentId);
  const currentStage = (current?.state as BroadcastStage | undefined) ?? "SETUP";

  if (currentStage !== nextStage && !ALLOWED[currentStage].includes(nextStage)) {
    throw new Error(`Invalid broadcast transition: ${currentStage} → ${nextStage}`);
  }

  return publishBroadcastStage(tournamentId, nextStage, {
    ...payload,
    previousStage: currentStage,
  });
}

export async function startTournamentBroadcast(tournamentId: string) {
  return transitionBroadcastStage(tournamentId, "AUTOMATION_STARTED");
}

export async function setRosterPage(tournamentId: string, page: 1 | 2) {
  return transitionBroadcastStage(tournamentId, page === 1 ? "ROSTER_1" : "ROSTER_2", { page });
}

export async function openRoomStage(tournamentId: string, matchNumber: number) {
  return transitionBroadcastStage(tournamentId, "ROOM", { matchNumber });
}

export async function openMatchLiveStage(
  tournamentId: string,
  matchNumber: number,
  inputMode: InputMode,
) {
  const current = await getBroadcastSession(tournamentId);
  if (!current) {
    await publishBroadcastStage(tournamentId, "ROOM", { matchNumber, bootstrap: true });
  }
  return transitionBroadcastStage(tournamentId, "MATCH_LIVE", { matchNumber, inputMode });
}

export async function openMatchReviewStage(tournamentId: string, matchNumber: number) {
  return transitionBroadcastStage(tournamentId, "MATCH_REVIEW", { matchNumber });
}

export async function openMatchVerifiedStage(tournamentId: string, matchNumber: number) {
  return transitionBroadcastStage(tournamentId, "MATCH_VERIFIED", { matchNumber });
}

export async function openMatchPtStage(tournamentId: string, matchNumber: number) {
  return transitionBroadcastStage(tournamentId, "MATCH_PT", { matchNumber });
}

export async function advanceAfterVerifiedMatch(
  tournamentId: string,
  matchNumber: number,
  totalMatches: number,
  showPt: boolean,
) {
  if (showPt) {
    return openMatchPtStage(tournamentId, matchNumber);
  }

  if (matchNumber < totalMatches) {
    return openRoomStage(tournamentId, matchNumber + 1);
  }

  await supabase.from("tournaments").update({ status: "COMPLETED" }).eq("id", tournamentId);
  return openOverallStage(tournamentId);
}

export async function advanceAfterPt(
  tournamentId: string,
  matchNumber: number,
  totalMatches: number,
) {
  if (matchNumber < totalMatches) {
    return openRoomStage(tournamentId, matchNumber + 1);
  }

  await supabase.from("tournaments").update({ status: "COMPLETED" }).eq("id", tournamentId);
  return openOverallStage(tournamentId);
}

export async function openOverallStage(tournamentId: string) {
  return transitionBroadcastStage(tournamentId, "OVERALL");
}

export async function openThankYouStage(tournamentId: string) {
  return transitionBroadcastStage(tournamentId, "THANK_YOU");
}

export async function closeBroadcast(tournamentId: string) {
  return transitionBroadcastStage(tournamentId, "CLOSED");
}
