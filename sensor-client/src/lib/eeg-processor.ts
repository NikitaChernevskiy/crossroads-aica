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
 *   Stress: theta/beta ratio inverted (low theta relative to beta = stressed)
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

/** Extended metrics with raw band powers — used for calibration data. */
export interface CalibratedSample extends EmotionalMetrics {
  delta: number;
  theta: number;
  alpha: number;
  beta: number;
  gamma: number;
  faa: number;       // frontal alpha asymmetry
  thetaBeta: number; // theta/beta ratio
  timestamp: number; // Date.now()
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
  // Meditative: very low stress, moderate-low arousal, positive or neutral valence
  if (metrics.stress < 0.2 && metrics.arousal < 0.35 && metrics.valence >= -0.1) return "meditative";
  // Stressed: high stress regardless of arousal (covers old tense + anxious)
  if (metrics.stress > 0.6) return "stressed";
  // Focused: high engagement, not stressed
  if (metrics.focus > 0.65 && metrics.valence > 0) return "focused";
  // Fatigued: low arousal AND low focus
  if (metrics.arousal < 0.3 && metrics.focus < 0.35) return "fatigued";
  // Excited: high arousal + positive valence
  if (metrics.valence > 0.3 && metrics.arousal > 0.5) return "excited";
  // Calm: positive valence, low arousal
  if (metrics.valence > 0.1 && metrics.arousal < 0.5) return "calm";
  // Distracted: low focus, not fitting other categories
  if (metrics.focus < 0.3) return "distracted";
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

    // Stress: inverted theta/beta ratio
    // High beta + low theta = mental strain/stress; high theta + low beta = relaxed
    // Theta/beta ratio is a well-validated EEG stress/attention marker
    const thetaBetaRatio = avgTheta / Math.max(avgBeta, 1e-10);
    // Invert: low ratio (low theta, high beta) → high stress
    // Typical range: 0.5 (very stressed) to 3.0 (very relaxed)
    const stress = Math.max(0, Math.min(1, 1 - (thetaBetaRatio - 0.5) / 2.5));

    const metrics = { valence, arousal, focus, stress };
    const label = classifyLabel(metrics);

    // Calibration logging — visible in browser DevTools console
    console.debug(
      `%c[EEG] %c${label}%c  v=${valence.toFixed(2)} a=${arousal.toFixed(2)} f=${focus.toFixed(2)} s=${stress.toFixed(2)}  |  δ=${avg(bp => bp.delta).toFixed(1)} θ=${avgTheta.toFixed(1)} α=${avgAlpha.toFixed(1)} β=${avgBeta.toFixed(1)} γ=${avg(bp => bp.gamma).toFixed(1)}  |  FAA=${alphaAsymmetry.toFixed(2)} θ/β=${thetaBetaRatio.toFixed(2)}`,
      'color:#888', 'color:#6ee7b7;font-weight:bold', 'color:#888'
    );

    // Store latest calibrated sample (band powers + ratios) for calibration mode
    this._lastCalibratedSample = {
      ...metrics, label,
      delta: avg(bp => bp.delta),
      theta: avgTheta, alpha: avgAlpha, beta: avgBeta,
      gamma: avg(bp => bp.gamma),
      faa: alphaAsymmetry, thetaBeta: thetaBetaRatio,
      timestamp: Date.now(),
    };

    return { ...metrics, label };
  }

  /** Last computed sample with full calibration data. */
  private _lastCalibratedSample: CalibratedSample | null = null;
  get lastCalibratedSample(): CalibratedSample | null {
    return this._lastCalibratedSample;
  }

  /** Reset all buffers. */
  reset(): void {
    this.buffers.clear();
    this.lastBandPowers.clear();
  }
}
