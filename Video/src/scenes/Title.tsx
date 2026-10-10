import { Video } from "@remotion/media";
import { interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Face } from "../components/Face";
import { Eyebrow, Scene } from "../components/Scene";
import { colors, emojiFamily, enter, faces, progress } from "../theme";

// Silent title card: the whole idea in one picture.
// Tense person wearing EEG → AI notices → reply adapts → person calms down.
export const Title: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = frame / fps;
  const calm = progress(frame, 2.4 * fps, 2.9 * fps);
  const wave = progress(frame, 0.9 * fps, 1.5 * fps);
  const t = frame;
  const path = Array.from({ length: 61 }, (_, i) => {
    const x = (i / 60) * 300;
    const amp = interpolate(s, [1, 2.6], [16, 5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const y = 40 + Math.sin(i * 0.9 + t * 0.3) * amp * Math.sin((i / 60) * Math.PI);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return (
    <Scene id="title" style={{ flexDirection: "row", alignItems: "center", gap: 70, padding: "120px 130px 150px" }}>
      {/* Real footage: Nikita wearing the Muse S Athena */}
      <div style={{ position: "relative", width: 450, height: 800, flexShrink: 0, borderRadius: 28, overflow: "hidden", border: `2px solid ${colors.violet}`, boxShadow: `0 0 70px ${colors.violet}44`, ...enter(frame, 0, fps, 20) }}>
        <Video src={staticFile("nikita-muse.mp4")} trimBefore={Math.round(3 * fps)} muted objectFit="cover" style={{ width: "100%", height: "100%" }} />
        <div style={{ position: "absolute", left: 18, bottom: 18, padding: "6px 14px", borderRadius: 999, background: "rgba(7,11,26,.75)", fontSize: 22, fontWeight: 600 }}>
          Muse S Athena · EEG
        </div>
        <div style={{ position: "absolute", right: 14, top: 14 }}>
          <Face emoji={calm > 0.5 ? faces.focused : faces.tense} size={110} color={calm > 0.5 ? colors.calm : colors.stress} start={0.6} />
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 44 }}>
        <div style={enter(frame, 0.2 * fps, fps)}>
          <Eyebrow>Crossroads AI Hackathon · AI That Does the Work</Eyebrow>
          <div style={{ fontSize: 104, fontWeight: 800, marginTop: 10, lineHeight: 1.05 }}>
            AI Emotional <span style={{ color: colors.calm }}>Partner</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg width={220} height={80} viewBox="0 0 300 80" style={{ opacity: wave }}>
            <path d={path} fill="none" stroke={colors.violet} strokeWidth={6} strokeLinecap="round" strokeDasharray={900} strokeDashoffset={900 * (1 - wave)} />
          </svg>
          <div
            style={{
              width: 140,
              height: 140,
              flexShrink: 0,
              borderRadius: 34,
              border: `3px solid ${colors.azure}`,
              background: `${colors.azure}1F`,
              boxShadow: `0 0 ${40 + 30 * Math.sin(frame / 8)}px ${colors.azure}55`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: emojiFamily,
              fontSize: 80,
              ...enter(frame, 1.3 * fps, fps, 20),
            }}
          >
            🤖
          </div>
          <div style={{ fontSize: 56, color: colors.muted, ...enter(frame, 1.9 * fps, fps, 0) }}>→</div>
          <div
            style={{
              maxWidth: 440,
              padding: "22px 28px",
              borderRadius: "28px 28px 28px 6px",
              background: `${colors.calm}22`,
              border: `2px solid ${colors.calm}`,
              fontSize: 34,
              fontWeight: 600,
              lineHeight: 1.3,
              ...enter(frame, 2.0 * fps, fps, 20),
            }}
          >
            Let's take it one step at a time. <span style={{ fontFamily: emojiFamily }}>💙</span>
          </div>
        </div>
        <div style={{ fontSize: 38, color: colors.muted, ...enter(frame, 2.7 * fps, fps, 10) }}>
          AI that adapts to <span style={{ color: colors.text, fontWeight: 800 }}>how you feel</span>, not just what you ask.
        </div>
      </div>
    </Scene>
  );
};
