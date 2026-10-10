import { colors } from "../theme";

export const Panel: React.FC<{
  readonly children: React.ReactNode;
  readonly style?: React.CSSProperties;
  readonly accent?: string;
}> = ({ children, style, accent }) => (
  <div
    style={{
      background: colors.panel,
      border: `2px solid ${accent ?? colors.border}`,
      borderRadius: 28,
      padding: 36,
      boxShadow: accent ? `0 0 60px ${accent}22` : undefined,
      ...style,
    }}
  >
    {children}
  </div>
);

export const Chip: React.FC<{
  readonly children: React.ReactNode;
  readonly color?: string;
  readonly style?: React.CSSProperties;
}> = ({ children, color = colors.calm, style }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 26px",
      borderRadius: 999,
      border: `2px solid ${color}66`,
      background: `${color}18`,
      color,
      fontSize: 32,
      fontWeight: 600,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </div>
);
