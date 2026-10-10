import { Video } from "@remotion/media";
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Chip, Panel } from "../components/Panel";
import { Scene } from "../components/Scene";
import config from "../data/config.json";
import guidance from "../data/guidance.json";
import media from "../data/media.json";
import { colors, enter, monoFamily } from "../theme";

const MAX_LINES = 4;

const Half: React.FC<{
  readonly label: string;
  readonly accent: string;
  readonly indicators: string;
  readonly instructions: string[];
  readonly file: string;
  readonly available: boolean;
  readonly trimStart: number;
}> = ({ label, accent, indicators, instructions, file, available, trimStart }) => {
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
          <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 16, padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 44, fontWeight: 800, color: colors.stress }}>Recording needed</div>
            <div style={{ fontSize: 30, color: colors.muted, fontFamily: monoFamily }}>public/{file}</div>
            <div style={{ fontSize: 28, color: colors.muted }}>
              "{config.demoQuestion}" · {label.toLowerCase()} state
            </div>
          </AbsoluteFill>
        )}
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
        <Panel accent={accent} style={{ padding: 28, ...enter(frame, 0.4 * fps, fps, 20) }}>
          <div style={{ fontSize: 26, color: colors.muted }}>Estimated state · {config.demoInputLabel.toLowerCase()}</div>
          <div style={{ fontSize: 52, fontWeight: 800, color: accent }}>{label}</div>
          <div style={{ fontSize: 28, fontFamily: monoFamily, color: colors.muted }}>{indicators}</div>
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
      <Sequence name="Focused state" from={1 * fps} durationInFrames={12.5 * fps} premountFor={fps}>
        <Half
          label="Focused"
          accent={colors.azure}
          indicators="stress 0.15 · focus 0.80"
          instructions={guidance.focused.instructions}
          file="demo-focused.mp4"
          available={media.demoFocused}
          trimStart={config.demoFocusedTrimStart}
        />
      </Sequence>
      <Sequence name="Tense state" from={13.5 * fps} durationInFrames={13.5 * fps} premountFor={fps}>
        <Half
          label="Tense"
          accent={colors.calm}
          indicators="stress 0.68 · focus 0.41"
          instructions={guidance.tense.instructions}
          file="demo-tense.mp4"
          available={media.demoTense}
          trimStart={config.demoTenseTrimStart}
        />
      </Sequence>
    </Scene>
  );
};
