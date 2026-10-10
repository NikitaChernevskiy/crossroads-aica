import { useCurrentFrame, useVideoConfig } from "remotion";
import { Panel } from "../components/Panel";
import { Eyebrow, Scene } from "../components/Scene";
import { colors, enter } from "../theme";

const chain = ["Device", "Estimated state", "Behavior guidance", "AI response"];
const OURS = 2;

export const Different: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <Scene id="different" style={{ gap: 50, justifyContent: "center" }}>
      <div style={enter(frame, 0, fps)}>
        <Eyebrow>What's different</Eyebrow>
        <div style={{ fontSize: 62, fontWeight: 800, marginTop: 10, whiteSpace: "nowrap" }}>
          Not another dashboard. <span style={{ color: colors.calm }}>Guidance the agent acts on.</span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        {chain.map((c, i) => (
          <div key={c} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <Panel
              accent={i === OURS ? colors.calm : undefined}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "34px 20px",
                fontSize: 40,
                fontWeight: 800,
                background: i === OURS ? `${colors.calm}22` : undefined,
                ...enter(frame, (1.5 + i * 0.7) * fps, fps),
              }}
            >
              {c}
              {i === OURS ? <div style={{ fontSize: 26, color: colors.calm, marginTop: 6 }}>our layer</div> : null}
            </Panel>
            {i < chain.length - 1 ? <div style={{ fontSize: 56, color: colors.muted, width: 70, textAlign: "center" }}>→</div> : null}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 40 }}>
        <Panel style={{ flex: 1, padding: 30, ...enter(frame, 6.5 * fps, fps) }}>
          <div style={{ fontSize: 28, color: colors.muted }}>Advantage to build</div>
          <div style={{ fontSize: 36, fontWeight: 600, marginTop: 8 }}>
            Integration quality · personal calibration · validated adaptation policies
          </div>
        </Panel>
        <Panel accent={colors.violet} style={{ flex: 1, padding: 30, ...enter(frame, 8.5 * fps, fps) }}>
          <div style={{ fontSize: 28, color: colors.muted }}>Key question we will test</div>
          <div style={{ fontSize: 36, fontWeight: 600, marginTop: 8 }}>Is it better than a "shorter answer" button?</div>
        </Panel>
      </div>
    </Scene>
  );
};
