import { useCurrentFrame, useVideoConfig } from "remotion";
import { Chip, Panel } from "../components/Panel";
import { Eyebrow, Note, Scene } from "../components/Scene";
import { colors, emojiFamily, enter } from "../theme";

// Regulation (EU) 2024/1689: Art. 5(1)(f) bans emotion recognition at work and in education
// (medical/safety excepted); Annex III 1(c) makes other emotion recognition high-risk;
// Art. 50(3) requires informing the people exposed to it. Design commitments, not a compliance claim.
// `at`: seconds, synced to the narration (public/voiceover/euact.alignment.json).
const rules = [
  { at: 4.0, icon: "🔒", ref: "GDPR", title: "Data minimisation", body: "Raw signals stay local; only estimated state leaves" },
  { at: 5.1, icon: "👁️", ref: "Art. 50", title: "Users always know", body: "Clear notice and opt-in before any sensing" },
  { at: 6.3, icon: "🚫", ref: "Art. 5", title: "Never at work or school", body: "No emotion recognition on employees or students" },
  { at: 7.7, icon: "🛡️", ref: "Annex III", title: "Built as high-risk AI", body: "Risk management, logging, human oversight" },
];

export const EuAiAct: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <Scene id="euact" style={{ gap: 40, justifyContent: "center" }}>
      <div style={{ ...enter(frame, 0, fps) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Eyebrow>Trust by design</Eyebrow>
          <Chip color={colors.azure} style={{ fontSize: 24, padding: "4px 16px" }}>
            <span style={{ fontFamily: emojiFamily }}>🇪🇺</span> EU AI Act
          </Chip>
        </div>
        <div style={{ fontSize: 62, fontWeight: 800, marginTop: 8 }}>
          Emotion recognition is <span style={{ color: colors.stress }}>high-risk AI</span>.{" "}
          <span style={{ color: colors.calm }}>We build for it.</span>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
        {rules.map((r) => (
          <Panel key={r.title} style={{ display: "flex", alignItems: "center", gap: 26, padding: "26px 32px", ...enter(frame, r.at * fps, fps, 20) }}>
            <div style={{ fontFamily: emojiFamily, fontSize: 64 }}>{r.icon}</div>
            <div>
              <div style={{ fontSize: 22, color: colors.azure, fontWeight: 600, letterSpacing: 2 }}>{r.ref.toUpperCase()}</div>
              <div style={{ fontSize: 38, fontWeight: 800 }}>{r.title}</div>
              <div style={{ fontSize: 26, color: colors.muted }}>{r.body}</div>
            </div>
          </Panel>
        ))}
      </div>
      <Note style={{ ...enter(frame, 8.3 * fps, fps, 0) }}>Our design commitments under Regulation (EU) 2024/1689, not a legal compliance certification.</Note>
    </Scene>
  );
};
