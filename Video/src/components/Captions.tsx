import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import captions from "../data/captions.json";
import { fontFamily } from "../theme";

// Burned-in subtitles. Timings come from scripts/sync.mjs (ElevenLabs alignment, or an estimate).
export const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ms = (frame / fps) * 1000;
  const active = captions.find((c) => ms >= c.startMs && ms < c.endMs);
  if (!active) {
    return null;
  }

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 48 }}>
      <div
        style={{
          fontFamily,
          fontSize: 42,
          fontWeight: 600,
          color: "#FFFFFF",
          background: "rgba(0,0,0,0.72)",
          padding: "10px 28px",
          borderRadius: 12,
          maxWidth: 1500,
          textAlign: "center",
          lineHeight: 1.3,
        }}
      >
        {active.text}
      </div>
    </AbsoluteFill>
  );
};
