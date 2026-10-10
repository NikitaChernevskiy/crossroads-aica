import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { Todo } from "../components/Chat";
import { Chip, Panel } from "../components/Panel";
import { Eyebrow, Scene } from "../components/Scene";
import config from "../data/config.json";
import { colors, emojiFamily, enter, monoFamily } from "../theme";

const asks = [
  { icon: "🧪", title: "Large-scale validation", body: "Studies on real users and real emotions" },
  { icon: "⌚💍", title: "Many more devices", body: "New EEG headsets, fitness bands, smart rings" },
  { icon: "💬", title: "Conversation analysis", body: "Emotion from wording in AI-agent sessions" },
  { icon: "🔁", title: "Train with wearables", body: "…then adapt for users without them" },
];

const Ask: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ padding: "80px 130px 190px", gap: 34, justifyContent: "center" }}>
      <div style={enter(frame, 0, fps)}>
        <Eyebrow>Our ask · deep tech roadmap</Eyebrow>
        <div style={{ fontSize: 60, fontWeight: 800, marginTop: 8 }}>
          Invest in <span style={{ color: colors.calm }}>emotional intelligence</span> for every AI agent
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {asks.map((a, i) => (
          <Panel key={a.title} style={{ display: "flex", alignItems: "center", gap: 24, padding: "22px 30px", ...enter(frame, (0.6 + i * 0.6) * fps, fps, 20) }}>
            <div style={{ fontFamily: emojiFamily, fontSize: 56, minWidth: 80, textAlign: "center" }}>{a.icon}</div>
            <div>
              <div style={{ fontSize: 36, fontWeight: 800 }}>{a.title}</div>
              <div style={{ fontSize: 26, color: colors.muted }}>{a.body}</div>
            </div>
          </Panel>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", ...enter(frame, 3.4 * fps, fps, 10) }}>
        <div style={{ fontSize: 30, color: colors.muted }}>Partners we seek:</div>
        <Chip color={colors.violet} style={{ fontSize: 28 }}>Emerging EEG device makers</Chip>
        <Chip color={colors.azure} style={{ fontSize: 28 }}>AI agent platforms, e.g. Microsoft Copilot Studio, Salesforce Agentforce</Chip>
      </div>
    </AbsoluteFill>
  );
};

const FinalCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center", gap: 24, paddingBottom: 100 }}>
      <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.15, ...enter(frame, 0, fps) }}>
        Not everything is measured in money.
        <br />
        <span style={{ color: colors.calm }}>
          How people feel matters too. <span style={{ fontFamily: emojiFamily }}>💙</span>
        </span>
      </div>
      <div style={{ fontSize: 64, fontWeight: 800, marginTop: 30, ...enter(frame, 1.2 * fps, fps) }}>AI Emotional Partner</div>
      <div style={{ fontSize: 40, fontWeight: 600, color: colors.calm, fontFamily: monoFamily, ...enter(frame, 1.4 * fps, fps) }}>
        {config.websiteUrl}
      </div>
      <div style={{ fontSize: 32, color: colors.muted, ...enter(frame, 1.6 * fps, fps) }}>
        {config.teamName} · <span style={{ fontFamily: monoFamily }}>{config.repoUrl}</span>
      </div>
      <div style={{ fontSize: 30, color: colors.muted, ...enter(frame, 1.9 * fps, fps) }}>
        Built with Azure SRE Agent · Claude Code · {config.lovableContribution ? "Lovable" : <Todo>Lovable: what it built (e.g. landing page)</Todo>} ·
        on Azure &amp; Microsoft Foundry
      </div>
    </AbsoluteFill>
  );
};

// Switch to the hook as the narration says "Not everything…" (see voiceover/close.alignment.json).
const ASK_SEC = 8.8;

export const Close: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <Scene id="close" style={{ padding: 0 }}>
      <Sequence name="Ask" durationInFrames={ASK_SEC * fps} premountFor={fps}>
        <Ask />
      </Sequence>
      <Sequence name="Hook + final card" from={ASK_SEC * fps} premountFor={fps}>
        <FinalCard />
      </Sequence>
    </Scene>
  );
};
