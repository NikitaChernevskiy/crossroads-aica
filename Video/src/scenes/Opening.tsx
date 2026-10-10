import { useCurrentFrame, useVideoConfig } from "remotion";
import { AiBubble, UserBubble } from "../components/Chat";
import { Panel } from "../components/Panel";
import { Note, Scene } from "../components/Scene";
import config from "../data/config.json";
import { Face } from "../components/Face";
import { colors, enter, faces } from "../theme";

export const FocusedAnswer: React.FC = () => (
  <>
    Here are three options for tonight:
    <br />
    1. A 30-min run, then cook something new
    <br />
    2. Finish your book chapter, early night
    <br />
    3. Call a friend and plan the weekend
    <br />
    Want a timed schedule for one of them?
  </>
);

export const CalmAnswer: React.FC = () => (
  <>
    Let's keep it simple. First step: make something warm to eat. We can decide the rest after that, no rush.
  </>
);

const Side: React.FC<{
  readonly context: string;
  readonly emoji: string;
  readonly accent: string;
  readonly start: number;
  readonly children: React.ReactNode;
}> = ({ context, emoji, accent, start, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Panel
      accent={accent}
      style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24, ...enter(frame, start * fps, fps) }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <Face emoji={emoji} size={110} color={accent} start={start + 0.3} />
        <div style={{ fontSize: 30, color: accent, fontWeight: 600 }}>{context}</div>
      </div>
      <UserBubble>{config.demoQuestion}</UserBubble>
      <AiBubble style={enter(frame, (start + 1.6) * fps, fps, 20)}>{children}</AiBubble>
    </Panel>
  );
};

export const Opening: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <Scene id="opening" style={{ gap: 40 }}>
      <div style={{ fontSize: 84, fontWeight: 800, textAlign: "center", ...enter(frame, 8.3 * fps, fps) }}>
        Same question. <span style={{ color: colors.calm }}>Different needs.</span>
      </div>
      <div style={{ display: "flex", gap: 50, flex: 1 }}>
        <Side context="Tuesday, 18:30" emoji={faces.focused} accent={colors.azure} start={0.3}>
          <FocusedAnswer />
        </Side>
        <Side context="Friday, 21:40" emoji={faces.tense} accent={colors.calm} start={3.6}>
          <CalmAnswer />
        </Side>
      </div>
      <Note style={{ position: "absolute", right: 130, bottom: 150 }}>Illustration</Note>
    </Scene>
  );
};
