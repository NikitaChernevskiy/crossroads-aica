import { useState, useCallback, useRef, useEffect } from "react";
import type { EmotionalState, SimulationProfile } from "../types";
import { postState } from "../api";

const SIMULATION_PROFILES: SimulationProfile[] = [
  { name: "Calm & Focused", label: "calm", valence: 0.4, arousal: 0.3, focus: 0.8, stress: 0.15 },
  { name: "Tense", label: "tense", valence: -0.35, arousal: 0.72, focus: 0.41, stress: 0.68 },
  { name: "Fatigued", label: "fatigued", valence: -0.3, arousal: 0.15, focus: 0.25, stress: 0.35 },
  { name: "Excited", label: "excited", valence: 0.6, arousal: 0.8, focus: 0.55, stress: 0.25 },
  { name: "Anxious", label: "anxious", valence: -0.5, arousal: 0.75, focus: 0.3, stress: 0.8 },
  { name: "Distracted", label: "distracted", valence: 0.0, arousal: 0.4, focus: 0.15, stress: 0.3 },
];

const SEND_INTERVAL_MS = 10_000; // Send state every 10 seconds

interface Props {
  connected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onStateUpdate: (state: EmotionalState) => void;
  userId: string;
}

export function DevicePanel({ connected, onConnect, onDisconnect, onStateUpdate, userId }: Props) {
  const [mode, setMode] = useState<"simulation" | "bluetooth">("simulation");
  const [activeProfile, setActiveProfile] = useState<SimulationProfile>(SIMULATION_PROFILES[0]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendState = useCallback(
    async (profile: SimulationProfile) => {
      // Add small random jitter to make it look natural
      const jitter = () => (Math.random() - 0.5) * 0.1;
      const clamp = (v: number, min: number, max: number) =>
        Math.max(min, Math.min(max, v));

      const state: EmotionalState = {
        user_id: userId,
        source: mode === "simulation" ? "simulation" : "muse-s-athena",
        timestamp: new Date().toISOString(),
        valence: clamp(profile.valence + jitter(), -1, 1),
        arousal: clamp(profile.arousal + jitter(), 0, 1),
        focus: clamp(profile.focus + jitter(), 0, 1),
        stress: clamp(profile.stress + jitter(), 0, 1),
        label: profile.label,
      };

      try {
        await postState(state);
        onStateUpdate(state);
      } catch (err) {
        console.error("Failed to send state:", err);
      }
    },
    [userId, mode, onStateUpdate]
  );

  const startSending = useCallback(
    (profile: SimulationProfile) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      // Send immediately, then on interval
      sendState(profile);
      intervalRef.current = setInterval(() => sendState(profile), SEND_INTERVAL_MS);
      onConnect();
    },
    [sendState, onConnect]
  );

  const stopSending = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    onDisconnect();
  }, [onDisconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleProfileChange = (profile: SimulationProfile) => {
    setActiveProfile(profile);
    if (connected) {
      // Restart with new profile
      startSending(profile);
    }
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
        Device
      </h2>

      {/* Mode selector */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode("simulation")}
          className={`flex-1 text-sm py-2 rounded-lg transition ${
            mode === "simulation"
              ? "bg-indigo-600 text-white"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          Simulation
        </button>
        <button
          onClick={() => setMode("bluetooth")}
          className={`flex-1 text-sm py-2 rounded-lg transition ${
            mode === "bluetooth"
              ? "bg-indigo-600 text-white"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          Bluetooth
        </button>
      </div>

      {mode === "simulation" ? (
        <>
          {/* Profile selector */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {SIMULATION_PROFILES.map((profile) => (
              <button
                key={profile.name}
                onClick={() => handleProfileChange(profile)}
                className={`text-xs py-2 px-3 rounded-lg transition ${
                  activeProfile.name === profile.name
                    ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500"
                    : "bg-gray-800 text-gray-400 border border-transparent hover:bg-gray-700"
                }`}
              >
                {profile.name}
              </button>
            ))}
          </div>

          {/* Connect/Disconnect */}
          {!connected ? (
            <button
              onClick={() => startSending(activeProfile)}
              className="w-full py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition"
            >
              Start Simulation
            </button>
          ) : (
            <button
              onClick={stopSending}
              className="w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition"
            >
              Stop Simulation
            </button>
          )}
        </>
      ) : (
        <div className="text-sm text-gray-500 text-center py-8">
          <p className="mb-2">Web Bluetooth to Muse S Athena</p>
          <p className="text-xs text-gray-600">
            Requires Chrome/Edge on desktop or Android
          </p>
          <button
            disabled
            className="mt-4 w-full py-2.5 rounded-lg bg-gray-800 text-gray-500 text-sm cursor-not-allowed"
          >
            Connect Headband (coming soon)
          </button>
        </div>
      )}
    </div>
  );
}
