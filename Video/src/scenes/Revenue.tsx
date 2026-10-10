import { useCurrentFrame, useVideoConfig } from "remotion";
import { Panel } from "../components/Panel";
import { Eyebrow, Note, Scene } from "../components/Scene";
import { colors, enter, progress } from "../theme";

const steps = ["3 paid pilots in one segment", "Validate a repeatable need", "Standardize the integration", "Expand to more apps & devices"];

export const Revenue: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <Scene id="revenue" style={{ gap: 50, justifyContent: "center" }}>
      <div style={enter(frame, 0, fps)}>
        <Eyebrow>Business model</Eyebrow>
        <div style={{ fontSize: 96, fontWeight: 800, marginTop: 10 }}>
          B2B subscription <span style={{ color: colors.calm }}>+ usage</span>
        </div>
        <div style={{ fontSize: 40, color: colors.muted, marginTop: 10 }}>
          Base fee per app, plus usage tied to active users with adaptation enabled
        </div>
        <Note style={{ marginTop: 10 }}>Proposed model. Pricing and demand to be validated.</Note>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        {steps.map((s, i) => (
          <div key={s} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <Panel
              accent={i === 0 ? colors.calm : undefined}
              style={{ flex: 1, height: 170, padding: 28, fontSize: 36, fontWeight: 700, ...enter(frame, (6 + i * 0.9) * fps, fps) }}
            >
              <div style={{ fontSize: 24, color: colors.calm, marginBottom: 8 }}>STEP {i + 1}</div>
              {s}
            </Panel>
            {i < steps.length - 1 ? (
              <div style={{ width: 40, height: 4, background: colors.muted, opacity: progress(frame, (6.6 + i * 0.9) * fps, (7 + i * 0.9) * fps) }} />
            ) : null}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 40, fontWeight: 600, ...enter(frame, 10.5 * fps, fps) }}>
        A repeatable product, <span style={{ color: colors.muted }}>not bespoke projects.</span>
      </div>
    </Scene>
  );
};
