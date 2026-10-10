import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { emojiFamily } from "../theme";

// Large emoji in a soft glowing disc: pops in at `start` (seconds), then breathes gently.
export const Face: React.FC<{
  readonly emoji: string;
  readonly size: number;
  readonly color: string;
  readonly start?: number;
  readonly style?: React.CSSProperties;
}> = ({ emoji, size, color, start = 0, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - start * fps, fps, config: { damping: 12, stiffness: 140 } });
  const breathe = 1 + 0.03 * Math.sin((frame - start * fps) / 12);
  return (
    <div
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${color}40 0%, ${color}10 65%, transparent 72%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: emojiFamily,
        fontSize: size * 0.62,
        lineHeight: 1,
        scale: String(pop * breathe),
        ...style,
      }}
    >
      {emoji}
    </div>
  );
};
