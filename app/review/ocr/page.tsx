"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

type ExpectedTeam = { teamNumber: number; teamName: string };

export default function OcrProofPage() {
  const [matchId, setMatchId] = useState("");
  const [teamsJson, setTeamsJson] = useState('[{"teamNumber":1,"teamName":"Team Alpha"},{"teamNumber":2,"teamName":"Team Bravo"}]');
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function runOcr() {
    setError(""); setResult(null);
    if (!matchId || !file) { setError("Match ID and screenshot are required."); return; }

    let expectedTeams: ExpectedTeam[];
    try {
      expectedTeams = JSON.parse(teamsJson);
      if (!Array.isArray(expectedTeams) || expectedTeams.length === 0) throw new Error();
    } catch {
      setError('Expected teams must be valid JSON: [{"teamNumber":1,"teamName":"Team Alpha"}]');
      return;
    }

    setBusy(true);
    try {
      const imageBase64 = await fileToBase64(file);
      const { data, error: invokeError } = await supabase.functions.invoke("final-standing-ocr", {
        body: { matchId, imageBase64, expectedTeams },
      });
      if (invokeError) throw invokeError;
      setResult(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "OCR request failed.");
    } finally { setBusy(false); }
  }

  return (
    <main className="broadcast-live-shell">
      <div className="broadcast-live-stage ocr-proof">
        <span className="broadcast-kicker">PHASE 0 · OCR PROOF</span>
        <h1>Final Standing OCR</h1>
        <p>One screenshot → OCR proposal. Nothing becomes official on this screen.</p>
        <label>Match ID<input value={matchId} onChange={(event) => setMatchId(event.target.value)} placeholder="UUID of an existing match" /></label>
        <label>Expected teams JSON<textarea value={teamsJson} onChange={(event) => setTeamsJson(event.target.value)} rows={7} /></label>
        <label>Final standing screenshot<input type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
        <button type="button" onClick={runOcr} disabled={busy}>{busy ? "Running OCR…" : "Run Final Standing OCR"}</button>
        {error && <pre className="ocr-error">{error}</pre>}
        {result && <pre className="ocr-result">{JSON.stringify(result, null, 2)}</pre>}
      </div>
    </main>
  );
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image."));
    reader.readAsDataURL(file);
  });
}
