import { useCurrentFrame, useVideoConfig } from "remotion";
import { Panel } from "../components/Panel";
import { Eyebrow, Note, Scene } from "../components/Scene";
import { colors, enter } from "../theme";

export const Market: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <Scene id="market" style={{ gap: 44, justifyContent: "center" }}>
      <Eyebrow style={enter(frame, 0, fps)}>Market context</Eyebrow>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 50, ...enter(frame, 0.4 * fps, fps) }}>
        <div style={{ fontSize: 200, fontWeight: 800, lineHeight: 0.9, color: colors.calm }}>$4.5B</div>
        <div style={{ fontSize: 44, lineHeight: 1.3, paddingBottom: 6 }}>
          Health &amp; Fitness app in-app purchases, 2025
          <br />
          <span style={{ color: colors.calm }}>+13% year over year</span>
        </div>
      </div>
      <div style={enter(frame, 1.2 * fps, fps)}>
        <div style={{ fontSize: 28, color: colors.muted }}>
          Source: Sensor Tower, "Health &amp; Fitness Apps See Surging Revenue Fueled by AI," February 2026
        </div>
        <Note style={{ marginTop: 8 }}>Category context, not our addressable market.</Note>
      </div>
      <Panel accent={colors.azure} style={{ alignSelf: "flex-start", padding: "30px 44px", ...enter(frame, 6.5 * fps, fps) }}>
        <div style={{ fontSize: 30, color: colors.muted }}>Where we start</div>
        <div style={{ fontSize: 60, fontWeight: 800 }}>Wellbeing apps already integrating wearables</div>
      </Panel>
    </Scene>
  );
};
