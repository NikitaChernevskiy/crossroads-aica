import { useRef, useEffect, useCallback } from "react";

/**
 * LiveChart — compact rolling canvas chart for real-time EEG metrics.
 *
 * Shows 4 metric lines (valence, arousal, focus, stress) scrolling left
 * as new data arrives (~2 points/sec from the Muse EEG processor).
 * Uses requestAnimationFrame for smooth sub-pixel scrolling between data points.
 */

export interface MetricSnapshot {
  valence: number; // -1..1
  arousal: number; // 0..1
  focus: number;   // 0..1
  stress: number;  // 0..1
  timestamp: number; // Date.now()
}

interface Props {
  /** Rolling buffer of recent metric snapshots (newest last). */
  data: MetricSnapshot[];
  /** Chart height in px. */
  height?: number;
}

// Colors for each metric line
const SERIES = [
  { key: "valence" as const, color: "#818cf8", label: "Valence" },   // indigo-400
  { key: "arousal" as const, color: "#f97316", label: "Arousal" },    // orange-500
  { key: "focus" as const, color: "#22d3ee", label: "Focus" },        // cyan-400
  { key: "stress" as const, color: "#f43f5e", label: "Stress" },      // rose-500
];

const MAX_POINTS = 60;  // ~30 seconds at 2 pts/sec
const GRID_LINES = 4;

/** Normalize a metric value to 0..1 canvas space. Valence is -1..1, others 0..1. */
function normalize(key: string, value: number): number {
  if (key === "valence") return (value + 1) / 2; // map -1..1 → 0..1
  return value;
}

export function LiveChart({ data, height = 120 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fit canvas pixels to CSS size (handle DPR for crisp lines)
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.scale(dpr, dpr);
    }

    ctx.clearRect(0, 0, w, h);

    // ── Background grid ──
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let i = 1; i <= GRID_LINES; i++) {
      const y = (h / (GRID_LINES + 1)) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Center line (valence = 0, or 0.5 for others)
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    if (data.length < 2) {
      // Not enough data — show placeholder text
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.font = "12px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Waiting for data…", w / 2, h / 2 + 4);
      return;
    }

    // ── Draw each metric series ──
    const points = data.slice(-MAX_POINTS);
    const padding = { top: 6, bottom: 6 };
    const plotH = h - padding.top - padding.bottom;
    const stepX = w / (MAX_POINTS - 1);

    // Offset so newest point is at right edge, older points scroll left
    const offset = MAX_POINTS - points.length;

    for (const series of SERIES) {
      ctx.strokeStyle = series.color;
      ctx.lineWidth = 1.8;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();

      for (let i = 0; i < points.length; i++) {
        const x = (offset + i) * stepX;
        const val = normalize(series.key, points[i][series.key]);
        // Invert Y: 1.0 = top, 0.0 = bottom
        const y = padding.top + plotH * (1 - val);

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Glow dot on the latest point
      const lastPt = points[points.length - 1];
      const lastX = (offset + points.length - 1) * stepX;
      const lastY = padding.top + plotH * (1 - normalize(series.key, lastPt[series.key]));
      ctx.fillStyle = series.color;
      ctx.beginPath();
      ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [data, height]);

  // Redraw on every animation frame for smooth feel
  useEffect(() => {
    let running = true;
    const loop = () => {
      if (!running) return;
      draw();
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [draw]);

  return (
    <div className="space-y-1.5">
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: `${height}px` }}
        className="rounded-lg bg-gray-950/60 border border-gray-800/50"
      />
      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 px-1">
        {SERIES.map((s) => (
          <div key={s.key} className="flex items-center gap-1">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-[10px] text-gray-500">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
