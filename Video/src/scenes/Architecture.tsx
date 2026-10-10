import { Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Chip } from "../components/Panel";
import { Eyebrow, Scene } from "../components/Scene";
import { colors, enter, progress } from "../theme";

// Reference: crossroads-aica infra/main.bicep (Container Apps, Cosmos DB, Monitor) + backend MCP server.
// Simplified for video: one left-to-right row, three hero services, two supporting ones.

// Synced to the narration word timings (public/voiceover/architecture.alignment.json).
const T = {
  human: 0.2,
  wave: 0.6,
  local: 0.9,
  privacy: 1.3,
  state: 2.0,
  azure: 2.5,
  mcp: 4.3,
  guidance: 4.8,
  foundry: 6.2,
  reply: 6.7,
  response: 7.0,
  future: 8.0,
};

const ROW_TOP = 225;
const ROW_H = 370;
const MID = ROW_TOP + ROW_H / 2;
const X = {
  human: [130, 330],
  local: [390, 630],
  azure: [690, 1230],
  foundry: [1290, 1540],
  response: [1600, 1790],
} as const;

const msBlue = "#0078D4";

const Node: React.FC<{
  readonly x: readonly [number, number];
  readonly start: number;
  readonly accent?: string;
  readonly active?: number;
  readonly children: React.ReactNode;
  readonly style?: React.CSSProperties;
}> = ({ x, start, accent = colors.border, active = 0, children, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div
      style={{
        position: "absolute",
        left: x[0],
        width: x[1] - x[0],
        top: ROW_TOP,
        height: ROW_H,
        borderRadius: 24,
        border: `2px solid ${accent}`,
        background: colors.panel,
        boxShadow: `0 0 ${20 + active * 50}px ${accent}${active > 0.05 ? "55" : "18"}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: 12,
        padding: 18,
        ...enter(frame, start * fps, fps, 24),
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const Title: React.FC<{ readonly children: React.ReactNode; readonly size?: number }> = ({ children, size = 30 }) => (
  <div style={{ fontSize: size, fontWeight: 800, lineHeight: 1.15 }}>{children}</div>
);
const Sub: React.FC<{ readonly children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontSize: 22, color: colors.muted, lineHeight: 1.3 }}>{children}</div>
);

// Line between two nodes that draws in, then carries moving particles (or an EEG-like wave).
const Link: React.FC<{
  readonly from: number;
  readonly to: number;
  readonly start: number;
  readonly color: string;
  readonly label: string;
  readonly wave?: boolean;
}> = ({ from, to, start, color, label, wave }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const len = to - from;
  const draw = progress(frame, start * fps, (start + 0.4) * fps);
  const t = Math.max(0, frame - start * fps);
  const dots = wave
    ? []
    : [0, 1, 2].map((k) => ((t * 2.2 + (k * len) / 3) % len));
  const wavePath = Array.from({ length: 41 }, (_, i) => {
    const px = (i / 40) * len;
    const py = Math.sin(i * 1.3 + t * 0.35) * 9 * Math.sin((i / 40) * Math.PI);
    return `${i === 0 ? "M" : "L"}${px.toFixed(1)},${(20 + py).toFixed(1)}`;
  }).join(" ");

  return (
    <div style={{ position: "absolute", left: from, top: MID - 20, width: len, height: 40, opacity: draw > 0 ? 1 : 0 }}>
      <svg width={len} height={40} style={{ overflow: "visible" }}>
        {wave ? (
          <path d={wavePath} fill="none" stroke={color} strokeWidth={3} strokeDasharray={len * 2} strokeDashoffset={len * 2 * (1 - draw)} />
        ) : (
          <>
            <line x1={0} y1={20} x2={len * draw} y2={20} stroke={`${color}88`} strokeWidth={3} />
            {draw >= 1 ? dots.map((d) => <circle key={d} cx={d} cy={20} r={6} fill={color} />) : null}
          </>
        )}
      </svg>
      <div
        style={{
          position: "absolute",
          top: -36,
          left: -40,
          right: -40,
          textAlign: "center",
          fontSize: 18,
          fontWeight: 600,
          color,
          opacity: draw,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
    </div>
  );
};

const Service: React.FC<{
  readonly icon: string;
  readonly name: string;
  readonly role: string;
  readonly start: number;
  readonly glow?: number;
  readonly children?: React.ReactNode;
}> = ({ icon, name, role, start, glow = 0, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div
      style={{
        flex: 1,
        borderRadius: 18,
        padding: "12px 12px",
        background: glow > 0.05 ? `${colors.calm}1A` : "rgba(255,255,255,0.06)",
        border: `2px solid ${glow > 0.05 ? colors.calm : "rgba(255,255,255,0.10)"}`,
        boxShadow: `0 0 ${glow * 46}px ${colors.calm}66`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        ...enter(frame, start * fps, fps, 16),
      }}
    >
      <Img src={staticFile(`icons/${icon}.svg`)} style={{ width: 56, height: 56 }} />
      <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.15 }}>{name}</div>
      <div style={{ fontSize: 19, color: colors.muted, lineHeight: 1.25 }}>{role}</div>
      {children}
    </div>
  );
};

const Small: React.FC<{ readonly icon: string; readonly name: string; readonly start: number }> = ({ icon, name, start }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 19, color: colors.muted, ...enter(frame, start * fps, fps, 10) }}>
      <Img src={staticFile(`icons/${icon}.svg`)} style={{ width: 30, height: 30 }} />
      {name}
    </div>
  );
};

const HeadBand: React.FC = () => (
  <svg width={110} height={110} viewBox="0 0 110 110">
    <circle cx={55} cy={48} r={30} fill="none" stroke={colors.text} strokeWidth={4} />
    <path d="M18 108 C 22 82, 88 82, 92 108" fill="none" stroke={colors.text} strokeWidth={4} />
    <path d="M24 44 C 30 14, 80 14, 86 44" fill="none" stroke={colors.violet} strokeWidth={7} strokeLinecap="round" />
    <circle cx={28} cy={40} r={5} fill={colors.violet} />
    <circle cx={82} cy={40} r={5} fill={colors.violet} />
  </svg>
);

const Chip2: React.FC<{ readonly children: React.ReactNode; readonly color: string }> = ({ children, color }) => (
  <Chip color={color} style={{ fontSize: 20, padding: "6px 14px", gap: 6 }}>
    {children}
  </Chip>
);

const ExampleRow: React.FC<{ readonly emoji: string; readonly state: string; readonly color: string; readonly reply: string; readonly start: number }> = ({
  emoji,
  state,
  color,
  reply,
  start,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 22, fontSize: 36, ...enter(frame, start * fps, fps, 14) }}>
      <span style={{ fontSize: 44 }}>{emoji}</span>
      <span style={{ fontWeight: 800, color, width: 190 }}>{state}</span>
      <span style={{ color: colors.muted }}>→</span>
      <span style={{ fontWeight: 600 }}>{reply}</span>
    </div>
  );
};

const Input: React.FC<{ readonly title: string; readonly sub: string; readonly start: number }> = ({ title, sub, start }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div
      style={{
        flex: 1,
        borderRadius: 16,
        border: `2px dashed ${colors.violet}88`,
        background: `${colors.violet}12`,
        padding: "12px 18px",
        ...enter(frame, start * fps, fps, 14),
      }}
    >
      <div style={{ fontSize: 26, fontWeight: 800 }}>{title}</div>
      <div style={{ fontSize: 20, color: colors.muted, marginTop: 2 }}>{sub}</div>
    </div>
  );
};

export const Architecture: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = frame / fps;

  const mcpGlow = interpolate(s, [T.mcp, T.mcp + 0.5, T.future, T.future + 0.5], [0, 1, 1, 0.35], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const pulse = 0.85 + 0.15 * Math.sin(frame / 5);
  const future = progress(frame, T.future * fps, (T.future + 0.6) * fps);
  const rowDim = interpolate(future, [0, 1], [1, 0.55]);
  const active = (start: number, end: number) =>
    interpolate(s, [start, start + 0.4, end, end + 0.5], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <Scene id="architecture" style={{ padding: 0 }}>
      <div style={{ position: "absolute", top: 64, left: 130, right: 130, ...enter(frame, 0, fps) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Eyebrow>Architecture</Eyebrow>
          <Chip color={colors.calm} style={{ fontSize: 22, padding: "4px 16px", opacity: 1 - future }}>
            Built today · reference build
          </Chip>
        </div>
        <div style={{ fontSize: 56, fontWeight: 800, marginTop: 6, whiteSpace: "nowrap" }}>
          Turning Human Signals into <span style={{ color: colors.calm }}>Adaptive AI Behavior</span>
        </div>
      </div>

      <div style={{ opacity: rowDim }}>
        {/* Human + wearable */}
        <Node x={X.human} start={T.human} accent={colors.violet} active={active(T.human, T.local)}>
          <HeadBand />
          <Title size={26}>Muse S Athena</Title>
          <Sub>EEG wearable + other EEG devices</Sub>
          <div style={{ fontSize: 30, opacity: future, height: 30 * future }}>⌚ 💍</div>
        </Node>
        <Link from={X.human[1]} to={X.local[0]} start={T.wave} color={colors.violet} label="raw signals" wave />

        {/* Local processing */}
        <Node x={X.local} start={T.local} active={active(T.local, T.azure)}>
          <svg width={70} height={70} viewBox="0 0 70 70">
            <rect x={14} y={14} width={42} height={42} rx={8} fill="none" stroke={colors.text} strokeWidth={4} />
            <rect x={26} y={26} width={18} height={18} rx={3} fill={colors.calm} />
            {[22, 35, 48].map((p) => (
              <g key={p} stroke={colors.text} strokeWidth={4}>
                <line x1={p} y1={4} x2={p} y2={14} />
                <line x1={p} y1={56} x2={p} y2={66} />
                <line x1={4} y1={p} x2={14} y2={p} />
                <line x1={56} y1={p} x2={66} y2={p} />
              </g>
            ))}
          </svg>
          <Title size={28}>Local processing</Title>
          <Sub>Signal acquisition · state estimation</Sub>
          <div
            style={{
              marginTop: 4,
              padding: "6px 12px",
              borderRadius: 12,
              background: `${colors.calm}22`,
              border: `2px solid ${colors.calm}`,
              color: colors.calm,
              fontSize: 20,
              fontWeight: 800,
              ...enter(frame, T.privacy * fps, fps, 10),
            }}
          >
            🔒 Raw Signals Stay Local
          </div>
        </Node>
        <Link from={X.local[1]} to={X.azure[0]} start={T.state} color={colors.calm} label="estimated state" />

        {/* Microsoft Azure */}
        <Node x={X.azure} start={T.azure} accent={msBlue} active={0.4} style={{ justifyContent: "flex-start", padding: "16px 18px", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, alignSelf: "flex-start" }}>
            <Img src={staticFile("icons/azure.svg")} style={{ width: 34, height: 34 }} />
            <div style={{ fontSize: 26, fontWeight: 800 }}>Microsoft Azure</div>
          </div>
          <div style={{ display: "flex", gap: 14, width: "100%" }}>
            <Service icon="container-apps" name="Azure Container Apps" role="State API" start={T.azure + 0.2} glow={mcpGlow * pulse}>
              <div
                style={{
                  marginTop: 2,
                  padding: "4px 12px",
                  borderRadius: 10,
                  background: colors.calm,
                  color: colors.bg,
                  fontSize: 20,
                  fontWeight: 800,
                  opacity: progress(frame, T.mcp * fps, (T.mcp + 0.4) * fps),
                  scale: String(1 + 0.08 * mcpGlow * (pulse - 0.85) * 6),
                }}
              >
                MCP Guidance Server
              </div>
            </Service>
            <Service icon="cosmos-db" name="Azure Cosmos DB" role="State & history" start={T.azure + 0.45} />
          </div>
          <div style={{ display: "flex", gap: 34, alignSelf: "center" }}>
            <Small icon="entra" name="Microsoft Entra · identity" start={T.azure + 0.7} />
            <Small icon="monitor" name="Azure Monitor" start={T.azure + 0.85} />
          </div>
        </Node>
        <Link from={X.azure[1]} to={X.foundry[0]} start={T.guidance} color={colors.azure} label="guidance · MCP" />

        {/* Microsoft Foundry */}
        <Node x={X.foundry} start={T.foundry} accent={msBlue} active={active(T.foundry, T.future)}>
          <Img src={staticFile("icons/foundry.svg")} style={{ width: 92, height: 92 }} />
          <Title size={28}>Microsoft Foundry</Title>
          <Sub>AI agent adapts tone, length & structure</Sub>
        </Node>
        <Link from={X.foundry[1]} to={X.response[0]} start={T.reply} color={colors.text} label="reply" />

        {/* Human experience */}
        <Node x={X.response} start={T.response} accent={colors.calm} active={active(T.response, T.future)}>
          <svg width={74} height={64} viewBox="0 0 74 64">
            <path d="M8 6 H66 a4 4 0 0 1 4 4 V40 a4 4 0 0 1 -4 4 H30 L16 58 V44 H8 a4 4 0 0 1 -4 -4 V10 a4 4 0 0 1 4 -4 Z" fill={`${colors.calm}33`} stroke={colors.calm} strokeWidth={4} />
            <line x1={16} y1={20} x2={56} y2={20} stroke={colors.calm} strokeWidth={4} />
            <line x1={16} y1={31} x2={44} y2={31} stroke={colors.calm} strokeWidth={4} />
          </svg>
          <Title size={26}>Personalized response</Title>
          <Sub>Fits the person's estimated state</Sub>
        </Node>
      </div>

      {/* MCP example: state → behavior */}
      <div
        style={{
          position: "absolute",
          top: 630,
          left: 390,
          right: 380,
          borderRadius: 24,
          border: `2px solid ${colors.calm}66`,
          background: `${colors.calm}0F`,
          padding: "22px 36px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          opacity: 1 - future,
          ...(future > 0 ? {} : enter(frame, T.guidance * fps, fps, 20)),
        }}
      >
        <div style={{ fontSize: 22, color: colors.calm, fontWeight: 600, letterSpacing: 2 }}>MCP GUIDANCE SERVER · ESTIMATED STATE → AGENT INSTRUCTIONS</div>
        <ExampleRow emoji="😰" state="Stressed" color={colors.stress} reply="Short, calm, step-by-step response" start={T.guidance + 0.3} />
        <ExampleRow emoji="😌" state="Focused" color={colors.azure} reply="Detailed, structured explanation" start={T.guidance + 0.7} />
      </div>

      {/* Vision: future research, clearly separated from the MVP */}
      <div
        style={{
          position: "absolute",
          top: 625,
          left: 130,
          right: 130,
          borderRadius: 24,
          border: `2px dashed ${colors.violet}`,
          background: "rgba(139,124,246,0.07)",
          padding: "20px 30px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          opacity: future,
          translate: `0px ${(1 - future) * 30}px`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Chip2 color={colors.violet}>FUTURE RESEARCH · not in the MVP</Chip2>
          <div style={{ fontSize: 38, fontWeight: 800 }}>
            From Wearable Signals to <span style={{ color: colors.violet }}>Multimodal Emotional Intelligence</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 18 }}>
          <Input title="Physiological signals" sub="EEG, smartwatches, bands, rings" start={T.future + 0.5} />
          <Input title="Conversation content" sub="What the person says" start={T.future + 0.9} />
          <Input title="Interaction patterns" sub="How they use the app" start={T.future + 1.3} />
          <Input title="Personal history" sub="Personalized context" start={T.future + 1.7} />
        </div>
        <div style={{ fontSize: 26, color: colors.muted, fontStyle: "italic", textAlign: "right", ...enter(frame, (T.future + 2.3) * fps, fps, 10) }}>
          Long-term: <span style={{ color: colors.text, fontWeight: 600 }}>Toward Adaptive AI Without Wearables</span>
        </div>
      </div>
    </Scene>
  );
};
