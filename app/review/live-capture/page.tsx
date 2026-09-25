"use client";

import { useEffect, useRef, useState } from "react";

export default function LiveCaptureProofPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState("SOURCE_NOT_CONNECTED");
  const [frameCount, setFrameCount] = useState(0);
  const [lastCapture, setLastCapture] = useState<string | null>(null);

  useEffect(() => () => stopCapture(), []);

  async function startCapture() {
    try {
      stopCapture();
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 15, max: 30 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      stream.getVideoTracks()[0]?.addEventListener("ended", stopCapture);
      setStatus("SOURCE_CONNECTED");
      setFrameCount(0);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "CAPTURE_FAILED");
    }
  }

  function captureFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    setLastCapture(canvas.toDataURL("image/jpeg", 0.82));
    setFrameCount((value) => value + 1);
  }

  function stopCapture() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("SOURCE_NOT_CONNECTED");
  }

  return (
    <main className="broadcast-live-shell">
      <div className="broadcast-live-stage ocr-proof">
        <span className="broadcast-kicker">PHASE 0 · LIVE SOURCE PROOF</span>
        <h1>Observer / Capture Source Lab</h1>
        <p>
          This prototype validates the capture boundary before live-player OCR.
          Select the actual observer/capture window or display used by the operator.
        </p>

        <div className="broadcast-test-panel">
          <p>
            Source status: <strong>{status}</strong>
          </p>
          <button type="button" onClick={startCapture}>
            Select Observer / Capture Source
          </button>
          <button type="button" onClick={captureFrame} disabled={status !== "SOURCE_CONNECTED"}>
            Capture Current Frame
          </button>
          <button type="button" onClick={stopCapture}>Stop</button>
          <p>Captured frames: {frameCount}</p>
        </div>

        <video ref={videoRef} muted playsInline className="live-capture-preview" />
        <canvas ref={canvasRef} hidden />
        {lastCapture && (
          <img
            src={lastCapture}
            alt="Captured observer frame"
            className="live-capture-frame"
          />
        )}

        <p className="muted">
          OCR is intentionally not called here until the Google Vision billing/API setup is enabled.
        </p>
      </div>
    </main>
  );
}
