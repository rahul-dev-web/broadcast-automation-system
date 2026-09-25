"use client";

import { useEffect, useMemo, useState } from "react";
import { getBroadcastChannel, type BroadcastStatePayload } from "@/lib/realtime/broadcast";

export function BroadcastTestPanel({ tournamentId }: { tournamentId: string }) {
  const channel = useMemo(() => getBroadcastChannel(tournamentId), [tournamentId]);
  const [status, setStatus] = useState("CONNECTING");
  const [message, setMessage] = useState("Waiting for connection…");
  const [stage, setStage] = useState<BroadcastStatePayload["stage"]>("ROOM");

  useEffect(() => {
    channel.subscribe((nextStatus) => setStatus(nextStatus));
    return () => {
      void channel.unsubscribe();
    };
  }, [channel]);

  async function sendTestState() {
    const payload: BroadcastStatePayload = {
      stage,
      tournamentId,
      matchNumber: 1,
      inputMode: "OCR",
      currentPlayer: {
        teamId: "test-team",
        teamNumber: 1,
        registeredName: "Rahul Kumar",
        inGameName: "XYZ_RJ",
      },
      updatedAt: new Date().toISOString(),
    };

    const response = await channel.send({
      type: "broadcast",
      event: "state",
      payload,
    });

    setMessage(response === "ok" ? "Broadcast acknowledged." : `Broadcast response: ${response}`);
  }

  return (
    <section className="broadcast-test-panel">
      <p>Connection: <strong>{status}</strong></p>
      <label>
        Stage
        <select value={stage} onChange={(event) => setStage(event.target.value as BroadcastStatePayload["stage"])}>
          <option value="ROOM">ROOM</option>
          <option value="MATCH_LIVE">MATCH LIVE</option>
          <option value="MATCH_REVIEW">MATCH REVIEW</option>
          <option value="MATCH_VERIFIED">MATCH VERIFIED</option>
          <option value="MATCH_PT">MATCH PT</option>
          <option value="OVERALL">OVERALL</option>
          <option value="THANK_YOU">THANK YOU</option>
        </select>
      </label>
      <button type="button" onClick={sendTestState} disabled={status !== "SUBSCRIBED"}>
        Send Test Broadcast
      </button>
      <p>{message}</p>
      <p>Overlay URL: <code>/overlay/live?tournament={tournamentId}</code></p>
    </section>
  );
}
