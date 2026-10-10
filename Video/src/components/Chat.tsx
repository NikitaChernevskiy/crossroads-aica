import { colors } from "../theme";

export const UserBubble: React.FC<{ readonly children: React.ReactNode; readonly style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <div
    style={{
      alignSelf: "flex-end",
      background: colors.azure,
      color: "#fff",
      borderRadius: "28px 28px 6px 28px",
      padding: "18px 28px",
      fontSize: 36,
      fontWeight: 600,
      ...style,
    }}
  >
    {children}
  </div>
);

export const AiBubble: React.FC<{ readonly children: React.ReactNode; readonly style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <div
    style={{
      alignSelf: "flex-start",
      background: "rgba(255,255,255,0.08)",
      border: `1px solid ${colors.border}`,
      borderRadius: "28px 28px 28px 6px",
      padding: "22px 28px",
      fontSize: 32,
      lineHeight: 1.4,
      ...style,
    }}
  >
    {children}
  </div>
);

// Red dashed marker for content that must be filled in before export (see npm run check).
export const Todo: React.FC<{ readonly children: React.ReactNode }> = ({ children }) => (
  <span
    style={{
      color: colors.stress,
      border: `2px dashed ${colors.stress}`,
      borderRadius: 8,
      padding: "2px 12px",
    }}
  >
    PLACEHOLDER · {children}
  </span>
);
