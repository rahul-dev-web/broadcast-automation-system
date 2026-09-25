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

const REALTIME_TIMEOUT_MS = 5000;

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${REALTIME_TIMEOUT_MS}ms.`)), REALTIME_TIMEOUT_MS);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

export function getBroadcastChannel(tournamentId: string) {
  return supabase.channel(`broadcast:${tournamentId}`, {
    config: {
      broadcast: { self: false, ack: true },
    },
  });
}

/**
 * Realtime is a best-effort overlay notification. The database session is the
 * source of truth, so a disconnected overlay must never block an operator's
 * stage transition or leave its UI stuck in a processing state.
 */
export async function publishBroadcastState(
  tournamentId: string,
  payload: Omit<BroadcastStatePayload, "tournamentId" | "updatedAt">,
) {
  const channel = getBroadcastChannel(tournamentId);

  try {
    const status = await withTimeout(
      new Promise<string>((resolve) => {
        channel.subscribe((nextStatus) => {
          if (nextStatus === "SUBSCRIBED" || nextStatus === "CHANNEL_ERROR" || nextStatus === "TIMED_OUT" || nextStatus === "CLOSED") {
            resolve(nextStatus);
          }
        });
      }),
      "Realtime subscription",
    );

    if (status !== "SUBSCRIBED") {
      console.warn(`Broadcast channel subscription unavailable: ${status}`);
      return;
    }

    const response = await withTimeout(
      channel.send({
        type: "broadcast",
        event: "state",
        payload: {
          ...payload,
          tournamentId,
          updatedAt: new Date().toISOString(),
        } satisfies BroadcastStatePayload,
      }),
      "Realtime broadcast acknowledgement",
    );

    if (response !== "ok") {
      console.warn("Broadcast message was not acknowledged:", response);
    }
  } catch (error) {
    console.warn("Realtime overlay notification failed; persisted session remains authoritative.", error);
  } finally {
    await supabase.removeChannel(channel);
  }
}
