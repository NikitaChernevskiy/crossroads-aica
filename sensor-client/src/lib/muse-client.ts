/**
 * Muse Web Bluetooth Client — connects to Muse S / Muse 2 headbands via Web Bluetooth API.
 *
 * Uses the raw Web Bluetooth API directly (no external muse-js dependency) for maximum
 * compatibility with Muse S Athena firmware. Handles:
 *   - BLE connection & service discovery
 *   - EEG channel subscription (TP9, AF7, AF8, TP10)
 *   - Sample parsing from Muse's proprietary BLE packet format
 *   - Battery & connection status
 *
 * The Muse sends 12 EEG samples per BLE notification at 256 Hz.
 */

import { EEGProcessor, type EmotionalMetrics } from "./eeg-processor";

// Muse BLE UUIDs
const MUSE_SERVICE = 0xfe8d;
// EEG channel characteristics (Muse 2 / Muse S)
const EEG_CHARACTERISTICS: Record<number, string> = {
  0: "273e0003-4c4d-454d-96be-f03bac821358", // TP9
  1: "273e0004-4c4d-454d-96be-f03bac821358", // AF7
  2: "273e0005-4c4d-454d-96be-f03bac821358", // AF8
  3: "273e0006-4c4d-454d-96be-f03bac821358", // TP10
};
const CONTROL_CHARACTERISTIC = "273e0001-4c4d-454d-96be-f03bac821358";

export type MuseConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export interface MuseClientCallbacks {
  onStatusChange: (status: MuseConnectionStatus) => void;
  onMetrics: (metrics: EmotionalMetrics) => void;
  onBattery?: (level: number) => void;
  onError?: (error: string) => void;
}

/**
 * Parse a Muse EEG packet (20 bytes) into 12 samples.
 * Format: 2-byte header + 12 × 12-bit samples packed into 18 bytes.
 */
function parseEEGSamples(data: DataView): number[] {
  const samples: number[] = [];

  // Skip first 2 bytes (packet counter/timestamp)
  // Remaining 18 bytes contain 12 × 12-bit samples
  for (let i = 0; i < 12; i++) {
    const byteOffset = 2 + Math.floor((i * 12) / 8);
    const bitOffset = (i * 12) % 8;

    let raw: number;
    if (bitOffset <= 4) {
      // Sample fits within 2 bytes
      const word = (data.getUint8(byteOffset) << 8) | data.getUint8(byteOffset + 1);
      raw = (word >> (4 - bitOffset)) & 0xfff;
    } else {
      // Sample spans 3 bytes
      const word =
        (data.getUint8(byteOffset) << 16) |
        (data.getUint8(byteOffset + 1) << 8) |
        data.getUint8(byteOffset + 2);
      raw = (word >> (12 - bitOffset)) & 0xfff;
    }

    // Convert 12-bit unsigned to microvolts (Muse scale factor)
    // Muse outputs in nanovolts, convert to μV
    samples.push((raw - 2048) * 0.48828125);
  }

  return samples;
}

export class MuseClient {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private processor = new EEGProcessor();
  private callbacks: MuseClientCallbacks;
  private metricsInterval: ReturnType<typeof setInterval> | null = null;
  private _status: MuseConnectionStatus = "disconnected";

  constructor(callbacks: MuseClientCallbacks) {
    this.callbacks = callbacks;
  }

  get status(): MuseConnectionStatus {
    return this._status;
  }

  get deviceName(): string {
    return this.device?.name || "Unknown Muse";
  }

  private setStatus(status: MuseConnectionStatus): void {
    this._status = status;
    this.callbacks.onStatusChange(status);
  }

  /**
   * Request Bluetooth device and connect.
   * Must be called from a user gesture (button click).
   */
  async connect(): Promise<void> {
    if (!navigator.bluetooth) {
      this.callbacks.onError?.("Web Bluetooth is not supported in this browser. Use Chrome or Edge on desktop/Android.");
      this.setStatus("error");
      return;
    }

    try {
      this.setStatus("connecting");

      // Request device with Muse service filter
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [MUSE_SERVICE] }],
        optionalServices: [MUSE_SERVICE],
      });

      if (!this.device) {
        this.setStatus("disconnected");
        return;
      }

      // Listen for disconnection
      this.device.addEventListener("gattserverdisconnected", () => {
        this.handleDisconnect();
      });

      // Connect to GATT server
      this.server = await this.device.gatt!.connect();

      // Get the Muse service
      const service = await this.server.getPrimaryService(MUSE_SERVICE);

      // Get control characteristic and send start command
      try {
        const control = await service.getCharacteristic(CONTROL_CHARACTERISTIC);
        // Send "p" command to start streaming (Muse protocol)
        const encoder = new TextEncoder();
        await control.writeValue(encoder.encode("p"));
      } catch {
        // Some Muse firmware versions don't need the start command
        console.warn("Could not send start command — continuing anyway");
      }

      // Subscribe to EEG channels
      for (const [channelStr, uuid] of Object.entries(EEG_CHARACTERISTICS)) {
        const channel = parseInt(channelStr);
        try {
          const characteristic = await service.getCharacteristic(uuid);
          await characteristic.startNotifications();
          characteristic.addEventListener(
            "characteristicvaluechanged",
            (event: Event) => {
              const target = event.target as BluetoothRemoteGATTCharacteristic;
              if (target.value) {
                const samples = parseEEGSamples(target.value);
                this.processor.addSamples(channel, samples);
              }
            }
          );
        } catch (err) {
          console.warn(`Could not subscribe to EEG channel ${channel}:`, err);
        }
      }

      // Start computing metrics every 500ms
      this.metricsInterval = setInterval(() => {
        const metrics = this.processor.compute();
        if (metrics) {
          this.callbacks.onMetrics(metrics);
        }
      }, 500);

      this.setStatus("connected");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      // User cancelled the device picker
      if (msg.includes("cancelled") || msg.includes("canceled")) {
        this.setStatus("disconnected");
        return;
      }
      this.callbacks.onError?.(msg);
      this.setStatus("error");
    }
  }

  /** Disconnect from the Muse device. */
  disconnect(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
    if (this.server?.connected) {
      this.server.disconnect();
    }
    this.processor.reset();
    this.device = null;
    this.server = null;
    this.setStatus("disconnected");
  }

  private handleDisconnect(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
    this.processor.reset();
    this.server = null;
    this.setStatus("disconnected");
  }
}
