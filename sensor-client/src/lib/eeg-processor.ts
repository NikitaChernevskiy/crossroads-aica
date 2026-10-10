/**
 * EEG Signal Processing — computes emotional metrics from raw EEG data.
 *
 * Pipeline: raw samples → sliding window → FFT → band powers → emotional state
 *
 * Band definitions (Hz):
 *   Delta: 1-4    (deep sleep)
 *   Theta: 4-8    (drowsiness, meditation)
 *   Alpha: 8-13   (relaxation, calm awareness)
 *   Beta:  13-30  (active thinking, focus)
 *   Gamma: 30-50  (higher cognitive processing)
 *
 * Emotional mapping:
 *   Valence: frontal alpha asymmetry (AF8 alpha - AF7 alpha)
 *   Arousal: beta / alpha ratio (average across channels)
 *   Focus:  beta / (alpha + theta) ratio
 *   Stress: high-beta (20-30Hz) power / total power
 */

// Muse 2 / Muse S electrode positions
export const ELECTRODES = ["TP9", "AF7", "AF8", "TP10"] as const;
export type Electrode = (typeof ELECTRODES)[number];

export interface BandPowers {
  delta: number;
  theta: number;
  alpha: number;
  beta: number;
  gamma: number;
}

export interface EmotionalMetrics {
  valence: number; // -1..1
  arousal: number; // 0..1
  focus: number; // 0..1
  stress: number; // 0..1
  label: string;
}

const SAMPLE_RATE = 256; // Muse sample rate in Hz
const WINDOW_SIZE = 256; // 1 second window for FFT

/**
 * Simple DFT-based power spectrum (no external FFT library needed).
 * For a hackathon demo, this is sufficient — production would use FFT.
 */
function computePowerSpectrum(samples: number[]): number[] {
  const N = samples.length;
  const spectrum: number[] = new Array(Math.floor(N / 2)).fill(0);

  // Apply Hanning window
  const windowed = samples.map(
    (s, i) => s * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)))
  );

  // Compute magnitude spectrum via DFT (up to Nyquist)
  for (let k = 0; k < spectrum.length; k++) {
    let re = 0;
    let im = 0;
    for (let n = 0; n < N; n++) {
      const angle = (2 * Math.PI * k * n) / N;
      re += windowed[n] * Math.cos(angle);
      im -= windowed[n] * Math.sin(angle);
    }
    spectrum[k] = (re * re + im * im) / N;
  }

  return spectrum;
}

/**
 * Extract band powers from a power spectrum.
 */
function extractBandPowers(spectrum: number[]): BandPowers {
  const freqResolution = SAMPLE_RATE / WINDOW_SIZE; // Hz per bin

  const bandSum = (lowHz: number, highHz: number): number => {
    const lowBin = Math.floor(lowHz / freqResolution);
    const highBin = Math.min(
      Math.ceil(highHz / freqResolution),
      spectrum.length - 1
    );
    let sum = 0;
    for (let i = lowBin; i <= highBin; i++) {
      sum += spectrum[i];
    }
    return sum;
  };

  return {
    delta: bandSum(1, 4),
    theta: bandSum(4, 8),
    alpha: bandSum(8, 13),
    beta: bandSum(13, 30),
    gamma: bandSum(30, 50),
  };
}

/**
 * Classify emotional label from metrics.
 */
function classifyLabel(metrics: {
  valence: number;
  arousal: number;
  focus: number;
  stress: number;
}): string {
  if (metrics.stress > 0.65) return "anxious";
  if (metrics.stress > 0.5 && metrics.arousal > 0.6) return "tense";
  if (metrics.focus > 0.65 && metrics.valence > 0) return "focused";
  if (metrics.arousal < 0.3 && metrics.focus < 0.35) return "fatigued";
  if (metrics.valence > 0.3 && metrics.arousal > 0.5) return "excited";
  if (metrics.valence > 0.1 && metrics.arousal < 0.5) return "calm";
  if (metrics.valence < -0.2) return "tense";
  return "neutral";
}

/**
 * EEG Processor — maintains sliding windows per channel and computes emotional state.
 */
export class EEGProcessor {
  private buffers: Map<number, number[]> = new Map();
  private lastBandPowers: Map<number, BandPowers> = new Map();

  /** Add samples for a given electrode channel. */
  addSamples(electrode: number, samples: number[]): void {
    if (!this.buffers.has(electrode)) {
      this.buffers.set(electrode, []);
    }
    const buf = this.buffers.get(electrode)!;
    buf.push(...samples);

    // Keep only last WINDOW_SIZE samples
    if (buf.length > WINDOW_SIZE) {
      buf.splice(0, buf.length - WINDOW_SIZE);
    }

    // Compute band powers when we have enough samples
    if (buf.length >= WINDOW_SIZE) {
      const spectrum = computePowerSpectrum(buf);
      this.lastBandPowers.set(electrode, extractBandPowers(spectrum));
    }
  }

  /** Check if we have enough data to compute metrics. */
  get ready(): boolean {
    // Need at least AF7 (1) and AF8 (2) for frontal asymmetry
    return this.lastBandPowers.has(1) && this.lastBandPowers.has(2);
  }

  /**
   * Compute emotional metrics from current band powers.
   * Returns null if not enough data yet.
   */
  compute(): EmotionalMetrics | null {
    if (!this.ready) return null;

    const af7 = this.lastBandPowers.get(1)!; // Left frontal
    const af8 = this.lastBandPowers.get(2)!; // Right frontal

    // Average band powers across all available channels
    const allPowers = Array.from(this.lastBandPowers.values());
    const avg = (fn: (bp: BandPowers) => number) =>
      allPowers.reduce((sum, bp) => sum + fn(bp), 0) / allPowers.length;

    const avgAlpha = avg((bp) => bp.alpha);
    const avgBeta = avg((bp) => bp.beta);
    const avgTheta = avg((bp) => bp.theta);
    const totalPower =
      avg((bp) => bp.delta) + avgTheta + avgAlpha + avgBeta + avg((bp) => bp.gamma);

    // Avoid division by zero
    if (totalPower < 1e-10) return null;

    // Valence: frontal alpha asymmetry (right - left, normalized)
    // Higher right alpha → more positive valence
    const alphaAsymmetry = af8.alpha - af7.alpha;
    const maxAlpha = Math.max(af7.alpha, af8.alpha, 1e-10);
    const rawValence = alphaAsymmetry / maxAlpha;
    const valence = Math.max(-1, Math.min(1, rawValence));

    // Arousal: beta / alpha ratio (normalized to 0..1)
    const betaAlphaRatio = avgBeta / Math.max(avgAlpha, 1e-10);
    const arousal = Math.max(0, Math.min(1, betaAlphaRatio / 3)); // 3x is high arousal

    // Focus: beta / (alpha + theta) — "engagement" ratio
    const engagementRatio = avgBeta / Math.max(avgAlpha + avgTheta, 1e-10);
    const focus = Math.max(0, Math.min(1, engagementRatio / 2));

    // Stress: high-beta proportion of total power
    // High beta (20-30 Hz) correlates with anxiety/stress
    const highBetaProportion = avgBeta * 0.6 / totalPower; // rough high-beta estimate
    const stress = Math.max(0, Math.min(1, highBetaProportion * 3));

    const metrics = { valence, arousal, focus, stress };
    const label = classifyLabel(metrics);

    return { ...metrics, label };
  }

  /** Reset all buffers. */
  reset(): void {
    this.buffers.clear();
    this.lastBandPowers.clear();
  }
}
