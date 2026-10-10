import { useCurrentFrame, useVideoConfig } from "remotion";
import { Chip, Panel } from "../components/Panel";
import { Eyebrow, Note, Scene } from "../components/Scene";
import { colors, emojiFamily, enter } from "../theme";

// Market + revenue in one beat: the jury scores prototype, AI use, problem and demo, not the business plan.
const next = [
  { icon: "🤖", name: "Personal assistants" },
  { icon: "📚", name: "Self-study apps" },
  { icon: "🎧", name: "Customer support" },
  { icon: "🛒", name: "Shopping help" },
];

export const Business: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <Scene id="business" style={{ gap: 36, justifyContent: "center" }}>
      <Eyebrow style={enter(frame, 0, fps)}>Business</Eyebrow>
      <div style={{ display: "flex", gap: 36 }}>
        <Panel accent={colors.calm} style={{ flex: 1.2, ...enter(frame, 0.3 * fps, fps) }}>
          <div style={{ fontSize: 28, color: colors.muted }}>Beachhead</div>
          <div style={{ fontSize: 46, fontWeight: 800, marginTop: 6 }}>
            <span style={{ fontFamily: emojiFamily }}>🧘</span> Wellbeing apps already using wearables
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 20, marginTop: 18 }}>
            <div style={{ fontSize: 110, fontWeight: 800, color: colors.calm, lineHeight: 1 }}>$4.5B</div>
            <div style={{ fontSize: 30, lineHeight: 1.3 }}>
              Health &amp; Fitness in-app purchases, 2025
              <br />
              <span style={{ color: colors.muted, fontSize: 22 }}>Sensor Tower, Feb 2026 · category context</span>
            </div>
          </div>
        </Panel>
        <Panel accent={colors.azure} style={{ flex: 1, ...enter(frame, 6.8 * fps, fps) }}>
          <div style={{ fontSize: 28, color: colors.muted }}>Model</div>
          <div style={{ fontSize: 56, fontWeight: 800, marginTop: 6 }}>
            B2B subscription <span style={{ color: colors.calm }}>+ usage</span>
          </div>
          <div style={{ fontSize: 28, color: colors.muted, marginTop: 12 }}>Base fee per app + active users with adaptation on</div>
          <Note style={{ marginTop: 12, fontSize: 22 }}>Proposed. Pricing to be validated in paid pilots.</Note>
        </Panel>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", ...enter(frame, 9.0 * fps, fps) }}>
        <div style={{ fontSize: 30, fontWeight: 800 }}>Then any agent that works for people:</div>
        {next.map((n, i) => (
          <Chip key={n.name} color={colors.violet} style={{ fontSize: 24, ...enter(frame, (9.3 + i * 0.3) * fps, fps, 10) }}>
            <span style={{ fontFamily: emojiFamily }}>{n.icon}</span> {n.name}
          </Chip>
        ))}
      </div>
    </Scene>
  );
};
