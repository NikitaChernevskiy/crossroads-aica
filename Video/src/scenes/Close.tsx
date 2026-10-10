import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { AiBubble, Todo, UserBubble } from "../components/Chat";
import { Panel } from "../components/Panel";
import { Eyebrow, Scene } from "../components/Scene";
import config from "../data/config.json";
import { colors, enter, monoFamily } from "../theme";
import { CalmAnswer } from "./Opening";

const Milestone: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ flexDirection: "row", gap: 60, alignItems: "center", padding: "90px 130px 190px" }}>
      <Panel accent={colors.calm} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20, ...enter(frame, 0, fps) }}>
        <UserBubble>{config.demoQuestion}</UserBubble>
        <AiBubble>
          <CalmAnswer />
        </AiBubble>
      </Panel>
      <div style={{ flex: 1.1, ...enter(frame, 0.4 * fps, fps) }}>
        <Eyebrow>Next milestone</Eyebrow>
        <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.2, marginTop: 12 }}>
          Three paid pilots.
          <br />
          <span style={{ color: colors.muted }}>Validate user value.</span>
          <br />
          <span style={{ color: colors.muted }}>Validate willingness to pay.</span>
        </div>
        <div style={{ fontSize: 34, color: colors.calm, marginTop: 24 }}>
          Looking for wellbeing apps with wearable integrations to pilot with us.
        </div>
      </div>
    </AbsoluteFill>
  );
};

const FinalCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center", gap: 24, paddingBottom: 100 }}>
      <div style={{ fontSize: 130, fontWeight: 800, ...enter(frame, 0, fps) }}>AI Emotional Partner</div>
      <div style={{ fontSize: 60, color: colors.calm, fontWeight: 600, ...enter(frame, 0.4 * fps, fps) }}>
        Same question. Better-fit support.
      </div>
      <div style={{ fontSize: 32, color: colors.muted, marginTop: 30, ...enter(frame, 0.9 * fps, fps) }}>
        {config.teamName} · <span style={{ fontFamily: monoFamily }}>{config.repoUrl}</span>
      </div>
      <div style={{ fontSize: 30, color: colors.muted, ...enter(frame, 1.3 * fps, fps) }}>
        Built with Claude Code · {config.lovableContribution ? "Lovable" : <Todo>Lovable contribution</Todo>} · on Azure &amp;
        Microsoft Foundry
      </div>
    </AbsoluteFill>
  );
};

export const Close: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <Scene id="close" style={{ padding: 0 }}>
      <Sequence name="Milestone" durationInFrames={4.5 * fps} premountFor={fps}>
        <Milestone />
      </Sequence>
      <Sequence name="Final card" from={4.5 * fps} premountFor={fps}>
        <FinalCard />
      </Sequence>
    </Scene>
  );
};
