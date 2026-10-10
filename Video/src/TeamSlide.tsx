import { Audio } from "@remotion/media";
import { useState } from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Background } from "./components/Background";
import { colors as themeColors, fontFamily as themeFont } from "./theme";

type Icon = "award" | "cap" | "shield" | "trophy" | "briefcase" | "spark" | "chart";

type Member = {
  name: string;
  title: string;
  role: string;
  credentials: [Icon, string][];
  status: string;
  photo: string;
};

// Text is verbatim from the team brief (section 4). Do not reword credentials.
const members: Member[] = [
  {
    name: "Artem Chernevskiy",
    title: "Founder, AICA",
    role: "Product, emotion model, Foundry agent", // ROLE: confirmed
    credentials: [
      ["award", "Microsoft MVP · Microsoft Foundry & M365 Copilot"],
      ["cap", "Erickson-trained coach · 128h ICF-approved education"],
      ["cap", "Harvard Online · Data Privacy and Technology"],
    ],
    status: "Current state: calm and curious",
    photo: "artem.jpg",
  },
  {
    name: "Nikita Chernevskiy",
    title: "Co-founder, AICA",
    role: "Azure architecture, MCP server", // ROLE: confirmed
    credentials: [
      ["shield", "Azure Solutions Architect Expert"],
      ["shield", "Agentic AI Business Solutions Architect"],
      ["trophy", "Elevate AUBG Accelerator winner · DigiEduHack 2025 podium"],
    ],
    status: "Current state: deeply focused",
    photo: "nikita.jpg",
  },
  {
    name: "Peter Belousov",
    title: "Partner, Business Development & Sales, AICA",
    role: "Go-to-market and product discovery", // ROLE: confirmed
    credentials: [
      ["briefcase", "Senior PM · WebPros (cPanel, Plesk), Smartcat, SberTech"],
      ["spark", "Launched an in-product AI agent for a global payroll platform"],
      ["chart", "4× purchase conversion growth at WebPros"],
    ],
    status: "Current state: ready to pitch",
    photo: "peter.jpg",
  },
];

export type TeamSlideProps = {
  readonly background: string;
  readonly cardBackground: string;
  readonly text: string;
  readonly muted: string;
  readonly accent: string;
  readonly fontFamily: string;
  readonly sfx: boolean;
};

export const teamSlideDefaults: TeamSlideProps = {
  background: themeColors.bg,
  cardBackground: "rgba(255,255,255,0.05)",
  text: themeColors.text,
  muted: themeColors.muted,
  accent: themeColors.calm,
  fontFamily: themeFont,
  sfx: true,
};

const TITLE = "THE TEAM";
const SUBTITLE = "Builders who speak human";
const CARD_START = 1.2; // seconds
const CARD_GAP = 0.3; // seconds between cards

const IconGlyph: React.FC<{ readonly icon: Icon; readonly color: string }> = ({ icon, color }) => {
  const common = { fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<Icon, React.ReactNode> = {
    award: (
      <>
        <circle cx="12" cy="9" r="6" {...common} />
        <path d="M8.5 14 7 22l5-3 5 3-1.5-8" {...common} />
      </>
    ),
    cap: (
      <>
        <path d="M2 9l10-5 10 5-10 5z" {...common} />
        <path d="M6 11v5c3 2 9 2 12 0v-5" {...common} />
      </>
    ),
    shield: <path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" {...common} />,
    trophy: (
      <>
        <path d="M7 4h10v5a5 5 0 0 1-10 0z" {...common} />
        <path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 21h8" {...common} />
      </>
    ),
    briefcase: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2" {...common} />
        <path d="M9 7V4h6v3" {...common} />
      </>
    ),
    spark: <path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z" {...common} />,
    chart: <path d="M3 21h18M6 17v-4M11 17V9M16 17V5" {...common} />,
  };
  return (
    <svg width={26} height={26} viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 2 }}>
      {paths[icon]}
    </svg>
  );
};

const Photo: React.FC<{ readonly member: Member; readonly size: number; readonly accent: string }> = ({
  member,
  size,
  accent,
}) => {
  const [failed, setFailed] = useState(false);
  const initials = member.name
    .split(" ")
    .map((w) => w[0])
    .join("");
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        flexShrink: 0,
        border: `4px solid ${accent}`,
        background: "rgba(255,255,255,0.1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.34,
        fontWeight: 800,
      }}
    >
      {failed ? (
        initials
      ) : (
        <Img
          src={staticFile(member.photo)}
          onError={() => setFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}
    </div>
  );
};

const Card: React.FC<{
  readonly member: Member;
  readonly index: number;
  readonly props: TeamSlideProps;
  readonly vertical: boolean;
}> = ({ member, index, props, vertical }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const delay = (CARD_START + index * CARD_GAP) * fps;
  const rise = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 90 } });
  const t = frame / fps;
  const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 1.6 + index);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: vertical ? "row" : "column",
        alignItems: vertical ? "flex-start" : "center",
        gap: vertical ? 32 : 18,
        background: props.cardBackground,
        border: "2px solid rgba(255,255,255,0.12)",
        borderRadius: 28,
        padding: vertical ? 36 : "36px 30px 30px",
        opacity: rise,
        translate: `0px ${interpolate(rise, [0, 1], [80, 0])}px`,
      }}
    >
      <Photo member={member} size={vertical ? 170 : 170} accent={props.accent} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: vertical ? "flex-start" : "center", gap: 6, flex: 1 }}>
        <div style={{ fontSize: 40, fontWeight: 800, textAlign: vertical ? "left" : "center" }}>{member.name}</div>
        <div style={{ fontSize: 26, color: props.muted, textAlign: vertical ? "left" : "center", minHeight: vertical ? undefined : 66 }}>
          {member.title}
        </div>
        <div style={{ fontSize: 26, color: props.accent, fontWeight: 600, textAlign: vertical ? "left" : "center" }}>
          {member.role}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14, alignSelf: "stretch" }}>
          {member.credentials.map(([icon, line]) => (
            <div key={line} style={{ display: "flex", gap: 12, fontSize: 23, lineHeight: 1.3 }}>
              <IconGlyph icon={icon} color={props.accent} />
              <span>{line}</span>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 20,
            alignSelf: vertical ? "flex-start" : "center",
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 22px",
            borderRadius: 999,
            border: `2px solid ${props.accent}`,
            background: `${props.accent}1F`,
            color: props.accent,
            fontSize: 24,
            fontWeight: 600,
            boxShadow: `0 0 ${10 + pulse * 18}px ${props.accent}${Math.round(40 + pulse * 60).toString(16)}`,
          }}
        >
          <div style={{ width: 12, height: 12, borderRadius: 6, background: props.accent, opacity: 0.4 + pulse * 0.6 }} />
          {member.status}
        </div>
      </div>
    </div>
  );
};

const WaveLine: React.FC<{ readonly color: string; readonly width: number }> = ({ color, width }) => {
  const frame = useCurrentFrame();
  const pts: string[] = [];
  for (let i = 0; i <= 120; i++) {
    const x = (i / 120) * width;
    const p = i / 7 + frame * 0.08;
    const y = 40 + 18 * (Math.sin(p) * 0.6 + Math.sin(p * 2.7 + 1.3) * 0.25);
    pts.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return (
    <svg width={width} height={80} style={{ position: "absolute", bottom: 20, left: 0, opacity: 0.35 }}>
      <path d={pts.join(" ")} fill="none" stroke={color} strokeWidth={2.5} />
    </svg>
  );
};

const Slide: React.FC<TeamSlideProps & { readonly vertical: boolean }> = ({ vertical, ...props }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const typed = Math.floor(interpolate(frame, [0.6 * fps, 1.8 * fps], [0, SUBTITLE.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));

  return (
    <AbsoluteFill style={{ background: props.background, color: props.text, fontFamily: props.fontFamily }}>
      <Background tint={themeColors.violet} />
      <WaveLine color={props.accent} width={width} />
      <AbsoluteFill
        style={{
          padding: vertical ? "120px 70px 160px" : "70px 110px 150px",
          gap: vertical ? 40 : 36,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: vertical ? 96 : 84,
              fontWeight: 800,
              letterSpacing: 8,
              opacity: interpolate(frame, [0, 0.6 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            }}
          >
            {TITLE}
          </div>
          <div style={{ fontSize: vertical ? 48 : 40, color: props.accent, fontWeight: 600, minHeight: 56 }}>
            {SUBTITLE.slice(0, typed)}
            <span style={{ opacity: typed < SUBTITLE.length && Math.floor(frame / 8) % 2 === 0 ? 1 : 0 }}>|</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: vertical ? "column" : "row", gap: vertical ? 36 : 36, flex: 1 }}>
          {members.map((m, i) => (
            <Card key={m.name} member={m} index={i} props={props} vertical={vertical} />
          ))}
        </div>
      </AbsoluteFill>
      {props.sfx
        ? members.map((m, i) => (
            <Audio
              key={m.name}
              name={`Ding ${m.name}`}
              src="https://remotion.media/ding.wav"
              from={Math.round((CARD_START + i * CARD_GAP + 0.35) * fps)}
              volume={0.12}
              premountFor={fps}
            />
          ))
        : null}
    </AbsoluteFill>
  );
};

export const TeamSlide: React.FC<TeamSlideProps> = (props) => <Slide {...props} vertical={false} />;
export const TeamSlideVertical: React.FC<TeamSlideProps> = (props) => <Slide {...props} vertical />;
