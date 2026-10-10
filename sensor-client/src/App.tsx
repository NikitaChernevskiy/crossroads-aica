import { useState } from "react";
import { DevicePanel } from "./components/DevicePanel";
import { StateDisplay } from "./components/StateDisplay";
import { ChatPanel } from "./components/ChatPanel";
import type { EmotionalState } from "./types";

export default function App() {
  const [currentState, setCurrentState] = useState<EmotionalState | null>(null);
  const [connected, setConnected] = useState(false);
  const [userId] = useState("demo-user");

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-sm font-bold">
              EP
            </div>
            <h1 className="text-lg font-semibold">AI Emotional Partner</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div
              className={`w-2 h-2 rounded-full ${
                connected ? "bg-green-400" : "bg-gray-600"
              }`}
            />
            {connected ? "Device connected" : "No device"}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        {/* Left: Device + State */}
        <div className="space-y-6">
          <DevicePanel
            connected={connected}
            onConnect={() => setConnected(true)}
            onDisconnect={() => setConnected(false)}
            onStateUpdate={setCurrentState}
            userId={userId}
          />
          <StateDisplay state={currentState} />
        </div>

        {/* Right: Chat (spans 2 cols on large screens) */}
        <div className="lg:col-span-2">
          <ChatPanel userId={userId} />
        </div>
      </main>
    </div>
  );
}
