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

/** Send a chat message to the backend and get a response. */
export async function sendChatMessage(
  userId: string,
  message: string
): Promise<string> {
  const resp = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, message }),
  });
  if (!resp.ok) throw new Error(`POST /chat failed: ${resp.status}`);
  const data = await resp.json();
  return data.response;
}
