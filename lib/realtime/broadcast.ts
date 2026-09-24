import type { BroadcastStage } from "@/lib/types/tournament";
import { supabase } from "@/lib/supabase/client";

export interface BroadcastStatePayload {
  stage: BroadcastStage;
  tournamentId: string;
  matchNumber?: number;
  inputMode?: "MANUAL" | "OCR";
  currentPlayer?: {
    teamId: string;
    teamNumber: number;
    registeredName: string;
    inGameName?: string;
  } | null;
  data?: Record<string, unknown>;
  updatedAt: string;
}

export function getBroadcastChannel(tournamentId: string) {
  return supabase.channel(`broadcast:${tournamentId}`, {
    config: {
      broadcast: { self: false, ack: true },
    },
  });
}

export async function publishBroadcastState(
  tournamentId: string,
  payload: Omit<BroadcastStatePayload, "tournamentId" | "updatedAt">,
) {
  const channel = getBroadcastChannel(tournamentId);

  try {
    const status = await new Promise<string>((resolve) => {
      channel.subscribe((nextStatus) => {
        if (nextStatus === "SUBSCRIBED" || nextStatus === "CHANNEL_ERROR" || nextStatus === "TIMED_OUT") {
          resolve(nextStatus);
        }
      });
    });

    if (status !== "SUBSCRIBED") {
      throw new Error(`Broadcast channel subscription failed: ${status}`);
    }

    const response = await channel.send({
      type: "broadcast",
      event: "state",
      payload: {
        ...payload,
        tournamentId,
        updatedAt: new Date().toISOString(),
      } satisfies BroadcastStatePayload,
    });

    if (response !== "ok") {
      throw new Error("Broadcast message was not acknowledged.");
    }
  } finally {
    await supabase.removeChannel(channel);
  }
}
