import { AbsoluteFill } from "remotion";
import { colors, fontFamily } from "../theme";
import { Background } from "./Background";
import { type SceneId, Voiceover } from "./Voiceover";

// Shared scene frame: background, narration, and a safe area above the captions.
export const Scene: React.FC<{
  readonly id: SceneId;
  readonly children: React.ReactNode;
  readonly tint?: string;
  readonly style?: React.CSSProperties;
}> = ({ id, children, tint, style }) => (
  <AbsoluteFill style={{ fontFamily, color: colors.text }}>
    <Background tint={tint} />
    <Voiceover id={id} />
    <AbsoluteFill style={{ padding: "90px 130px 190px", ...style }}>{children}</AbsoluteFill>
  </AbsoluteFill>
);

export const Eyebrow: React.FC<{ readonly children: React.ReactNode; readonly style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: 4, color: colors.calm, textTransform: "uppercase", ...style }}>
    {children}
  </div>
);

export const Note: React.FC<{ readonly children: React.ReactNode; readonly style?: React.CSSProperties }> = ({
  children,
  style,
}) => <div style={{ fontSize: 26, color: colors.muted, fontStyle: "italic", ...style }}>{children}</div>;
