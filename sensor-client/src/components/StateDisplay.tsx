import type { EmotionalState } from "../types";

interface Props {
  state: EmotionalState | null;
}

function MetricBar({ label, value, min, max, color }: {
  label: string;
  value: number;
  min: number;
  max: number;
  color: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-300 font-mono">{value.toFixed(2)}</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>
    </div>
  );
}

export function StateDisplay({ state }: Props) {
  if (!state) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
          Emotional State
        </h2>
        <p className="text-sm text-gray-500 text-center py-4">
          No data yet — start a device or simulation
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Emotional State
        </h2>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-600/20 text-indigo-300">
          {state.label}
        </span>
      </div>

      <div className="space-y-3">
        <MetricBar
          label="Valence"
          value={state.valence}
          min={-1}
          max={1}
          color="bg-blue-500"
        />
        <MetricBar
          label="Arousal"
          value={state.arousal}
          min={0}
          max={1}
          color="bg-amber-500"
        />
        <MetricBar
          label="Focus"
          value={state.focus}
          min={0}
          max={1}
          color="bg-emerald-500"
        />
        <MetricBar
          label="Stress"
          value={state.stress}
          min={0}
          max={1}
          color="bg-red-500"
        />
      </div>

      <div className="mt-3 flex justify-between text-xs text-gray-500">
        <span>{state.source}</span>
        <span>{new Date(state.timestamp).toLocaleTimeString()}</span>
      </div>
    </div>
  );
}
