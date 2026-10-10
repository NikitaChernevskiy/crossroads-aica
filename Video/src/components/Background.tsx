import { AbsoluteFill, useCurrentFrame } from "remotion";
import { colors } from "../theme";

export const Background: React.FC<{
  readonly tint?: string;
  readonly secondTint?: string;
}> = ({ tint = colors.violet, secondTint = colors.calm }) => {
  const frame = useCurrentFrame();
  const t = frame / 60;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          width: 1100,
          height: 1100,
          borderRadius: "50%",
          left: -300 + Math.sin(t * 0.6) * 80,
          top: -400 + Math.cos(t * 0.5) * 60,
          background: `radial-gradient(circle, ${tint}33 0%, transparent 65%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 1000,
          height: 1000,
          borderRadius: "50%",
          right: -300 + Math.cos(t * 0.4) * 80,
          bottom: -450 + Math.sin(t * 0.55) * 60,
          background: `radial-gradient(circle, ${secondTint}2B 0%, transparent 65%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 80%)",
        }}
      />
    </AbsoluteFill>
  );
};
