import { useCurrentFrame, useVideoConfig } from "remotion";
import { Chip, Panel } from "../components/Panel";
import { Eyebrow, Scene } from "../components/Scene";
import { colors, enter } from "../theme";

const Node: React.FC<{
  readonly title: string;
  readonly role: string;
  readonly accent: string;
  readonly start: number;
  readonly highlight?: boolean;
}> = ({ title, role, accent, start, highlight }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Panel
      accent={highlight ? accent : undefined}
      style={{ flex: 1, textAlign: "center", padding: "40px 30px", ...enter(frame, start * fps, fps) }}
    >
      <div style={{ fontSize: 46, fontWeight: 800 }}>{title}</div>
      <div style={{ fontSize: 32, color: accent, marginTop: 12, fontWeight: 600 }}>{role}</div>
    </Panel>
  );
};

const Arrow: React.FC<{ readonly start: number; readonly label: string }> = ({ start, label }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ textAlign: "center", color: colors.muted, width: 150, ...enter(frame, start * fps, fps, 0) }}>
      <div style={{ fontSize: 26 }}>{label}</div>
      <div style={{ fontSize: 60 }}>→</div>
    </div>
  );
};

export const Product: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <Scene id="product" style={{ gap: 56, justifyContent: "center" }}>
      <div style={enter(frame, 0, fps)}>
        <Eyebrow>AI Emotional Partner</Eyebrow>
        <div style={{ fontSize: 84, fontWeight: 800, marginTop: 12 }}>An integration layer for wellbeing apps</div>
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <Node title="Person" role="Uses the app + a wearable" accent={colors.violet} start={1.2} />
        <Arrow start={2} label="uses" />
        <Node title="Wellbeing app" role="Our customer · pays" accent={colors.azure} start={2.4} highlight />
        <Arrow start={3.2} label="integrates" />
        <Node title="AI Emotional Partner" role="Adapts the app's AI" accent={colors.calm} start={3.6} highlight />
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 20, ...enter(frame, 6.5 * fps, fps) }}>
        <div style={{ fontSize: 48, fontWeight: 600 }}>
          We sell to app developers, <span style={{ color: colors.muted }}>not wearables to consumers.</span>
        </div>
        <Chip color={colors.azure}>Buyer: founder or product lead</Chip>
      </div>
    </Scene>
  );
};
