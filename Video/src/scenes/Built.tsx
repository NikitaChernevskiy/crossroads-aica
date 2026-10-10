import { Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Todo } from "../components/Chat";
import { Eyebrow, Scene } from "../components/Scene";
import config from "../data/config.json";
import { colors, emojiFamily, enter } from "../theme";

// "Explain how you built it" is part of the hackathon's judging guidance.
const Tool: React.FC<{ readonly name: string; readonly what: React.ReactNode; readonly start: number; readonly icon?: string; readonly emoji?: string }> = ({
  name,
  what,
  start,
  icon,
  emoji,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div
      style={{
        flex: 1,
        borderRadius: 24,
        border: `2px solid ${colors.border}`,
        background: colors.panel,
        padding: "28px 22px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 12,
        ...enter(frame, start * fps, fps, 20),
      }}
    >
      {icon ? <Img src={staticFile(`icons/${icon}.svg`)} style={{ width: 80, height: 80 }} /> : <div style={{ fontFamily: emojiFamily, fontSize: 66, lineHeight: "80px" }}>{emoji}</div>}
      <div style={{ fontSize: 34, fontWeight: 800 }}>{name}</div>
      <div style={{ fontSize: 24, color: colors.muted, lineHeight: 1.3 }}>{what}</div>
    </div>
  );
};

export const Built: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Scene id="built" style={{ gap: 44, justifyContent: "center" }}>
      <div style={enter(frame, 0, fps)}>
        <Eyebrow>How we built it · this weekend</Eyebrow>
        <div style={{ fontSize: 64, fontWeight: 800, marginTop: 8 }}>Built with AI, for AI agents</div>
      </div>
      <div style={{ display: "flex", gap: 26 }}>
        <Tool
          icon="azure"
          name="Azure SRE Agent"
          what={
            <>
              Backend, MCP server, Azure infra, CI/CD
              <br />
              <span style={{ color: colors.calm, fontWeight: 600 }}>running on an Anthropic Claude model</span>
            </>
          }
          start={0.6}
        />
        <Tool icon="foundry" name="Microsoft Foundry" what="Agent Service + MCP tool call" start={1.1} />
        <Tool emoji="✳️" name="Claude Code" what="This pitch video + narration pipeline" start={1.6} />
        <Tool emoji="💜" name="Lovable" what={config.lovableContribution || <Todo>what Lovable built</Todo>} start={2.1} />
      </div>
    </Scene>
  );
};
