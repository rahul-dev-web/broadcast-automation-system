import { OverlayPreview } from "@/components/broadcast/overlay-preview";

export default function OverlayPreviewPage() {
  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">BROADCAST / PREVIEW</p>
          <h1>Overlay State Preview</h1>
          <p className="muted">
            Local state-machine preview. Realtime and OCR feeds will replace the mock state in later phases.
          </p>
        </div>
      </header>
      <OverlayPreview />
    </main>
  );
}
