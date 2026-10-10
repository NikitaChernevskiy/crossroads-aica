import { loadFont } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadEmoji } from "@remotion/google-fonts/NotoColorEmoji";
import { Easing, interpolate } from "remotion";

export const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "800"],
  subsets: ["latin"],
});

export const { fontFamily: monoFamily } = loadMono("normal", {
  weights: ["400", "600"],
  subsets: ["latin"],
});

export const colors = {
  bg: "#070B1A",
  panel: "rgba(255,255,255,0.05)",
  border: "rgba(255,255,255,0.12)",
  text: "#F4F6FF",
  muted: "#9AA3C7",
  calm: "#4FD1C5",
  stress: "#FF6B6B",
  violet: "#8B7CF6",
  azure: "#3B9EFF",
};

const ease = Easing.bezier(0.16, 1, 0.3, 1);

// Fade + rise entrance starting at `start` frames.
export const enter = (
  frame: number,
  start: number,
  fps: number,
  distance = 40,
): React.CSSProperties => ({
  opacity: interpolate(frame, [start, start + 0.6 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  }),
  translate: `0px ${interpolate(frame, [start, start + 0.8 * fps], [distance, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  })}px`,
});

export const progress = (frame: number, start: number, end: number) =>
  interpolate(frame, [start, end], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

export const { fontFamily: emojiFamily } = loadEmoji();

// One face per estimated state, used everywhere a state is shown.
export const faces = { focused: "😊", tense: "😰" } as const;
