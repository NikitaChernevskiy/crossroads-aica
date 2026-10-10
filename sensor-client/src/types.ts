/** Unified emotional state — matches backend schema. */
export interface EmotionalState {
  user_id: string;
  source: string;
  timestamp: string;
  valence: number; // -1..1
  arousal: number; // 0..1
  focus: number; // 0..1
  stress: number; // 0..1
  label: string;
}

/** Chat message in the UI. */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

/** Simulated device state profile. */
export interface SimulationProfile {
  name: string;
  label: string;
  valence: number;
  arousal: number;
  focus: number;
  stress: number;
}
