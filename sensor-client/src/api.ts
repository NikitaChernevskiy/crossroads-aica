/** API client for the AI Emotional Partner backend. */

import type { EmotionalState } from "./types";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

/** Send an emotional state snapshot to the backend. */
export async function postState(state: EmotionalState): Promise<{ id: string }> {
  const resp = await fetch(`${API_BASE}/state`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  });
  if (!resp.ok) throw new Error(`POST /state failed: ${resp.status}`);
  return resp.json();
}

/** Get current emotional state for a user. */
export async function getCurrentState(
  userId: string
): Promise<EmotionalState | null> {
  const resp = await fetch(`${API_BASE}/state/${userId}`);
  if (resp.status === 404) return null;
  if (!resp.ok) throw new Error(`GET /state/${userId} failed: ${resp.status}`);
  return resp.json();
}

/** Chat response from the backend. */
export interface ChatResult {
  response: string;
  thread_id: string;
  guidance_used: boolean;
  state_label: string | null;
}

/** Post a batch of calibration samples to the backend. */
export async function postCalibrationBatch(
  userId: string,
  samples: Record<string, unknown>[]
): Promise<{ stored: number }> {
  const resp = await fetch(`${API_BASE}/calibrate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, samples }),
  });
  if (!resp.ok) throw new Error(`POST /calibrate failed: ${resp.status}`);
  return resp.json();
}

/** Send a chat message to the backend and get a response. */
export async function sendChatMessage(
  userId: string,
  message: string,
  threadId?: string | null
): Promise<ChatResult> {
  const body: Record<string, string> = { user_id: userId, message };
  if (threadId) body.thread_id = threadId;

  const resp = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`POST /chat failed: ${resp.status}`);
  return resp.json();
}
