import { Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Face } from "../components/Face";
import { Chip, Panel } from "../components/Panel";
import { Eyebrow, Scene } from "../components/Scene";
import { colors, emojiFamily, enter, faces, monoFamily } from "../theme";

// Hackathon theme "AI That Does the Work": "Don't rebuild the agent. Build what it can't do without you."
const Device: React.FC<{ readonly src: string; readonly name: string; readonly start: number }> = ({ src, name, start }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, ...enter(frame, start * fps, fps, 20) }}>
      <div style={{ width: 230, height: 190, borderRadius: 20, background: "#FFF", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Img src={staticFile(src)} style={{ width: 230, height: 230, objectFit: "cover" }} />
      </div>
      <div style={{ fontSize: 26, fontWeight: 800 }}>{name}</div>
    </div>
  );
};

const Arrow: React.FC<{ readonly start: number }> = ({ start }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return <div style={{ fontSize: 64, color: colors.muted, width: 80, textAlign: "center", ...enter(frame, start * fps, fps, 0) }}>→</div>;
};

const agents = [
  { icon: "🧘", name: "Wellbeing apps", first: true },
  { icon: "🤖", name: "Personal assistants" },
  { icon: "🎧", name: "Customer support" },
];

export const Product: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <Scene id="product" style={{ gap: 40, justifyContent: "center" }}>
      <div style={enter(frame, 0, fps)}>
        <Eyebrow>AI that does the work · built for any agent</Eyebrow>
        <div style={{ fontSize: 72, fontWeight: 800, marginTop: 8 }}>
          We don't rebuild the agent. <span style={{ color: colors.calm }}>We give it what it can't know.</span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* The person and the wearables they already own */}
        <Panel accent={colors.violet} style={{ display: "flex", alignItems: "center", gap: 22, padding: "24px 28px", ...enter(frame, 1.2 * fps, fps) }}>
          {/* Real hardware: teammate Nikita wearing the Muse S Athena */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, ...enter(frame, 1.4 * fps, fps, 20) }}>
            <div style={{ position: "relative", width: 190, height: 190 }}>
              <Img src={staticFile("nikita-muse.jpg")} style={{ width: 190, height: 190, objectFit: "cover", objectPosition: "50% 22%", borderRadius: 20 }} />
              <Face emoji={faces.tense} size={76} color={colors.stress} start={1.8} style={{ position: "absolute", right: -18, bottom: -14 }} />
            </div>
            <div style={{ fontSize: 26, fontWeight: 800 }}>Nikita, team test</div>
          </div>
          <Device src="muse-s-athena.jpg" name="Muse S Athena" start={1.8} />
          <Device src="neurable-one.jpg" name="Neurable One" start={2.2} />
        </Panel>
        <Arrow start={3.8} />
        {/* Our layer */}
        <Panel accent={colors.calm} style={{ flex: 1, textAlign: "center", padding: "30px 24px", background: `${colors.calm}1A`, ...enter(frame, 4.0 * fps, fps) }}>
          <div style={{ fontSize: 40, fontWeight: 800 }}>AI Emotional Partner</div>
          <div style={{ fontSize: 28, color: colors.calm, marginTop: 8 }}>How the person feels</div>
          <div style={{ fontSize: 24, color: colors.muted, marginTop: 14, fontFamily: monoFamily }}>one MCP tool</div>
        </Panel>
        <Arrow start={7.4} />
        {/* Any agent */}
        <Panel accent={colors.azure} style={{ display: "flex", flexDirection: "column", gap: 12, padding: "24px 28px", ...enter(frame, 7.6 * fps, fps) }}>
          <div style={{ fontSize: 26, color: colors.muted }}>Any AI agent</div>
          {agents.map((a, i) => (
            <div key={a.name} style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 32, fontWeight: a.first ? 800 : 600, ...enter(frame, (7.9 + i * 0.3) * fps, fps, 10) }}>
              <span style={{ fontFamily: emojiFamily, fontSize: 38 }}>{a.icon}</span>
              {a.name}
              {a.first ? <Chip color={colors.calm} style={{ fontSize: 20, padding: "2px 12px" }}>first</Chip> : null}
            </div>
          ))}
        </Panel>
      </div>
      <div style={{ fontSize: 40, fontWeight: 600, ...enter(frame, 9.0 * fps, fps) }}>
        We sell to app developers, <span style={{ color: colors.muted }}>not wearables to consumers.</span>
      </div>
    </Scene>
  );
};
