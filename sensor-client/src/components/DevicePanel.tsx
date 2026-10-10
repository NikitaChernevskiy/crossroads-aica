import { useState, useCallback, useRef, useEffect } from "react";
import type { EmotionalState, SimulationProfile } from "../types";
import { postState } from "../api";
import { MuseClient, type MuseConnectionStatus } from "../lib/muse-client";
import type { EmotionalMetrics } from "../lib/eeg-processor";
import { LiveChart, type MetricSnapshot } from "./LiveChart";

const MAX_CHART_POINTS = 60; // ~30s at 2 pts/sec

const SIMULATION_PROFILES: SimulationProfile[] = [
  { name: "Calm & Focused", label: "focused", valence: 0.4, arousal: 0.35, focus: 0.8, stress: 0.15 },
  { name: "Stressed", label: "stressed", valence: -0.35, arousal: 0.7, focus: 0.4, stress: 0.72 },
  { name: "Fatigued", label: "fatigued", valence: -0.25, arousal: 0.15, focus: 0.2, stress: 0.35 },
  { name: "Excited", label: "excited", valence: 0.6, arousal: 0.8, focus: 0.55, stress: 0.25 },
  { name: "Meditative", label: "meditative", valence: 0.2, arousal: 0.2, focus: 0.45, stress: 0.08 },
  { name: "Distracted", label: "distracted", valence: 0.0, arousal: 0.4, focus: 0.15, stress: 0.3 },
];

const SEND_INTERVAL_MS = 10_000;
const CHART_TICK_MS = 500; // chart updates at 2 pts/sec (matches Muse EEG compute rate)

function isWebBluetoothSupported(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

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
  const chartTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeProfileRef = useRef<SimulationProfile>(SIMULATION_PROFILES[0]);

  // Bluetooth state
  const [btStatus, setBtStatus] = useState<MuseConnectionStatus>("disconnected");
  const [btError, setBtError] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string>("");
  const museRef = useRef<MuseClient | null>(null);
  const btSendRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestMetricsRef = useRef<EmotionalMetrics | null>(null);

  // Live chart data (rolling buffer of recent EEG metrics)
  const [chartData, setChartData] = useState<MetricSnapshot[]>([]);

  // Keep profile ref in sync for the fast chart ticker
  useEffect(() => { activeProfileRef.current = activeProfile; }, [activeProfile]);

  // ── Simulation helpers ──────────────────────────────────────────────────

  const jitter = () => (Math.random() - 0.5) * 0.1;
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  /** Generate a jittered snapshot from a profile (chart-only, no API call). */
  const pushChartPoint = useCallback((profile: SimulationProfile) => {
    setChartData((prev) => {
      const next = [...prev, {
        valence: clamp(profile.valence + jitter(), -1, 1),
        arousal: clamp(profile.arousal + jitter(), 0, 1),
        focus: clamp(profile.focus + jitter(), 0, 1),
        stress: clamp(profile.stress + jitter(), 0, 1),
        timestamp: Date.now(),
      }];
      return next.length > MAX_CHART_POINTS ? next.slice(-MAX_CHART_POINTS) : next;
    });
  }, []);

  /** Send state to backend API + update parent (runs at slower SEND_INTERVAL_MS). */
  const sendState = useCallback(
    async (profile: SimulationProfile) => {
      const v = clamp(profile.valence + jitter(), -1, 1);
      const a = clamp(profile.arousal + jitter(), 0, 1);
      const f = clamp(profile.focus + jitter(), 0, 1);
      const s = clamp(profile.stress + jitter(), 0, 1);

      const state: EmotionalState = {
        user_id: userId,
        source: "simulation",
        timestamp: new Date().toISOString(),
        valence: v, arousal: a, focus: f, stress: s,
        label: profile.label,
      };

      try {
        await postState(state);
        onStateUpdate(state);
      } catch (err) {
        console.error("Failed to send state:", err);
      }
    },
    [userId, onStateUpdate]
  );

  const startSending = useCallback(
    (profile: SimulationProfile) => {
      // Clear previous intervals
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (chartTickRef.current) clearInterval(chartTickRef.current);
      setChartData([]);

      // Fast chart ticker — 2 pts/sec to mimic Muse EEG compute rate
      pushChartPoint(profile);
      chartTickRef.current = setInterval(
        () => pushChartPoint(activeProfileRef.current),
        CHART_TICK_MS
      );

      // Slow backend sender — every 10s
      sendState(profile);
      intervalRef.current = setInterval(
        () => sendState(activeProfileRef.current),
        SEND_INTERVAL_MS
      );

      onConnect();
    },
    [sendState, pushChartPoint, onConnect]
  );

  const stopSending = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (chartTickRef.current) {
      clearInterval(chartTickRef.current);
      chartTickRef.current = null;
    }
    setChartData([]);
    onDisconnect();
  }, [onDisconnect]);

  const handleProfileChange = (profile: SimulationProfile) => {
    setActiveProfile(profile);
    if (connected && mode === "simulation") {
      startSending(profile);
    }
  };

  // ── Bluetooth Mode ──────────────────────────────────────────────────────

  const sendMuseState = useCallback(
    async (metrics: EmotionalMetrics) => {
      const state: EmotionalState = {
        user_id: userId,
        source: "muse-s-athena",
        timestamp: new Date().toISOString(),
        valence: metrics.valence,
        arousal: metrics.arousal,
        focus: metrics.focus,
        stress: metrics.stress,
        label: metrics.label,
      };

      try {
        await postState(state);
        onStateUpdate(state);
      } catch (err) {
        console.error("Failed to send Muse state:", err);
      }
    },
    [userId, onStateUpdate]
  );

  const connectBluetooth = useCallback(async () => {
    setBtError(null);

    const client = new MuseClient({
      onStatusChange: (status) => {
        setBtStatus(status);
        if (status === "connected") {
          setDeviceName(client.deviceName);
          onConnect();
          btSendRef.current = setInterval(() => {
            const m = latestMetricsRef.current;
            if (m) sendMuseState(m);
          }, SEND_INTERVAL_MS);
        } else if (status === "disconnected") {
          if (btSendRef.current) {
            clearInterval(btSendRef.current);
            btSendRef.current = null;
          }
          onDisconnect();
        }
      },
      onMetrics: (metrics) => {
        latestMetricsRef.current = metrics;
        // Push to live chart buffer
        setChartData((prev) => {
          const next = [...prev, {
            valence: metrics.valence,
            arousal: metrics.arousal,
            focus: metrics.focus,
            stress: metrics.stress,
            timestamp: Date.now(),
          }];
          return next.length > MAX_CHART_POINTS ? next.slice(-MAX_CHART_POINTS) : next;
        });
        const state: EmotionalState = {
          user_id: userId,
          source: "muse-s-athena",
          timestamp: new Date().toISOString(),
          ...metrics,
        };
        onStateUpdate(state);
      },
      onError: (error) => {
        setBtError(error);
      },
    });

    museRef.current = client;
    await client.connect();
  }, [userId, onConnect, onDisconnect, onStateUpdate, sendMuseState]);

  const disconnectBluetooth = useCallback(() => {
    museRef.current?.disconnect();
    museRef.current = null;
    latestMetricsRef.current = null;
    setChartData([]);
    if (btSendRef.current) {
      clearInterval(btSendRef.current);
      btSendRef.current = null;
    }
    onDisconnect();
  }, [onDisconnect]);

  // ── Cleanup ─────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (chartTickRef.current) clearInterval(chartTickRef.current);
      if (btSendRef.current) clearInterval(btSendRef.current);
      museRef.current?.disconnect();
    };
  }, []);

  const handleModeSwitch = (newMode: "simulation" | "bluetooth") => {
    if (newMode === mode) return;
    if (mode === "simulation" && connected) stopSending();
    if (mode === "bluetooth" && btStatus === "connected") disconnectBluetooth();
    setChartData([]);
    setMode(newMode);
  };

  // ── Render ──────────────────────────────────────────────────────────────

  const btSupported = isWebBluetoothSupported();

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
        Device
      </h2>

      {/* Mode selector */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => handleModeSwitch("simulation")}
          className={`flex-1 text-sm py-2 rounded-lg transition ${
            mode === "simulation"
              ? "bg-indigo-600 text-white"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          Simulation
        </button>
        <button
          onClick={() => handleModeSwitch("bluetooth")}
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

          {connected && <LiveChart data={chartData} height={110} />}

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
        <div className="space-y-3">
          {!btSupported ? (
            <div className="text-sm text-amber-400 bg-amber-900/20 border border-amber-800 rounded-lg p-3">
              <p className="font-medium mb-1">Web Bluetooth Not Available</p>
              <p className="text-xs text-amber-300/70">
                Use Chrome or Edge on desktop or Android. Safari and Firefox do not support Web Bluetooth.
              </p>
            </div>
          ) : (
            <>
              {/* Status */}
              <div className="flex items-center gap-2 text-sm">
                <div
                  className={`w-2 h-2 rounded-full ${
                    btStatus === "connected"
                      ? "bg-green-400"
                      : btStatus === "connecting"
                      ? "bg-amber-400 animate-pulse"
                      : btStatus === "error"
                      ? "bg-red-400"
                      : "bg-gray-600"
                  }`}
                />
                <span className="text-gray-400">
                  {btStatus === "connected"
                    ? `Connected to ${deviceName}`
                    : btStatus === "connecting"
                    ? "Connecting..."
                    : btStatus === "error"
                    ? "Connection error"
                    : "Ready to connect"}
                </span>
              </div>

              {btError && (
                <div className="text-xs text-red-400 bg-red-900/20 border border-red-800 rounded-lg p-2">
                  {btError}
                </div>
              )}

              <div className="text-xs text-gray-500 bg-gray-800/50 rounded-lg p-3 space-y-1">
                <p>Supports Muse 2 and Muse S (Athena) headbands</p>
                <p>Turn on your headband and ensure it&apos;s not connected to another device</p>
              </div>

              {btStatus === "connected" && (
                <LiveChart data={chartData} height={110} />
              )}

              {btStatus !== "connected" ? (
                <button
                  onClick={connectBluetooth}
                  disabled={btStatus === "connecting"}
                  className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium transition"
                >
                  {btStatus === "connecting" ? (
                    <span className="animate-pulse">Connecting...</span>
                  ) : (
                    "Connect Headband"
                  )}
                </button>
              ) : (
                <button
                  onClick={disconnectBluetooth}
                  className="w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition"
                >
                  Disconnect
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
