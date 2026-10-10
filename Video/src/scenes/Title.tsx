import { Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
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
    <Scene id="title" style={{ justifyContent: "center", alignItems: "center", gap: 56, paddingBottom: 120 }}>
      <div style={{ textAlign: "center", ...enter(frame, 0, fps) }}>
        <Eyebrow>Crossroads AI Hackathon · AI That Does the Work</Eyebrow>
        <div style={{ fontSize: 120, fontWeight: 800, marginTop: 10 }}>
          AI Emotional <span style={{ color: colors.calm }}>Partner</span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        {/* Person + wearable */}
        <div style={{ position: "relative", ...enter(frame, 0.5 * fps, fps, 20) }}>
          <Face emoji={calm > 0.5 ? faces.focused : faces.tense} size={200} color={calm > 0.5 ? colors.calm : colors.stress} start={0.5} />
          <div style={{ position: "absolute", right: -26, bottom: -6, width: 96, height: 66, borderRadius: 12, background: "#FFF", overflow: "hidden", boxShadow: "0 6px 20px rgba(0,0,0,.4)" }}>
            <Img src={staticFile("muse-s-athena.jpg")} style={{ width: 96, height: 96, objectFit: "cover", marginTop: -15 }} />
          </div>
        </div>
        {/* Signal */}
        <svg width={300} height={80} style={{ opacity: wave }}>
          <path d={path} fill="none" stroke={colors.violet} strokeWidth={5} strokeLinecap="round" strokeDasharray={900} strokeDashoffset={900 * (1 - wave)} />
        </svg>
        {/* AI */}
        <div
          style={{
            width: 170,
            height: 170,
            borderRadius: 40,
            border: `3px solid ${colors.azure}`,
            background: `${colors.azure}1F`,
            boxShadow: `0 0 ${40 + 30 * Math.sin(frame / 8)}px ${colors.azure}55`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: emojiFamily,
            fontSize: 96,
            ...enter(frame, 1.3 * fps, fps, 20),
          }}
        >
          🤖
        </div>
        <div style={{ fontSize: 64, color: colors.muted, ...enter(frame, 1.9 * fps, fps, 0) }}>→</div>
        {/* Adapted reply */}
        <div
          style={{
            maxWidth: 470,
            padding: "26px 32px",
            borderRadius: "28px 28px 28px 6px",
            background: `${colors.calm}22`,
            border: `2px solid ${colors.calm}`,
            fontSize: 38,
            fontWeight: 600,
            lineHeight: 1.3,
            ...enter(frame, 2.0 * fps, fps, 20),
          }}
        >
          Let's take it one step at a time. <span style={{ fontFamily: emojiFamily }}>💙</span>
        </div>
      </div>
      <div style={{ fontSize: 40, color: colors.muted, ...enter(frame, 2.7 * fps, fps, 10) }}>
        AI that adapts to <span style={{ color: colors.text, fontWeight: 800 }}>how you feel</span>, not just what you ask.
      </div>
    </Scene>
  );
};
