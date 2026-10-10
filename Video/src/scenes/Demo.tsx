import { Video } from "@remotion/media";
import { interpolate, Sequence, Series, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Face } from "../components/Face";
import { Chip, Panel } from "../components/Panel";
import { Scene } from "../components/Scene";
import type { SceneId } from "../components/Voiceover";
import config from "../data/config.json";
import guidance from "../data/guidance.json";
import { colors, enter, faces, monoFamily, progress } from "../theme";

// Playwright recordings of the live reference build (sensor client in simulation mode →
// Azure backend → Foundry agent), 1280×800. Timings in assets-src/demo-timings.json.
// Each take plays three cuts: profile + live chart, typing + send, then the reply.
// The agent's wait between send and reply is cut out and labelled on screen.
type Take = {
  readonly id: SceneId;
  readonly file: string;
  readonly label: string;
  readonly emoji: string;
  readonly accent: string;
  readonly indicators: string;
  readonly instructions: string[];
  readonly startAt: number; // seconds into the scene
  readonly segments: [number, number][]; // [from, to] seconds in the recording
  readonly waitSec: number;
  readonly zoom: { scale: number; origin: string };
};

const takes: Record<"focused" | "stressed", Take> = {
  focused: {
    id: "demo",
    file: "demo-focused.mp4",
    label: "Calm & focused",
    emoji: faces.focused,
    accent: colors.azure,
    indicators: "stress 0.15\nfocus 0.80",
    instructions: guidance.focused.instructions,
    startAt: 1,
    segments: [
      [1.8, 5.0],
      [6.0, 8.9],
      [26.0, 32.9],
    ],
    waitSec: 18,
    zoom: { scale: 1.3, origin: "92% 45%" },
  },
  stressed: {
    id: "demostress",
    file: "demo-stressed.mp4",
    label: "Stressed",
    emoji: faces.tense,
    accent: colors.stress,
    indicators: "stress 0.72\nfocus 0.40",
    instructions: guidance.stressed.instructions,
    startAt: 0.4,
    segments: [
      [2.4, 4.9],
      [6.5, 9.0],
      [23.7, 31.2],
    ],
    waitSec: 16,
    zoom: { scale: 1.6, origin: "48% 30%" },
  },
};

const REC = { w: 1152, h: 720, top: 160, left: 130 };

const Recording: React.FC<{ readonly take: Take }> = ({ take }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lens = take.segments.map(([a, b]) => b - a);
  const replyStart = (lens[0] + lens[1]) * fps;
  const zoom = interpolate(frame, [replyStart + 0.8 * fps, replyStart + 2 * fps], [1, take.zoom.scale], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cutChip = interpolate(frame, [replyStart, replyStart + 0.2 * fps, replyStart + 2.2 * fps, replyStart + 2.6 * fps], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: REC.left,
        top: REC.top,
        width: REC.w,
        height: REC.h,
        borderRadius: 20,
        overflow: "hidden",
        border: `2px solid ${take.accent}`,
        boxShadow: `0 0 60px ${take.accent}33`,
        background: "#0B0F1E",
        ...enter(frame, 0, fps, 20),
      }}
    >
      <div style={{ width: "100%", height: "100%", scale: String(zoom), transformOrigin: take.zoom.origin }}>
        <Series>
          {take.segments.map(([a, b], i) => (
            <Series.Sequence key={a} durationInFrames={Math.round((b - a) * fps)} name={`Cut ${i + 1}`}>
              <Video src={staticFile(take.file)} trimBefore={Math.round(a * fps)} muted objectFit="cover" style={{ width: "100%", height: "100%" }} />
            </Series.Sequence>
          ))}
        </Series>
      </div>
      <div
        style={{
          position: "absolute",
          top: 18,
          right: 18,
          padding: "8px 16px",
          borderRadius: 999,
          background: "rgba(7,11,26,0.85)",
          border: `1px solid ${colors.border}`,
          fontSize: 22,
          fontWeight: 600,
          opacity: cutChip,
        }}
      >
        ⏩ {take.waitSec} s agent wait cut
      </div>
    </div>
  );
};

const SidePanels: React.FC<{ readonly take: Take }> = ({ take }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lens = take.segments.map(([a, b]) => b - a);
  const toolAt = lens[0] + lens[1] - 0.3; // the agent calls the tool right after "send"
  return (
    <div style={{ position: "absolute", top: REC.top, left: REC.left + REC.w + 36, right: 130, display: "flex", flexDirection: "column", gap: 22 }}>
      <Panel accent={take.accent} style={{ padding: 24, ...enter(frame, 0.3 * fps, fps, 20) }}>
        <div style={{ fontSize: 22, color: colors.muted }}>Estimated state · {config.demoInputLabel.toLowerCase()}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 8 }}>
          <Face emoji={take.emoji} size={110} color={take.accent} start={0.5} />
          <div>
            <div style={{ fontSize: 38, fontWeight: 800, color: take.accent, lineHeight: 1.1 }}>{take.label}</div>
            <div style={{ fontSize: 22, fontFamily: monoFamily, color: colors.muted, marginTop: 6, whiteSpace: "pre-line" }}>{take.indicators}</div>
          </div>
        </div>
      </Panel>
      <Panel style={{ padding: 24, opacity: progress(frame, toolAt * fps, (toolAt + 0.4) * fps) }}>
        <div style={{ fontSize: 21, color: colors.calm, fontFamily: monoFamily, marginBottom: 12 }}>get_behavior_guidance →</div>
        {take.instructions.map((line, i) => (
          <div key={line} style={{ fontSize: 24, lineHeight: 1.35, marginBottom: 10, ...enter(frame, (toolAt + 0.2 + i * 0.3) * fps, fps, 10) }}>
            {line}
          </div>
        ))}
        <div style={{ fontSize: 18, color: colors.muted, fontStyle: "italic" }}>From behavior_rules.json</div>
      </Panel>
    </div>
  );
};

const Header: React.FC<{ readonly animate: boolean }> = ({ animate }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ position: "absolute", top: 72, left: 130, right: 130, display: "flex", alignItems: "center", gap: 20, ...(animate ? enter(frame, 0, fps) : {}) }}>
      <Chip color={colors.calm} style={{ fontSize: 26 }}>Live build on Azure</Chip>
      <Chip color={colors.violet} style={{ fontSize: 26 }}>{config.demoInputLabel}</Chip>
      <div style={{ fontSize: 36, fontWeight: 600 }}>
        Same question: <span style={{ color: colors.calm }}>"{config.demoQuestion}"</span>
      </div>
    </div>
  );
};

const DemoTake: React.FC<{ readonly take: Take; readonly animateHeader: boolean }> = ({ take, animateHeader }) => {
  const { fps } = useVideoConfig();
  return (
    <Scene id={take.id} style={{ padding: 0 }}>
      <Header animate={animateHeader} />
      <Sequence from={Math.round(take.startAt * fps)} premountFor={fps} name={`Take: ${take.label}`}>
        <Recording take={take} />
        <SidePanels take={take} />
      </Sequence>
    </Scene>
  );
};

export const Demo: React.FC = () => <DemoTake take={takes.focused} animateHeader />;
export const DemoStressed: React.FC = () => <DemoTake take={takes.stressed} animateHeader={false} />;
