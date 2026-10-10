import { Video } from "@remotion/media";
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Chip, Panel } from "../components/Panel";
import { Scene } from "../components/Scene";
import config from "../data/config.json";
import guidance from "../data/guidance.json";
import media from "../data/media.json";
import { Face } from "../components/Face";
import { colors, enter, faces, monoFamily } from "../theme";

const MAX_LINES = 4;

const Half: React.FC<{
  readonly label: string;
  readonly emoji: string;
  readonly accent: string;
  readonly indicators: string;
  readonly instructions: string[];
  readonly file: string;
  readonly available: boolean;
  readonly trimStart: number;
  readonly placeholder: { title: string; steps: string[] };
}> = ({ label, emoji, accent, indicators, instructions, file, available, trimStart, placeholder }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const shown = instructions.slice(0, MAX_LINES);
  const hidden = instructions.length - shown.length;

  return (
    <AbsoluteFill style={{ flexDirection: "row", gap: 40, padding: "200px 130px 190px" }}>
      <div
        style={{
          flex: 1.55,
          borderRadius: 20,
          overflow: "hidden",
          border: `2px solid ${accent}`,
          background: "#0E1430",
          position: "relative",
          ...enter(frame, 0, fps, 20),
        }}
      >
        {available ? (
          <Video
            name={`Recording: ${label}`}
            src={staticFile(file)}
            trimBefore={Math.round(trimStart * fps)}
            durationInFrames={durationInFrames}
            premountFor={fps}
            objectFit="contain"
            muted
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <AbsoluteFill
            style={{
              justifyContent: "center",
              alignItems: "flex-start",
              gap: 18,
              padding: "40px 56px",
              border: `4px dashed ${colors.stress}`,
              borderRadius: 20,
            }}
          >
            <div style={{ fontSize: 26, fontWeight: 800, color: colors.stress, letterSpacing: 3 }}>PLACEHOLDER · SCREEN RECORDING</div>
            <div style={{ fontSize: 40, fontWeight: 800 }}>{placeholder.title}</div>
            {placeholder.steps.map((s, i) => (
              <div key={s} style={{ fontSize: 28, color: colors.text, lineHeight: 1.35 }}>
                <span style={{ color: colors.stress, fontWeight: 800 }}>{i + 1}.</span> {s}
              </div>
            ))}
            <div style={{ fontSize: 24, color: colors.muted, fontFamily: monoFamily }}>→ save as public/{file}</div>
          </AbsoluteFill>
        )}
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
        <Panel accent={accent} style={{ padding: 28, ...enter(frame, 0.4 * fps, fps, 20) }}>
          <div style={{ fontSize: 26, color: colors.muted }}>Estimated state · {config.demoInputLabel.toLowerCase()}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 22, marginTop: 6 }}>
            <Face emoji={emoji} size={120} color={accent} start={0.5} />
            <div>
              <div style={{ fontSize: 44, fontWeight: 800, color: accent }}>{label}</div>
              <div style={{ fontSize: 26, fontFamily: monoFamily, color: colors.muted }}>{indicators}</div>
            </div>
          </div>
        </Panel>
        <Panel style={{ padding: 28, flex: 1, ...enter(frame, 1.6 * fps, fps, 20) }}>
          <div style={{ fontSize: 26, color: colors.muted, fontFamily: monoFamily, marginBottom: 14 }}>
            get_behavior_guidance → instructions
          </div>
          {shown.map((line, i) => (
            <div key={line} style={{ fontSize: 30, lineHeight: 1.35, marginBottom: 10, ...enter(frame, (2 + i * 0.35) * fps, fps, 10) }}>
              • {line}
            </div>
          ))}
          {hidden > 0 ? (
            <div style={{ fontSize: 24, color: colors.muted, fontStyle: "italic" }}>Excerpt · +{hidden} more instructions</div>
          ) : null}
        </Panel>
      </div>
    </AbsoluteFill>
  );
};

export const Demo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <Scene id="demo" style={{ padding: 0 }}>
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 130,
          right: 130,
          display: "flex",
          alignItems: "center",
          gap: 24,
          ...enter(frame, 0, fps),
        }}
      >
        <Chip color={colors.calm}>Reference build</Chip>
        <Chip color={colors.violet}>{config.demoInputLabel}</Chip>
        <div style={{ fontSize: 40, fontWeight: 600 }}>
          Same question: <span style={{ color: colors.calm }}>"{config.demoQuestion}"</span>
        </div>
      </div>
      <Sequence name="Focused state" from={1 * fps} durationInFrames={11.5 * fps} premountFor={fps}>
        <Half
          label="Focused"
          emoji={faces.focused}
          accent={colors.azure}
          indicators="stress 0.15 · focus 0.80"
          instructions={guidance.focused.instructions}
          file="demo-focused.mp4"
          available={media.demoFocused}
          trimStart={config.demoFocusedTrimStart}
          placeholder={{
            title: "Sensor client + chat, focused state",
            steps: [
              "Simulator set to Focused (stress 0.15, focus 0.80)",
              `User asks: "${config.demoQuestion}"`,
              "Agent replies in detail: several options, structured",
              "~11 s, chat zoomed so the reply is readable",
            ],
          }}
        />
      </Sequence>
      <Sequence name="Tense state" from={12.5 * fps} durationInFrames={9.5 * fps} premountFor={fps}>
        <Half
          label="Tense"
          emoji={faces.tense}
          accent={colors.calm}
          indicators="stress 0.68 · focus 0.41"
          instructions={guidance.tense.instructions}
          file="demo-tense.mp4"
          available={media.demoTense}
          trimStart={config.demoTenseTrimStart}
          placeholder={{
            title: "Same chat, tense state",
            steps: [
              "Simulator set to Tense (stress 0.68, focus 0.41)",
              `Same question: "${config.demoQuestion}"`,
              "Agent replies short and calm: one next step",
              "~9 s, same agent and settings as the focused clip",
            ],
          }}
        />
      </Sequence>
    </Scene>
  );
};
