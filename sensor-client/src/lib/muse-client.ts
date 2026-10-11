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

import { EEGProcessor, ELECTRODES, type EmotionalMetrics, type CalibratedSample } from "./eeg-processor";

// Muse BLE UUIDs
const MUSE_SERVICE = 0xfe8d;
const MUSE_UUID_BASE = "4c4d-454d-96be-f03bac821358";

// Known EEG channel characteristics — same UUIDs across Muse 2 / Muse S / Athena
const EEG_CHARACTERISTICS: Record<number, string> = {
  0: `273e0003-${MUSE_UUID_BASE}`, // TP9
  1: `273e0004-${MUSE_UUID_BASE}`, // AF7
  2: `273e0005-${MUSE_UUID_BASE}`, // AF8
  3: `273e0006-${MUSE_UUID_BASE}`, // TP10
};
const CONTROL_CHARACTERISTIC = `273e0001-${MUSE_UUID_BASE}`;

// Muse control commands
const CMD = {
  HALT: "h",           // stop streaming
  VERSION: "v1",       // request version/firmware info
  PRESET_DEFAULT: "p21", // preset 21: EEG + accelerometer (Muse 2)
  PRESET_EEG: "p20",    // preset 20: EEG only (Muse 2)
  PRESET_LEGACY: "p",   // legacy start command (Muse 2 classic)
  PRESET_ATHENA_STD: "p50",  // preset 50: Athena standard (EEG+motion+PPG)
  PRESET_ATHENA_EEG: "p51",  // preset 51: Athena EEG only
  RESUME: "d",          // resume/start data streaming (required on Athena)
  KEEP_ALIVE: "k",     // keep-alive signal
};

/**
 * Encode a Muse control command in the proper BLE packet format.
 * Format: [total_length, ...command_ascii_bytes, 0x0a (newline)]
 * E.g. "p21" → [0x04, 0x70, 0x32, 0x31, 0x0a]
 */
function encodeMuseCommand(cmd: string): Uint8Array {
  const cmdBytes = new TextEncoder().encode(cmd);
  const packet = new Uint8Array(cmdBytes.length + 2); // +1 for length, +1 for newline
  packet[0] = cmdBytes.length + 1; // length = command bytes + newline
  packet.set(cmdBytes, 1);
  packet[packet.length - 1] = 0x0a; // newline terminator
  return packet;
}

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

  /** Get the latest calibrated sample with band powers (for calibration collection). */
  get lastCalibratedSample(): CalibratedSample | null {
    return this.processor.lastCalibratedSample;
  }

  private setStatus(status: MuseConnectionStatus): void {
    this._status = status;
    this.callbacks.onStatusChange(status);
  }

  /** Small delay helper — lets the BLE stack stabilize. */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Connect to GATT server with retry logic.
   * Muse S Athena often drops the GATT connection before service discovery
   * completes. Retrying with a stabilization delay fixes this.
   */
  private async connectGATT(maxRetries = 3): Promise<BluetoothRemoteGATTServer> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const server = await this.device!.gatt!.connect();
        // Wait for the BLE stack to stabilize before service discovery
        await this.delay(300);
        // Verify the connection is still alive
        if (!server.connected) {
          throw new Error("GATT server disconnected immediately after connect");
        }
        console.info(`[Muse] GATT connected (attempt ${attempt}/${maxRetries}): ${this.device!.name}`);
        return server;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[Muse] GATT connect attempt ${attempt}/${maxRetries} failed: ${msg}`);
        if (attempt < maxRetries) {
          // Exponential backoff: 500ms, 1000ms, 2000ms
          const backoff = 500 * Math.pow(2, attempt - 1);
          console.info(`[Muse] Retrying in ${backoff}ms...`);
          await this.delay(backoff);
        } else {
          throw err;
        }
      }
    }
    throw new Error("GATT connection failed after all retries");
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

      // Connect to GATT server with retry logic
      this.server = await this.connectGATT(3);

      // Get the Muse service — retry once if GATT drops during discovery
      let service: BluetoothRemoteGATTService;
      try {
        service = await this.server.getPrimaryService(MUSE_SERVICE);
      } catch (serviceErr) {
        console.warn("[Muse] Service discovery failed, reconnecting GATT...", serviceErr);
        this.server = await this.connectGATT(2);
        service = await this.server.getPrimaryService(MUSE_SERVICE);
      }

      // ── Step 1: Discover all characteristics in the service ──────────
      let allCharacteristics: BluetoothRemoteGATTCharacteristic[] = [];
      try {
        allCharacteristics = await service.getCharacteristics();
        console.info(`[Muse] Service has ${allCharacteristics.length} characteristics:`);
        for (const c of allCharacteristics) {
          console.info(`  [Muse]   ${c.uuid}  props: ${JSON.stringify({
            read: c.properties.read,
            write: c.properties.write,
            writeWithoutResponse: c.properties.writeWithoutResponse,
            notify: c.properties.notify,
            indicate: c.properties.indicate,
          })}`);
        }
      } catch (discErr) {
        console.warn("[Muse] Could not enumerate characteristics:", discErr);
      }

      // ── Step 2: Subscribe to ALL data channels BEFORE sending start ──
      // CRITICAL: The Muse only streams data to characteristics that already
      // have notifications enabled. We MUST subscribe first, then send the
      // start command. This is the standard BLE notification pattern.
      let subscribedChannels = 0;
      let packetLogCount = 0;
      let isAthena = false;

      // Helper: attach a data listener to a characteristic
      const attachDataListener = (characteristic: BluetoothRemoteGATTCharacteristic, processorCh: number) => {
        characteristic.addEventListener(
          "characteristicvaluechanged",
          (event: Event) => {
            const target = event.target as BluetoothRemoteGATTCharacteristic;
            if (target.value) {
              if (packetLogCount === 0) {
                console.warn("[Muse] ★ First EEG packet received — streaming is active!");
              }
              if (packetLogCount < 10) {
                const bytes = new Uint8Array(target.value.buffer);
                console.warn(
                  `[Muse] Packet ch${processorCh}: ${bytes.length}B header=[${bytes[0]},${bytes[1]}] from ${characteristic.uuid.substring(0, 8)}`
                );
              }
              packetLogCount++;
              const samples = parseEEGSamples(target.value);
              this.processor.addSamples(processorCh, samples);
            }
          }
        );
      };

      // Subscribe to control channel for responses
      let controlChar: BluetoothRemoteGATTCharacteristic | null = null;
      try {
        controlChar = await service.getCharacteristic(CONTROL_CHARACTERISTIC);
        await controlChar.startNotifications();
        controlChar.addEventListener("characteristicvaluechanged", (event: Event) => {
          const target = event.target as BluetoothRemoteGATTCharacteristic;
          if (target.value) {
            const bytes = new Uint8Array(target.value.buffer);
            const text = new TextDecoder().decode(bytes.slice(1));
            console.info(`[Muse] Control response (${bytes.length}b): ${text.trim()}`);
          }
        });
        console.info("[Muse] ✓ Control channel subscribed for responses");
      } catch {
        console.warn("[Muse] Could not subscribe to control responses");
      }

      // Try known EEG UUIDs first (classic Muse 2)
      for (const [channelStr, uuid] of Object.entries(EEG_CHARACTERISTICS)) {
        const channel = parseInt(channelStr);
        try {
          const c = await service.getCharacteristic(uuid);
          await c.startNotifications();
          attachDataListener(c, channel);
          console.info(`[Muse] ✓ Subscribed EEG ch${channel} (${ELECTRODES[channel]}): ${uuid}`);
          subscribedChannels++;
        } catch {
          // Expected to fail on Athena firmware — will auto-discover below
        }
      }

      // Auto-discovery for Athena firmware (273e0013/0014 instead of 0003-0006)
      if (subscribedChannels === 0 && allCharacteristics.length > 0) {
        isAthena = true;
        console.info("[Muse] Classic UUIDs not found — Athena firmware detected, auto-discovering channels");
        const channelMapping = [1, 2, 0, 3]; // First two → AF7, AF8 for FAA
        let autoIdx = 0;
        for (const c of allCharacteristics) {
          if (c.uuid === CONTROL_CHARACTERISTIC) continue;
          if (!c.properties.notify) continue;
          try {
            await c.startNotifications();
            const processorCh = channelMapping[Math.min(autoIdx, 3)];
            attachDataListener(c, processorCh);
            console.info(`[Muse] ✓ Auto-subscribed ${c.uuid} → ch${processorCh} (${ELECTRODES[processorCh] ?? "AUX"})`);
            subscribedChannels++;
            autoIdx++;
          } catch (err) {
            console.warn(`[Muse] ✗ Auto-subscribe failed for ${c.uuid}:`, err);
          }
        }
      }

      if (subscribedChannels === 0) {
        throw new Error(
          `No EEG channels available (${allCharacteristics.length} characteristics found). ` +
          "Turn Muse off, close all browser windows, reopen, and try again."
        );
      }
      console.info(`[Muse] ✓ ${subscribedChannels} data channel(s) subscribed — now sending start command`);

      // ── Step 3: Send start command AFTER subscriptions are active ───
      // Use setTimeout chain to avoid async/await deadlocks with GATT.
      // The BLE stack can block awaited promises when notifications arrive.
      if (controlChar) {
        const ctrl = controlChar;
        const sendCmd = (cmd: string) => {
          try {
            const pkt = encodeMuseCommand(cmd);
            console.warn(`[Muse] >> Sending '${cmd}'`);
            ctrl.writeValueWithoutResponse(pkt).then(
              () => console.warn(`[Muse] << '${cmd}' write OK`),
              (err: unknown) => console.error(`[Muse] !! '${cmd}' write REJECTED:`, err)
            );
          } catch (e) {
            console.error(`[Muse] !! '${cmd}' sync error:`, e);
          }
        };

        if (isAthena) {
          // Athena firmware: progressively try different preset+start combos.
          // Different Athena firmware versions respond to different presets.
          // We check packetLogCount between attempts and stop once data flows.

          // Round 1: just resume (device may already have a preset configured)
          console.warn("[Muse] Athena round 1: halt → resume");
          sendCmd(CMD.HALT);
          setTimeout(() => sendCmd(CMD.RESUME), 800);

          // Round 2: Athena EEG preset + resume
          setTimeout(() => {
            if (packetLogCount > 0) return;
            console.warn("[Muse] Athena round 2: p51 (EEG) → resume");
            sendCmd(CMD.PRESET_ATHENA_EEG);
            setTimeout(() => sendCmd(CMD.RESUME), 800);
          }, 3000);

          // Round 3: Athena standard preset + resume
          setTimeout(() => {
            if (packetLogCount > 0) return;
            console.warn("[Muse] Athena round 3: p50 (std) → resume");
            sendCmd(CMD.PRESET_ATHENA_STD);
            setTimeout(() => sendCmd(CMD.RESUME), 800);
          }, 6000);

          // Round 4: legacy Muse 2 presets (some Athena FW accepts these)
          setTimeout(() => {
            if (packetLogCount > 0) return;
            console.warn("[Muse] Athena round 4: p21 → p20 → resume");
            sendCmd(CMD.PRESET_DEFAULT);
            setTimeout(() => sendCmd(CMD.PRESET_EEG), 800);
            setTimeout(() => sendCmd(CMD.RESUME), 1600);
          }, 9000);

          // Round 5: legacy 'p' start + 's' command (last resort)
          setTimeout(() => {
            if (packetLogCount > 0) return;
            console.warn("[Muse] Athena round 5: legacy 'p' + 's' start");
            sendCmd(CMD.PRESET_LEGACY);
            setTimeout(() => {
              try {
                const pkt = encodeMuseCommand("s");
                console.warn("[Muse] >> Sending 's' (start)");
                ctrl.writeValueWithoutResponse(pkt).then(
                  () => console.warn("[Muse] << 's' write OK"),
                  (err: unknown) => console.error("[Muse] !! 's' write REJECTED:", err)
                );
              } catch (e) {
                console.error("[Muse] !! 's' sync error:", e);
              }
            }, 800);
          }, 13000);

          // Final status
          setTimeout(() => {
            sendCmd(CMD.VERSION);
            console.warn(`[Muse] Start sequence complete — total packets: ${packetLogCount}`);
            if (packetLogCount === 0) {
              console.error("[Muse] ✗ No EEG data after trying all presets. Try: power-cycle Muse, close ALL other BLE apps, reload page.");
            }
          }, 16000);
        } else {
          // Classic Muse 2 sequence
          sendCmd(CMD.HALT);
          setTimeout(() => sendCmd(CMD.PRESET_DEFAULT), 500);   // p21
          setTimeout(() => sendCmd(CMD.PRESET_EEG), 1000);      // p20
          setTimeout(() => sendCmd(CMD.PRESET_LEGACY), 1500);   // p
          setTimeout(() => sendCmd(CMD.RESUME), 2000);           // d
          setTimeout(() => sendCmd(CMD.VERSION), 2500);          // v1
          setTimeout(() => {
            console.warn(`[Muse] All start commands sent — packets received: ${packetLogCount}`);
          }, 3500);
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
